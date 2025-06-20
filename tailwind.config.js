/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-main': {
          light: '#FFF8ED', // Beige molto chiaro come nell'immagine 2
          dark: '#000000' // Nero puro per la notte canariana
        },
        'text-primary': {
          light: '#3E3121', // Marrone scuro
          dark: '#03A9F4' // Azzurro brillante stellare
        },
        'text-secondary': {
          light: '#6B5640', // Marrone più chiaro
          dark: '#C0D8FF' // Azzurro chiaro stellare
        },
        'alert-bg': {
          light: '#FFD19A', // Arancione chiaro per l'alert
          dark: '#1E2746' // Blu notte profondo
        },
        'alert-text': {
          light: '#7A4100', // Marrone arancione
          dark: '#FFD9A8' // Conservato per contrasto
        },
        'ai-box-bg': {
          light: '#FFF2E0', // Crema chiaro
          dark: '#121836' // Blu notte delle Canarie
        },
        'card-bg': {
          light: '#FFF4E2', // Beige molto chiaro per le card
          dark: '#0A0E1F' // Blu notte quasi nero
        },
        'border-color': {
          light: '#EADEC7', // Beige chiaro per i bordi
          dark: '#2D3863' // Blu medio notte
        },
        'highlight': {
          light: '#F0CA5C',  // Giallo/oro per le icone
          dark: '#FFD662'    // Giallo più brillante, come le stelle canarie
        },
        'star': {
          light: '#FFEBB3',  // Stella brillante (light mode)
          dark: '#FFEBB3'    // Stella brillante (dark mode)
        },
        'night-purple': {
          light: '#D8CFFF',  // Viola chiaro (light mode)
          dark: '#5D4FB3'    // Viola notte canariana (dark mode)
        },
        'avocado': {
          light: '#568203',  // Verde avocado
          dark: '#568203'    // Stesso colore in dark mode
        },
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'Noto Sans', 'ui-sans-serif', 'system-ui'],
      }
    },
  },
  plugins: [
    function({ addBase, theme }) {
      addBase({
        // Light theme variables (default)
        ':root': {
          '--color-bg-main': theme('colors.bg-main.light'),
          '--color-text-primary': theme('colors.text-primary.light'),
          '--color-text-secondary': theme('colors.text-secondary.light'),
          '--color-alert-bg': theme('colors.alert-bg.light'),
          '--color-alert-text': theme('colors.alert-text.light'),
          '--color-ai-box-bg': theme('colors.ai-box-bg.light'),
          '--color-card-bg': theme('colors.card-bg.light'),
          '--color-border': theme('colors.border-color.light'),
          '--color-highlight': theme('colors.highlight.light'),
        },
        // Dark theme variables
        '.dark': {
          '--color-bg-main': theme('colors.bg-main.dark'),
          '--color-text-primary': theme('colors.text-primary.dark'),
          '--color-text-secondary': theme('colors.text-secondary.dark'),
          '--color-alert-bg': theme('colors.alert-bg.dark'),
          '--color-alert-text': theme('colors.alert-text.dark'),
          '--color-ai-box-bg': theme('colors.ai-box-bg.dark'),
          '--color-card-bg': theme('colors.card-bg.dark'),
          '--color-border': theme('colors.border-color.dark'),
          '--color-highlight': theme('colors.highlight.dark'),
        },
      });
    },
  ],
}
