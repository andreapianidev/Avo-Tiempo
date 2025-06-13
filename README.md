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

Avo Tiempo is both a Progressive Web App (PWA) and a full-featured native mobile application for iOS and Android (built with Capacitor), designed to provide comprehensive weather information and outdoor activity recommendations for the Canary Islands and beyond. The app combines multiple data sources including weather forecasts, points of interest (POI), and AI-powered insights to help users plan their outdoor activities with confidence.

### Key Features

- **Hyperlocal Weather Forecasts**: Detailed weather data with AEMET and OpenWeather API integration
- **Interactive POI Map**: Discover points of interest around you with detailed information
- **AI-Powered Recommendations**: Get personalized activity suggestions based on weather conditions
- **Weather Alerts**: Real-time notifications for severe weather events
- **Offline Support**: Full functionality even without an internet connection
- **Multi-language**: Available in Spanish and English
- **Responsive Design**: Works seamlessly on mobile and desktop devices
- **PWA & Native Apps**: Install directly from browser as a PWA or download the full native experience from iOS and Android app stores (built with Capacitor)

## Demo

Experience Avo Tiempo at [https://tiempo.avoagencylapalma.com](https://tiempo.avoagencylapalma.com) - Il sito ufficiale dell'applicazione

<div align="center">
  <img src="https://tiempo.avoagencylapalma.com/assets/screenshots/Screenshot%202025-06-13%20alle%2020.26.05.png" alt="Avo Tiempo Screenshot 1" width="30%" />
  <img src="https://tiempo.avoagencylapalma.com/assets/screenshots/Screenshot%202025-06-13%20alle%2020.26.25.png" alt="Avo Tiempo Screenshot 2" width="30%" />
  <img src="https://tiempo.avoagencylapalma.com/assets/screenshots/Screenshot%202025-06-13%20alle%2020.26.40.png" alt="Avo Tiempo Screenshot 3" width="30%" />
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

1. Copy the `.env.example` file to create a new `.env` file in the root directory:

```bash
cp .env.example .env
```

2. Edit your `.env` file with your API keys:

```
REACT_APP_OPENWEATHER_API_KEY=your_openweather_api_key
REACT_APP_DEEPSEEK_API_KEY=your_deepseek_api_key
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
REACT_APP_AEMET_API_KEY=your_aemet_api_key
```

3. **IMPORTANT**: Never commit your `.env` file to the repository! It's already in the `.gitignore` file.

### Building for Production

```bash
# Create optimized production build
npm run build

# Preview the production build locally
npm run serve
```

### Native Mobile App Development

Avo Tiempo is not just a PWA - it's a fully native mobile application built with Capacitor, allowing true native capabilities on both iOS and Android platforms:

```bash
# Sync web code with native projects
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio
npx cap open android
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Deployment

### Web Deployment

Avo Tiempo can be deployed to any static web hosting service:

```bash
# Build for production
npm run build

# Deploy to Netlify (if you have Netlify CLI installed)
npm run build && netlify deploy --prod

# Deploy to Vercel (if you have Vercel CLI installed)
vercel --prod
```

### Native App Deployment

```bash
# Build for production
npm run build

# Sync web code with Capacitor
npx cap sync

# Generate native iOS app
npx cap build ios

# Generate native Android app
npx cap build android
```

For app store submissions, follow the standard Apple App Store and Google Play Store submission processes. The app is packaged as a true native application, not just a WebView wrapper, with full access to native device features and optimized performance.

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

## Security

### API Key Management

Avo Tiempo uses several external APIs that require authentication. For security reasons:

1. All API keys are stored in environment variables, not in the source code
2. The `.env` file is excluded from Git via `.gitignore`
3. An `.env.example` template is provided for reference
4. API requests use appropriate authorization mechanisms (headers vs URL parameters)

### Data Privacy

Avo Tiempo respects user privacy:

1. Geolocation data is only used locally and not shared with third parties
2. User preferences are stored in the browser's local storage
3. No personal data is collected beyond what's needed for app functionality

## Troubleshooting

### Common Issues

1. **API Error Codes**
   - 401/403: Check your API keys in the `.env` file
   - CORS errors: The app uses proxies in development; check proxy configuration

2. **Map Not Loading**
   - Verify your Mapbox token is correct
   - Check browser console for specific errors

3. **Offline Mode Issues**
   - Clear browser cache and reload
   - Check IndexedDB storage permissions

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
