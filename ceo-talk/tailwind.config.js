/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // palet ngopi santai
        cream: '#FBF6EE',
        latte: '#E8D9C5',
        mocha: '#6F4E37',
        espresso: '#3B2A20',
        caramel: '#C68B4C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
