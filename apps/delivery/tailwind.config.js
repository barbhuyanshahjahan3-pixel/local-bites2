/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#65a30d', dark: '#4d7c0f' },
      },
    },
  },
  plugins: [],
};
