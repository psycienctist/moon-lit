module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        cosmos: {
          void: '#05070a',
          ink: '#0b0f17',
          panel: '#0d1117',
          line: '#1f2933',
          mist: '#8b949e',
          glow: '#e6edf3',
          purple: '#bc8cff',
          violet: '#6e40c9',
          deep: '#2d1b69',
          blue: '#58a6ff',
          azure: '#1f6feb',
          ember: '#ff7b72',
          gold: '#f0c674',
        }
      },
      boxShadow: {
        glow: '0 0 30px rgba(110, 64, 201, 0.25)',
        glowBlue: '0 10px 30px rgba(31, 111, 235, 0.15)',
      },
      backgroundImage: {
        'cosmic-radial': 'radial-gradient(circle at top right, #1b1040 0%, #05070a 60%)',
        'cosmic-card': 'linear-gradient(135deg, #0d1f3c 0%, #05070a 100%)',
        'vibe-card': 'linear-gradient(135deg, #2d1b69 0%, #1a1f36 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      }
    },
  },
  plugins: [],
};
