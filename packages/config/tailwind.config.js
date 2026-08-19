/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        luxury: {
          black: {
            DEFAULT: '#000000',
            obsidian: '#0A0A0A',
            deep: '#050505',
            pure: '#000000',
          },
          gold: {
            DEFAULT: '#D4AF37', // Classic metallic gold
            rich: '#C5A059',     // Editorial warm gold
            light: '#F3E5AB',    // Brass gold
            dark: '#AA7C11',     // Antique gold
            bronze: '#8C7853',   // Muted bronze
          },
          white: {
            DEFAULT: '#FFFFFF',
            soft: '#FAFAFA',
            muted: '#E5E5E5',
          },
          gray: {
            light: '#CCCCCC',
            DEFAULT: '#777777',
            dark: '#1A1A1A',
            border: '#2C2C2C',   // For very subtle borders
          }
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Didot', 'Cinzel', 'Georgia', 'serif'],
        sans: ['Inter', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        editorial: '0.15em',
        luxury: '0.2em',
        wide: '0.05em',
      },
      borderWidth: {
        '0.5': '0.5px', // For ultra-fine layout lines
      }
    }
  },
  plugins: [],
}
