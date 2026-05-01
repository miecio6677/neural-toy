/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.js",
    "./src/**/*.{js,ts,jsx,tsx,css}",
    "./{Tower-Defence,Cyber-Botanist,Egg-Hatching,Void-Miner,World-Fishing}/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        'os-black': '#0a0a0a',
        'os-green': '#00ff41', // Matrix green
        'os-gray': '#1a1a1a',
        'os-border': '#333333',
        },
    },
  },
  plugins: [],
}
