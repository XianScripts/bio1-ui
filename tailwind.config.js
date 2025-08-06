/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  /* ⬇️  put the new colours here */
  theme: {
    extend: {
      colors: {
        /* maps to the CSS-custom-properties you already have
           in src/index.css (`:root { --background: … ; --foreground: … }`) */
        background: 'oklch(var(--background) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
      },
    },
  },

  plugins: [require('tailwindcss-animate')],
};

