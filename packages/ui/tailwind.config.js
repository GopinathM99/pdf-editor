/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pdf-primary': '#1a73e8',
        'pdf-secondary': '#5f6368',
        'pdf-background': '#f8f9fa',
        'pdf-surface': '#ffffff',
        'pdf-border': '#dadce0',
        'pdf-hover': '#e8f0fe',
        'pdf-active': '#d2e3fc',
      },
      spacing: {
        'toolbar': '48px',
        'sidebar': '200px',
        'thumbnail': '120px',
      },
    },
  },
  plugins: [],
}
