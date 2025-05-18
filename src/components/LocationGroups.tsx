import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFolderPlus, 
  faFolder, 
  faFolderOpen, 
  faEdit, 
  faTrash,
  faPlus,
  faSave,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { LocationItem } from '../services/locationService';
import { createError, ErrorType, ErrorSeverity, AppError } from '../services/errorService';
import ErrorFeedback from './ErrorFeedback';

interface LocationGroup {
  id: string;
  name: string;
  color: string;
  locationIds: string[];
}

interface LocationGroupsProps {
  locations: LocationItem[];
  onGroupSelect?: (locationIds: string[]) => void;
}

/**
 * Componente per la gestione dei gruppi di località
 * Permette di creare, modificare ed eliminare gruppi di località preferite
 */
const LocationGroups: React.FC<LocationGroupsProps> = ({ 
  locations,
  onGroupSelect
}) => {
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#FCD34D'); // amber-300
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  
  // Colori disponibili per i gruppi
  const availableColors = [
    { name: 'Amber', value: '#FCD34D' }, // amber-300
    { name: 'Sky', value: '#7DD3FC' },   // sky-300
    { name: 'Green', value: '#86EFAC' }, // green-300
    { name: 'Rose', value: '#FDA4AF' },  // rose-300
    { name: 'Purple', value: '#C4B5FD' } // purple-300
  ];

  // Carica i gruppi dal localStorage all'avvio
  useEffect(() => {
    try {
      const savedGroups = localStorage.getItem('avo_location_groups');
      if (savedGroups) {
        setGroups(JSON.parse(savedGroups));
      }
    } catch (error) {
      console.error('Error loading location groups:', error);
      setError(createError(
        ErrorType.STORAGE,
        'Error al cargar grupos',
        error instanceof Error ? error : new Error(String(error)),
        'No se pudieron cargar los grupos de ubicaciones',
        ErrorSeverity.LOW
      ));
    }
  }, []);
  
  // Salva i gruppi nel localStorage quando cambiano
  useEffect(() => {
    try {
      localStorage.setItem('avo_location_groups', JSON.stringify(groups));
    } catch (error) {
      console.error('Error saving location groups:', error);
    }
  }, [groups]);
  
  // Crea un nuovo gruppo
  const createGroup = () => {
    if (!newGroupName.trim()) {
      setError(createError(
        ErrorType.VALIDATION,
        'Nombre requerido',
        new Error('Group name is required'),
        'Por favor, introduzca un nombre para el grupo',
        ErrorSeverity.LOW
      ));
      return;
    }
    
    if (selectedLocations.length === 0) {
      setError(createError(
        ErrorType.VALIDATION,
        'Sin ubicaciones',
        new Error('No locations selected'),
        'Selecciona al menos una ubicación para el grupo',
        ErrorSeverity.LOW
      ));
      return;
    }
    
    const newGroup: LocationGroup = {
      id: 'group_' + Date.now(),
      name: newGroupName,
      color: newGroupColor,
      locationIds: selectedLocations
    };
    
    setGroups(prev => [...prev, newGroup]);
    resetForm();
  };
  
  // Aggiorna un gruppo esistente
  const updateGroup = () => {
    if (!editingGroupId) return;
    
    if (!newGroupName.trim()) {
      setError(createError(
        ErrorType.VALIDATION,
        'Nombre requerido',
        new Error('Group name is required'),
        'Por favor, introduzca un nombre para el grupo',
        ErrorSeverity.LOW
      ));
      return;
    }
    
    if (selectedLocations.length === 0) {
      setError(createError(
        ErrorType.VALIDATION,
        'Sin ubicaciones',
        new Error('No locations selected'),
        'Selecciona al menos una ubicación para el grupo',
        ErrorSeverity.LOW
      ));
      return;
    }
    
    setGroups(prev => prev.map(group => 
      group.id === editingGroupId 
        ? { ...group, name: newGroupName, color: newGroupColor, locationIds: selectedLocations }
        : group
    ));
    
    resetForm();
  };
  
  // Elimina un gruppo
  const deleteGroup = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
      setGroups(prev => prev.filter(group => group.id !== id));
    }
  };
  
  // Inizia la modifica di un gruppo
  const startEditing = (group: LocationGroup) => {
    setEditingGroupId(group.id);
    setNewGroupName(group.name);
    setNewGroupColor(group.color);
    setSelectedLocations(group.locationIds);
    setIsCreating(true);
  };
  
  // Resetta il form
  const resetForm = () => {
    setIsCreating(false);
    setEditingGroupId(null);
    setNewGroupName('');
    setNewGroupColor(availableColors[0].value);
    setSelectedLocations([]);
    setError(null);
  };
  
  // Gestisce la selezione di una località
  const handleLocationToggle = (locationId: string) => {
    if (selectedLocations.includes(locationId)) {
      setSelectedLocations(prev => prev.filter(id => id !== locationId));
    } else {
      setSelectedLocations(prev => [...prev, locationId]);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          <FontAwesomeIcon icon={faFolder} className="mr-2 text-amber-500" />
          Grupos de ubicaciones
        </h3>
        
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="p-2 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors"
            aria-label="Crear grupo"
          >
            <FontAwesomeIcon icon={faFolderPlus} />
          </button>
        )}
      </div>
      
      {error && (
        <ErrorFeedback 
          error={error}
          className="mb-3"
        />
      )}
      
      {isCreating ? (
        <div className="border border-gray-200 rounded-md p-3 mb-4">
          <div className="mb-3">
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del grupo
            </label>
            <input
              type="text"
              id="groupName"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              placeholder="Ej: Mis playas favoritas"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex space-x-2">
              {availableColors.map(color => (
                <button
                  key={color.value}
                  onClick={() => setNewGroupColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    newGroupColor === color.value ? 'border-gray-800' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  aria-label={`Color ${color.name}`}
                />
              ))}
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicaciones
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
              {locations.length > 0 ? (
                locations.map(location => (
                  <div 
                    key={location.id} 
                    className="flex items-center mb-1"
                  >
                    <input
                      type="checkbox"
                      id={`loc_${location.id}`}
                      checked={selectedLocations.includes(location.id)}
                      onChange={() => handleLocationToggle(location.id)}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 rounded"
                    />
                    <label 
                      htmlFor={`loc_${location.id}`}
                      className="ml-2 text-sm text-gray-700"
                    >
                      {location.name}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 py-2 text-center">
                  No hay ubicaciones disponibles
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={resetForm}
              className="py-2 px-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="mr-1" />
              Cancelar
            </button>
            
            <button
              onClick={editingGroupId ? updateGroup : createGroup}
              className="py-2 px-3 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
            >
              <FontAwesomeIcon icon={faSave} className="mr-1" />
              {editingGroupId ? 'Actualizar' : 'Crear'} grupo
            </button>
          </div>
        </div>
      ) : null}
      
      {/* Lista di gruppi */}
      {groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map(group => (
            <div 
              key={group.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div 
                className="flex items-center flex-1 cursor-pointer"
                onClick={() => onGroupSelect && onGroupSelect(group.locationIds)}
              >
                <div 
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: group.color }}
                />
                <div>
                  <p className="font-medium text-gray-800">{group.name}</p>
                  <p className="text-xs text-gray-500">
                    {group.locationIds.length} ubicaciones
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => startEditing(group)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Editar grupo"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"
                  aria-label="Eliminar grupo"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 border border-gray-200 rounded-md">
          <FontAwesomeIcon icon={faFolderOpen} className="text-amber-300 text-3xl mb-2" />
          <p className="text-gray-500">No hay grupos creados</p>
          <p className="text-sm text-gray-400 mb-2">
            Organiza tus ubicaciones en grupos para acceder a ellas fácilmente
          </p>
          
          <button
            onClick={() => setIsCreating(true)}
            className="mt-2 py-1.5 px-3 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors inline-flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-1" />
            Crear grupo
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationGroups;
