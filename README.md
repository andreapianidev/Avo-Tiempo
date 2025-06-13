<div align="center">
  <img src="public/assets/logo.png" alt="Avo Tiempo Logo" width="200"/>
  <h1>Avo Tiempo</h1>
  <p><strong>Intelligent Weather & Outdoor Experience App for the Canary Islands</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#demo">Demo</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#api-integrations">API Integrations</a> •
    <a href="#contributing">Contributing</a> •
    <a href="#license">License</a>
  </p>
</div>

## Overview

Avo Tiempo is a Progressive Web App (PWA) designed to provide comprehensive weather information and outdoor activity recommendations for the Canary Islands and beyond. The app combines multiple data sources including weather forecasts, points of interest (POI), and AI-powered insights to help users plan their outdoor activities with confidence.

### Key Features

- **Hyperlocal Weather Forecasts**: Detailed weather data with AEMET and OpenWeather API integration
- **Interactive POI Map**: Discover points of interest around you with detailed information
- **AI-Powered Recommendations**: Get personalized activity suggestions based on weather conditions
- **Weather Alerts**: Real-time notifications for severe weather events
- **Offline Support**: Full functionality even without an internet connection
- **Multi-language**: Available in Spanish and English
- **Responsive Design**: Works seamlessly on mobile and desktop devices
- **PWA & Native Apps**: Install directly from browser or download from app stores

## Demo

Experience Avo Tiempo at [avoweather.com](https://avoweather.com)

<div align="center">
  <img src="public/assets/screenshots/home-screen.png" alt="Home Screen" width="24%" />
  <img src="public/assets/screenshots/poi-map.png" alt="POI Map" width="24%" />
  <img src="public/assets/screenshots/weather-details.png" alt="Weather Details" width="24%" />
  <img src="public/assets/screenshots/activity-suggestions.png" alt="Activity Suggestions" width="24%" />
</div>

## Getting Started

### Prerequisites

- Node.js 16.x or later
- npm 7.x or later

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/avo-tiempo.git
cd avo-tiempo

# Install dependencies
npm install

# Start the development server
npm start
```

The app will be available at http://localhost:3000

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
REACT_APP_OPENWEATHER_API_KEY=your_openweather_api_key
REACT_APP_DEEPSEEK_API_KEY=your_deepseek_api_key
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
REACT_APP_AEMET_API_KEY=your_aemet_api_key
```

### Building for Production

```bash
# Create optimized production build
npm run build

# Preview the production build locally
npm run serve
```

### Mobile App Development

Avo Tiempo uses Capacitor for native mobile app development:

```bash
# Sync web code with native projects
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio
npx cap open android
```

## Architecture

Avo Tiempo is built with a modern, component-based architecture using React and TypeScript:

### Key Components

- **React 18**: For building the user interface
- **TypeScript**: For type safety and better developer experience
- **TailwindCSS**: For styling and responsive design
- **Mapbox GL JS**: For interactive maps and POI visualization
- **PWA**: Service workers for offline support and installation
- **Capacitor**: For native mobile app development

### Application Flow

1. **Weather Data**: Fetched from AEMET (primary) and OpenWeather (fallback)
2. **POI Data**: Retrieved from OpenStreetMap via Overpass API
3. **AI Insights**: Generated using DeepSeek API based on weather and POI data

### Performance Optimization

- **Aggressive Caching**: All API responses are cached using a multi-tiered strategy
- **Lazy Loading**: Components and routes are loaded on-demand
- **Service Worker**: Provides offline functionality and faster load times
- **IndexedDB**: Stores larger datasets (POIs, forecasts) for offline use

## API Integrations

Avo Tiempo integrates with several external APIs:

- **AEMET OpenData**: Spanish meteorological agency for accurate local forecasts
- **OpenWeather API**: For global weather data and fallback forecasts
- **Overpass API**: For accessing OpenStreetMap data and POIs
- **DeepSeek API**: For generating AI-powered activity recommendations
- **Mapbox GL JS**: For interactive map visualization

## Contributing

Contributions are welcome! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to your branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

We use ESLint and Prettier for code formatting. Please ensure your code follows our style guidelines by running:

```bash
npm run lint
npm run format
```

## License

Avo Tiempo is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [OpenWeather](https://openweathermap.org/) for weather data
- [AEMET](https://www.aemet.es/) for Spanish meteorological data
- [OpenStreetMap](https://www.openstreetmap.org/) for map data
- [DeepSeek](https://deepseek.com/) for AI capabilities
- [Mapbox](https://www.mapbox.com/) for map visualization
- All contributors who have helped make this project possible

---

<div align="center">
  <p>Made with ❤️ for the Canary Islands</p>
  <p> 2025 Avo Agency</p>
</div>
