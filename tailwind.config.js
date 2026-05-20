/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2a37',
        muted: '#7b8794',
        line: '#e6eaf0',
        panel: '#ffffff',
        canvas: '#f4f7fb',
        sidebar: '#f8fafc',
        primary: '#2f7bf6',
        primarySoft: '#e8f1ff',
        mintSoft: '#eaf8f2',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(31, 42, 55, 0.06)',
        card: '0 2px 8px rgba(31, 42, 55, 0.06)',
      },
    },
  },
  plugins: [],
};
