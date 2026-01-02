/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'quantico': ['Quantico', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;