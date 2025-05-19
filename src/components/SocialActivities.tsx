import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, faTimes, faMapMarkerAlt, faCalendarAlt, 
  faStar, faComment, faShareAlt, faUserFriends, faArrowRight,
  faCloudSun
} from '@fortawesome/free-solid-svg-icons';
import { RatedActivity } from '../types/activities';
import { WeatherData } from '../services/weatherService';

interface SocialActivitiesProps {
  activity: RatedActivity;
  weather: WeatherData;
  onClose: () => void;
}

// Tipi di dati
interface User {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  interests: string[];
  rating: number;
}

interface Group {
  id: string;
  name: string;
  members: number;
  activity: string;
  date: string;
  location: string;
  description: string;
  creator: {
    name: string;
    avatar: string;
  };
  isJoined: boolean;
}

interface Review {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  date: string;
  rating: number;
  text: string;
  likes: number;
  photos: string[];
}

const SocialActivities: React.FC<SocialActivitiesProps> = ({ activity, weather, onClose }) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'buddies' | 'reviews'>('groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [buddies, setBuddies] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState<'list' | 'join'>('list');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  useEffect(() => {
    // Simula il caricamento dei dati dal server
    const loadData = async () => {
      // In una app reale, qui chiameremmo le API appropriate
      
      // Genera gruppi fittizi basati sull'attività
      const mockGroups = generateMockGroups(activity);
      setGroups(mockGroups);
      
      // Genera buddy fittizi basati sull'attività
      const mockBuddies = generateMockBuddies(activity);
      setBuddies(mockBuddies);
      
      // Genera recensioni fittizie
      const mockReviews = generateMockReviews(activity);
      setReviews(mockReviews);
      
      // Simula un ritardo di caricamento
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    };
    
    loadData();
  }, [activity]);
  
  // Generatori di dati fittizi
  
  const generateMockGroups = (activity: RatedActivity): Group[] => {
    const activityTypes = {
      'hiking': ['Escursionisti Avventurosi', 'Trekking La Palma', 'Amanti dei Sentieri'],
      'beach': ['Amici della Spiaggia', 'Beach Volley Gang', 'Relax al Mare'],
      'museum': ['Appassionati di Storia', 'Tour Culturale', 'Gruppo Musei Canari'],
      'gastronomy': ['Foodies Canari', 'Amanti della Cucina Locale', 'Wine & Dine'],
      'cycling': ['Ciclisti della Domenica', 'Mountain Bike Estrema', 'Pedalatori Seriali'],
      'family-park': ['Famiglie in Vacanza', 'Divertimento per Tutti', 'Genitori e Bambini']
    };
    
    const baseGroups = (activityTypes[activity.id as keyof typeof activityTypes] || ['Gruppo Attività']).map((name, index) => {
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1);
      const dateStr = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      
      return {
        id: `group-${activity.id}-${index}`,
        name,
        members: Math.floor(Math.random() * 8) + 3,
        activity: activity.name,
        date: dateStr,
        location: getRandomLocation(weather.location),
        description: `Gruppo per ${activity.description.toLowerCase()}. Tutti i livelli di esperienza sono benvenuti!`,
        creator: {
          name: getRandomName(),
          avatar: `/avatars/user${Math.floor(Math.random() * 8) + 1}.jpg`
        },
        isJoined: Math.random() > 0.8
      };
    });
    
    // Aggiungi altri gruppi casuali
    const extraGroups = [...Array(Math.floor(Math.random() * 3) + 1)].map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 14) + 1);
      const dateStr = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      
      return {
        id: `group-extra-${index}`,
        name: `${activity.name} & Fun`,
        members: Math.floor(Math.random() * 12) + 2,
        activity: activity.name,
        date: dateStr,
        location: getRandomLocation(weather.location),
        description: `Cerchiamo persone entusiaste per ${activity.name.toLowerCase()}! Porta acqua e buon umore.`,
        creator: {
          name: getRandomName(),
          avatar: `/avatars/user${Math.floor(Math.random() * 8) + 1}.jpg`
        },
        isJoined: false
      };
    });
    
    return [...baseGroups, ...extraGroups];
  };
  
  const generateMockBuddies = (activity: RatedActivity): User[] => {
    const interestsByActivity: Record<string, string[]> = {
      'hiking': ['trekking', 'natura', 'montagna', 'fotografia', 'avventura'],
      'beach': ['nuoto', 'sole', 'beach volley', 'snorkeling', 'relax'],
      'museum': ['arte', 'storia', 'cultura', 'fotografia', 'architettura'],
      'gastronomy': ['cucina', 'vino', 'foodie', 'ristoranti', 'tapas'],
      'cycling': ['bicicletta', 'sport', 'natura', 'montagna', 'fitness'],
      'family-park': ['bambini', 'divertimento', 'parchi', 'famiglia', 'attività all\'aperto']
    };
    
    const activityInterests = interestsByActivity[activity.id as keyof typeof interestsByActivity] || ['viaggi', 'vacanze', 'divertimento'];
    
    return [...Array(Math.floor(Math.random() * 5) + 5)].map((_, index) => {
      const numInterests = Math.floor(Math.random() * 3) + 2;
      const randomInterests = [...activityInterests].sort(() => 0.5 - Math.random()).slice(0, numInterests);
      
      return {
        id: `user-${index}`,
        name: getRandomName(),
        avatar: `/avatars/user${Math.floor(Math.random() * 8) + 1}.jpg`,
        bio: `Appassionato di ${activity.name} e altre attività all'aperto. In vacanza a ${weather.location}.`,
        interests: randomInterests,
        rating: 3.5 + Math.random() * 1.5
      };
    });
  };
  
  const generateMockReviews = (activity: RatedActivity): Review[] => {
    const reviewTexts = [
      `Ho fatto ${activity.name} qui la settimana scorsa ed è stato fantastico! Il tempo era perfetto.`,
      `Esperienza meravigliosa! Consiglio a tutti di provare ${activity.name} durante un soggiorno a ${weather.location}.`,
      `Attività bellissima, ma fate attenzione alle condizioni meteo. Meglio verificare prima di partire.`,
      `Ho portato tutta la famiglia, anche i bambini hanno adorato questa attività. Da ripetere!`,
      `Esperienza sopravvalutata. Non vale il prezzo che si paga, ci sono alternative migliori.`,
      `Non avevo mai provato ${activity.name} prima, ma ora sono un fan! Tornerò sicuramente.`
    ];
    
    return [...Array(Math.floor(Math.random() * 4) + 3)].map((_, index) => {
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
      
      const hasPhotos = Math.random() > 0.5;
      const numPhotos = hasPhotos ? Math.floor(Math.random() * 3) + 1 : 0;
      const photos = [...Array(numPhotos)].map(() => `/photos/activity${Math.floor(Math.random() * 8) + 1}.jpg`);
      
      return {
        id: `review-${index}`,
        user: {
          name: getRandomName(),
          avatar: `/avatars/user${Math.floor(Math.random() * 8) + 1}.jpg`
        },
        date: dateStr,
        rating: Math.floor(Math.random() * 2) + 3 + (Math.random() > 0.5 ? 0.5 : 0),
        text: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
        likes: Math.floor(Math.random() * 15),
        photos
      };
    });
  };
  
  // Helper per generare dati casuali
  
  const getRandomName = () => {
    const firstNames = ['Marco', 'Giulia', 'Luca', 'Sara', 'Anna', 'Carlo', 'Chiara', 'Pablo', 'María', 'Javier', 'Sofía', 'Laura'];
    const lastNames = ['Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Romano', 'González', 'Rodríguez', 'López', 'Martín', 'Fernández'];
    
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  };
  
  const getRandomLocation = (baseLocation: string) => {
    const locations = [
      `${baseLocation} Centro`,
      `${baseLocation} Nord`,
      `${baseLocation} Sud`,
      `${baseLocation} Beach`,
      `Parco di ${baseLocation}`,
      `Monte ${baseLocation}`,
      `${baseLocation} Plaza`
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  };
  
  // Gestione azioni utente
  
  const handleJoinGroup = (group: Group) => {
    setSelectedGroup(group);
    setViewType('join');
  };
  
  const handleConfirmJoin = () => {
    if (selectedGroup) {
      // In un'app reale, qui invieremmo una richiesta al server
      
      // Aggiorna lo stato locale
      setGroups(groups.map(g => 
        g.id === selectedGroup.id ? { ...g, isJoined: true, members: g.members + 1 } : g
      ));
      
      // Torna alla lista
      setViewType('list');
      setSelectedGroup(null);
    }
  };
  
  const handleContactBuddy = (user: User) => {
    // In un'app reale, qui apriremmo la chat o invieremmo una richiesta
    alert(`Funzionalità in arrivo! Presto potrai contattare ${user.name}`);
  };
  
  // Rendering delle diverse sezioni
  
  const renderGroups = () => {
    if (groups.length === 0) {
      return (
        <div className="text-center py-10">
          <FontAwesomeIcon icon={faUsers} className="text-gray-300 text-5xl mb-4" />
          <p className="text-gray-500">Nessun gruppo disponibile per questa attività.</p>
          <button className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg">
            Crea un nuovo gruppo
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <div className="w-12 h-12 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{group.name}</h3>
                <div className="text-xs text-gray-500 flex items-center mt-1">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                  {group.date}
                  <span className="mx-2">•</span>
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                  {group.location}
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{group.description}</p>
                <div className="mt-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      <img 
                        src={group.creator.avatar || "/avatars/default.jpg"} 
                        alt={group.creator.name}
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/avatars/default.jpg";
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 ml-2">
                      Creato da {group.creator.name}
                      <span className="mx-1">•</span>
                      {group.members} partecipanti
                    </span>
                  </div>
                  {group.isJoined ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Partecipante
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleJoinGroup(group)}
                      className="text-xs bg-[var(--color-primary)] text-white px-3 py-1 rounded hover:bg-opacity-90"
                    >
                      Partecipa
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderBuddies = () => {
    if (buddies.length === 0) {
      return (
        <div className="text-center py-10">
          <FontAwesomeIcon icon={faUserFriends} className="text-gray-300 text-5xl mb-4" />
          <p className="text-gray-500">Nessun compagno di attività trovato.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {buddies.map(user => (
          <div key={user.id} className="bg-white rounded-lg shadow p-4 border border-gray-100 flex">
            <div className="mr-3">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img 
                  src={user.avatar || "/avatars/default.jpg"} 
                  alt={user.name}
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/avatars/default.jpg";
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h3 className="font-medium text-gray-900">{user.name}</h3>
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-xs" />
                  <span className="text-xs text-gray-600 ml-1">{user.rating.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
              <div className="mt-2">
                <div className="flex flex-wrap">
                  {user.interests.map((interest, i) => (
                    <span 
                      key={i}
                      className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1 mr-1 mb-1"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => handleContactBuddy(user)}
                className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
              >
                Contatta
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderReviews = () => {
    if (reviews.length === 0) {
      return (
        <div className="text-center py-10">
          <FontAwesomeIcon icon={faComment} className="text-gray-300 text-5xl mb-4" />
          <p className="text-gray-500">Nessuna recensione disponibile per questa attività.</p>
          <button className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg">
            Scrivi la prima recensione
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <div className="flex">
              <div className="flex-shrink-0 mr-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img 
                    src={review.user.avatar || "/avatars/default.jpg"} 
                    alt={review.user.name}
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/avatars/default.jpg";
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">{review.user.name}</h4>
                  <span className="text-xs text-gray-500">{review.date}</span>
                </div>
                <div className="flex items-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <FontAwesomeIcon 
                      key={i}
                      icon={faStar} 
                      className={i < Math.floor(review.rating) ? "text-yellow-400" : "text-gray-300"} 
                      size="xs"
                    />
                  ))}
                  <span className="text-xs text-gray-600 ml-2">{review.rating.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{review.text}</p>
                
                {review.photos.length > 0 && (
                  <div className="mt-3 flex space-x-2 overflow-x-auto">
                    {review.photos.map((photo, i) => (
                      <div key={i} className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={photo || "/photos/default.jpg"}
                          alt="Foto recensione" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/photos/default.jpg";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-3 flex items-center text-xs text-gray-500">
                  <button className="flex items-center mr-4 hover:text-gray-700">
                    <FontAwesomeIcon icon={faStar} className="mr-1" />
                    Utile ({review.likes})
                  </button>
                  <button className="flex items-center mr-4 hover:text-gray-700">
                    <FontAwesomeIcon icon={faComment} className="mr-1" />
                    Commenta
                  </button>
                  <button className="flex items-center hover:text-gray-700">
                    <FontAwesomeIcon icon={faShareAlt} className="mr-1" />
                    Condividi
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderJoinGroup = () => {
    if (!selectedGroup) return null;
    
    return (
      <div className="p-4">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white mx-auto mb-4">
            <FontAwesomeIcon icon={faUsers} className="text-3xl" />
          </div>
          <h3 className="text-xl font-semibold">{selectedGroup.name}</h3>
          <p className="text-gray-600 mt-1">{selectedGroup.location}</p>
          <div className="flex justify-center items-center mt-2 text-sm text-gray-500">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
            {selectedGroup.date}
            <span className="mx-2">•</span>
            {selectedGroup.members} partecipanti
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium mb-2">Dettagli attività</h4>
          <p className="text-sm text-gray-600">{selectedGroup.description}</p>
          <div className="mt-3">
            <div className="flex items-center text-sm">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[var(--color-primary)] mr-2" />
              <span>Punto di incontro: {selectedGroup.location}</span>
            </div>
            <div className="flex items-center text-sm mt-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-[var(--color-primary)] mr-2" />
              <span>Data: {selectedGroup.date}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium flex items-center">
            <FontAwesomeIcon icon={faCloudSun} className="text-green-600 mr-2" />
            <span>Previsioni meteo</span>
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Le previsioni per questa data sono simili alle condizioni attuali: 
            {weather.condition}, {weather.temperature}°C.
          </p>
          <div className="text-sm text-green-700 mt-2">
            {activity.score > 80 
              ? '✓ Condizioni meteo ottimali per questa attività!' 
              : activity.score > 50 
                ? '⚠️ Condizioni meteo accettabili, preparati adeguatamente.' 
                : '⚠️ Attenzione: le condizioni meteo potrebbero non essere ideali.'}
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={() => setViewType('list')}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Annulla
          </button>
          <button 
            onClick={handleConfirmJoin}
            className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-opacity-90 flex items-center justify-center"
          >
            <span>Partecipa</span>
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Attività Sociali</h3>
            <button 
              onClick={onClose} 
              className="text-white hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <p className="mt-1">{activity.name} a {weather.location}</p>
        </div>
        
        {/* Tabs */}
        {viewType === 'list' && (
          <div className="bg-white border-b">
            <div className="flex">
              <button 
                className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'groups' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-gray-500'}`}
                onClick={() => setActiveTab('groups')}
              >
                Gruppi
              </button>
              <button 
                className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'buddies' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-gray-500'}`}
                onClick={() => setActiveTab('buddies')}
              >
                Compagni
              </button>
              <button 
                className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'reviews' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-gray-500'}`}
                onClick={() => setActiveTab('reviews')}
              >
                Recensioni
              </button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-6 flex flex-col items-center justify-center">
              <div className="animate-spin w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-500">Caricamento in corso...</p>
            </div>
          ) : (
            <>
              {viewType === 'list' && (
                <div className="p-4">
                  {activeTab === 'groups' && renderGroups()}
                  {activeTab === 'buddies' && renderBuddies()}
                  {activeTab === 'reviews' && renderReviews()}
                </div>
              )}
              
              {viewType === 'join' && renderJoinGroup()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialActivities;
