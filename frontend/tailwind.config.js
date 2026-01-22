/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5', // Indigo-600
        'primary-hover': '#4338CA', // Indigo-700
        secondary: '#818CF8', // Lighter shade for accents
        accent: '#06b6d4',
        subtle: '#e2e8f0',
        'background-light': '#F9FAFB', // Gray-50
        'background-dark': '#0F172A', // Slate-900
        'card-light': '#FFFFFF',
        'card-white': '#FFFFFF',
        'card-dark': '#1E293B', // Slate-800
        'text-light': '#111827', // Gray-900
        'text-main': '#111827', // Gray-900
        'text-dark': '#F8FAFC', // Slate-50
        'text-muted-light': '#6B7280', // Gray-500
        'text-secondary': '#6B7280', // Gray-500
        'text-muted-dark': '#94A3B8', // Slate-400
        'badge-light': '#E0E7FF', // Indigo-100
        'badge-dark': '#312E81', // Indigo-900
        'border-color': '#E5E7EB', // Gray-200
        'accent-purple': '#5646F5',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        DEFAULT: '0.75rem', // Rounded-xl for consistent look
      },
    },
  },
  plugins: [],
}
