import { defineConfig, presetUno, presetIcons, presetAttributify } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      collections: {
        mdi: () => import('@iconify-json/mdi/icons.json').then(i => i.default),
      },
      scale: 1.2,
      warn: true,
    }),
  ],
  theme: {
    colors: {
      primary: {
        DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
        hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
      },
      secondary: {
        DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
        hover: 'rgb(var(--color-secondary-hover) / <alpha-value>)',
      },
      danger: {
        DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
        hover: 'rgb(var(--color-danger-hover) / <alpha-value>)',
      },
      warning: {
        DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
      },
      surface: {
        DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
        secondary: 'rgb(var(--color-surface-secondary) / <alpha-value>)',
      },
      border: {
        DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
        light: 'rgb(var(--color-border-light) / <alpha-value>)',
      },
      text: {
        DEFAULT: 'rgb(var(--color-text) / <alpha-value>)',
        secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        inverse: 'rgb(var(--color-text-inverse) / <alpha-value>)',
      },
      // Tab group colors
      'group-blue': 'rgb(var(--color-group-blue) / <alpha-value>)',
      'group-red': 'rgb(var(--color-group-red) / <alpha-value>)',
      'group-yellow': 'rgb(var(--color-group-yellow) / <alpha-value>)',
      'group-green': 'rgb(var(--color-group-green) / <alpha-value>)',
      'group-pink': 'rgb(var(--color-group-pink) / <alpha-value>)',
      'group-purple': 'rgb(var(--color-group-purple) / <alpha-value>)',
      'group-cyan': 'rgb(var(--color-group-cyan) / <alpha-value>)',
      'group-grey': 'rgb(var(--color-group-grey) / <alpha-value>)',
      'group-orange': 'rgb(var(--color-group-orange) / <alpha-value>)',
    },
  },
  shortcuts: {
    // Layout
    'popup-container': 'w-400px min-h-500px flex flex-col bg-surface text-text',
    'options-container': 'max-w-800px mx-auto p-5',
    
    // Sections
    'section': 'mb-6 last:mb-0',
    'section-card': 'bg-surface p-5 rounded-lg shadow-sm',
    
    // Headers
    'header-primary': 'flex justify-between items-center px-4 py-4 bg-primary text-text-inverse',
    'header-title': 'text-lg font-medium',
    
    // Forms
    'form-group': 'mb-4',
    'form-label': 'block mb-1.5 font-medium text-text color-text',
    'form-input': 'w-full px-3 py-2 border border-border rounded text-sm bg-surface color-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors',
    'form-textarea': 'form-input resize-vertical font-mono',
    
    // Buttons
    'btn': 'px-4 py-2.5 rounded-md font-medium cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-primary': 'btn bg-primary text-text-inverse hover:bg-primary-hover',
    'btn-secondary': 'btn bg-surface border border-border hover:bg-surface-secondary color-text',
    'btn-danger': 'btn bg-surface text-danger border border-danger hover:bg-danger hover:text-text-inverse',
    // Solid danger button (red by default)
    'btn-danger-solid': 'inline-flex items-center justify-center p-2.5 rounded bg-danger text-text-inverse border border-danger hover:opacity-90 transition-all',
    'btn-icon': 'inline-flex items-center justify-center p-2.5 bg-transparent border border-border rounded hover:bg-surface-secondary transition-all color-text',
    'btn-link': 'bg-transparent text-primary cursor-pointer hover:underline',
    
    // Toggle Switch
    'toggle-container': 'relative inline-block w-12 h-6',
    'toggle-input': 'opacity-0 w-0 h-0',
    'toggle-slider': 'absolute cursor-pointer inset-0 bg-white/30 transition-all duration-300 rounded-full',
    'toggle-slider-thumb': 'absolute h-4.5 w-4.5 left-0.75 bottom-0.75 bg-white transition-transform duration-300 rounded-full',
    
    // Status
    'status-item': 'flex justify-between items-center mb-2 last:mb-0',
    'status-label': 'text-text-secondary color-text-secondary',
    'status-value': 'font-medium color-text',
    'status-active': 'text-secondary color-secondary',
    'status-inactive': 'text-text-secondary color-text-secondary',
    'status-error': 'text-danger color-danger',
    'status-checking': 'text-warning color-warning',
    
    // Groups
    'group-item': 'flex items-center p-2 bg-surface-secondary rounded-md mb-2 last:mb-0',
    'group-color-indicator': 'w-3 h-10 rounded-sm mr-3',
    'group-info': 'flex-1',
    'group-title': 'font-medium mb-1 text-text color-text',
    'group-meta': 'flex gap-3 text-xs text-text-secondary color-text-secondary',
    
    // Notifications
    'notification': 'fixed bottom-5 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-md text-text-inverse text-sm z-1000 animate-slideUp',
    'notification-success': 'notification bg-secondary',
    'notification-error': 'notification bg-danger',
    'notification-info': 'notification bg-primary',
    
    // Theme toggle
    'theme-toggle': 'fixed top-4 right-4 p-2 rounded-full bg-surface-secondary border border-border hover:border-primary transition-all cursor-pointer',
  },
  safelist: [
    'i-mdi-robot',
    'i-mdi-cog',
    'i-mdi-check-circle',
    'i-mdi-alert-circle',
    'i-mdi-refresh',
    'i-mdi-folder-open',
    'i-mdi-brightness-6',
    'i-mdi-weather-sunny',
    'i-mdi-weather-night',
    // Options page dynamic icon and styles
    'i-mdi-trash-can-outline',
    'bg-danger',
    'border',
    'border-danger',
    'text-white',
    'hover:opacity-90',
    'btn',
    // Ensure runtime-generated category row padding/layout classes
    'flex',
    'items-center',
    'rounded-md',
    'py-2',
    'pl-4',
    'pr-0',
  ],
});
