/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sdark: {
          50: '#f7f8fc',
          100: '#eef0f6',
          200: '#d5dae7',
          300: '#aeb7cf',
          400: '#7f8db0',
          500: '#5c6c94',
          600: '#475579',
          700: '#394460',
          800: '#20263a',
          900: '#12152a',
          950: '#0a0c1c',
        },
        sblue: {
          50: '#eff9ff',
          100: '#def2ff',
          200: '#b6e7ff',
          300: '#75d6ff',
          400: '#2bc0ff',
          500: '#00a6f0',
          600: '#0084cd',
          700: '#0069a6',
          800: '#065989',
          900: '#0b4a71',
          950: '#072f4b',
        },
        sgold: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
