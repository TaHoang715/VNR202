/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#f6f3ed',
        'paper-card': '#fbf9f5',
        'paper-muted': '#ede7dc',
        ink: '#171513',
        'ink-light': '#3a3530',
        'ink-muted': '#6e6761',
        burgundy: {
          DEFAULT: '#9d242b',
          hover: '#7a171d',
          light: '#faebee',
        },
        forest: {
          DEFAULT: '#193b32',
          hover: '#122b24',
          light: '#e8f0ec',
          dark: '#0e201b',
        },
        gold: {
          DEFAULT: '#c99738',
          hover: '#a87923',
          light: '#f9f3e5',
        },
        archival: {
          border: '#dfd6c6',
          'border-dark': '#c5b8a3',
          card: '#ffffff',
          dark: '#141c19',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Lora', 'Georgia', 'serif'],
        display: ['Newsreader', 'Lora', 'Georgia', 'serif'],
        sans: ['Be Vietnam Pro', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
}
