/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.js",
    "./src/**/*.{js,ts,jsx,tsx,css}",
    "./games/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        'neural-black': '#050505',
        'neural-purple': '#7c3aed',
        'neural-pink': '#db2777',
      },
    },
  },
  plugins: [],
}