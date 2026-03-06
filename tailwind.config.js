/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      colors: {
        vibe: {
          navy: '#0A0E1A',
          blue: '#1A2744',
          accent: '#3D7EFF',
          cyan: '#00E5FF',
          gold: '#FFD700',
          success: '#00FF9D',
          danger: '#FF4757',
          warn: '#FFB300',
        }
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pop-in': 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'float-name': 'floatName 2.5s ease-out forwards',
        'shake': 'shake 0.4s ease-in-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px #3D7EFF44, 0 0 20px #3D7EFF22' },
          '50%': { boxShadow: '0 0 20px #3D7EFFAA, 0 0 60px #3D7EFF44' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.5)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        floatName: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '80%': { opacity: '1', transform: 'translateY(-60px) scale(1.2)' },
          '100%': { opacity: '0', transform: 'translateY(-80px) scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
