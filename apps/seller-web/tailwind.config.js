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
        primary: '#0066FF',    // Bright blue
        dark: '#0F172A',       // Dark blue
        secondary: '#1E293B',  // Medium dark
        accent: '#60A5FA',     // Light blue
      },
    },
  },
  plugins: [],
}
