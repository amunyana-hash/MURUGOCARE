/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#EFF6F1',
          100: '#D8E9DE',
          200: '#B2D3C0',
          300: '#83B79B',
          400: '#4F9573',
          500: '#2E7A5A',
          600: '#1D6248',
          700: '#144E39',
          800: '#0D3D2C',
          900: '#08291E',
          950: '#041A13'
        },
        gold: {
          50: '#FBF7EA',
          100: '#F5EDCD',
          200: '#EBDC9B',
          300: '#DFC46A',
          400: '#D4AF37',
          500: '#C09A22',
          600: '#A07D19',
          700: '#7C5F16',
          800: '#5A4514',
          900: '#3E3011'
        },
        cream: '#F7F5EF',
        ink: '#0E1F18'
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif']
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(8, 41, 30, 0.18)',
        lift: '0 24px 60px -24px rgba(8, 41, 30, 0.35)'
      },
      borderRadius: { xl2: '1.25rem' }
    }
  },
  plugins: []
};
