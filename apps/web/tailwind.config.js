/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // PDF Editor brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // PDF UI component colors (from @pdf-editor/ui)
        'pdf-primary': '#1a73e8',
        'pdf-secondary': '#5f6368',
        'pdf-background': '#f8f9fa',
        'pdf-surface': '#ffffff',
        'pdf-border': '#dadce0',
        'pdf-hover': '#e8f0fe',
        'pdf-active': '#d2e3fc',
      },
    },
  },
  plugins: [],
};
