/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kku: {
          primary: '#B91C1C',      // Red 700 (เลือดหมู)
          secondary: '#DC2626',   // Red 600
          accent: '#F97316',      // Orange 500
          dark: '#7F1D1D',        // Red 900 (เลือดหมูเข้ม)
          light: '#FED7AA',       // Orange 200
          orange: '#EA580C',      // Orange 600
        },
      },
    },
  },
  plugins: [],
}
