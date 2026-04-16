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
        primary: '#0066FF',
        dark: '#0F172A',
        secondary: '#1E293B',
        accent: '#60A5FA',
        danger: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
      },
    },
  },
  plugins: [],
}
