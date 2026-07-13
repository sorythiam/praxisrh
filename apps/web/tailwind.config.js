/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        praxis: {
          50: '#f2f7f3',
          100: '#dfeee2',
          200: '#b9dcc2',
          500: '#2f7d4f',
          600: '#24623e',
          700: '#1d4f32',
          900: '#123320',
        },
      },
    },
  },
  plugins: [],
};
