/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      clipPath: {
        cornerTopRight: 'polygon(0 0, 100% 0, 100% 100%)',
      },
    },
  },
  plugins: [
    require('tailwindcss-motion'),
    require('@tailwindcss/typography'),
    require('tailwind-clip-path'),
  ],
};