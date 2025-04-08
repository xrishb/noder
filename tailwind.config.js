/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Theme Colors (Adjusted)
        'proto-bg': '#0A0F1C',        // Slightly darker main background
        'proto-grid': 'rgba(255, 255, 255, 0.06)', // Even subtler grid lines
        'proto-node-bg': '#252526',    // Dark node body
        'proto-node-border': '#1A1A1A', // Node border (matches bg)
        'proto-node-header-func': '#1E64B4', // Adjusted blue func header
        'proto-node-header-event': '#B71C1C', // Adjusted red event header
        'proto-node-header-var': '#2E7D32',   // Kept green var header
        'proto-node-header-macro': '#6A1B9A', // Kept purple macro header
        'proto-node-selected': '#007ACC',   // Brighter blue for selected node border
        // Pin colors (adjusted for contrast/preference)
        'proto-pin-exec': '#FFFFFF',
        'proto-pin-bool': '#D81B60',  // More saturated pink
        'proto-pin-int': '#039BE5',  // Slightly brighter light Blue
        'proto-pin-float': '#00ACC1', // Slightly brighter cyan
        'proto-pin-string': '#E64A19', // Adjusted deep orange
        'proto-pin-vector': '#7CB342', // Adjusted light green
        'proto-pin-object': '#FFB300', // Adjusted amber
        // Input bar colors
        'proto-input-bg': '#2D2D2D', // Darker input bg
        'proto-input-border': '#3F3F3F', // Darker input border
        'proto-input-text': '#E0E0E0', // Brighter input text
        'proto-input-placeholder': '#757575', // Adjusted placeholder
        // Enhanced theme colors
        'primary': {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
        },
        'secondary': {
          50: '#EDE7F6',
          100: '#D1C4E9',
          200: '#B39DDB',
          300: '#9575CD',
          400: '#7E57C2',
          500: '#673AB7',
          600: '#5E35B1',
          700: '#512DA8',
          800: '#4527A0',
          900: '#311B92',
        },
        'accent': {
          50: '#E0F7FA',
          100: '#B2EBF2',
          200: '#80DEEA',
          300: '#4DD0E1',
          400: '#26C6DA',
          500: '#00BCD4',
          600: '#00ACC1',
          700: '#0097A7',
          800: '#00838F',
          900: '#006064',
        },
      },
      boxShadow: {
        'proto-node': '0 3px 10px rgba(0, 0, 0, 0.5)', // Slightly adjusted shadow
        'neon': '0 0 5px theme(colors.primary.400), 0 0 20px theme(colors.primary.600)',
        'neon-purple': '0 0 5px theme(colors.secondary.400), 0 0 20px theme(colors.secondary.600)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-hover': '0 8px 32px rgba(30, 64, 175, 0.2)',
        'card': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'gradient-slow': 'gradient 8s linear infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-slower': 'float 10s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'spin-slower': 'spin 15s linear infinite',
        'bounce-slow': 'bounce 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        glow: {
          '0%': {
            boxShadow: '0 0 5px rgba(33, 150, 243, 0.3), 0 0 10px rgba(33, 150, 243, 0.2)',
          },
          '100%': {
            boxShadow: '0 0 10px rgba(33, 150, 243, 0.6), 0 0 20px rgba(33, 150, 243, 0.4)',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-1000px 0',
          },
          '100%': {
            backgroundPosition: '1000px 0',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'grid-pattern': "url('/grid.svg')",
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
        'gradient-radial-to-tr': 'radial-gradient(115% 90% at 0% 100%, var(--tw-gradient-stops))',
        'gradient-radial-to-tl': 'radial-gradient(115% 90% at 100% 100%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      transitionDuration: {
        '2000': '2000ms',
      },
      transitionTimingFunction: {
        'bounce-in-out': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
      },
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
  },
  plugins: [
    // Plugin to add radial gradient utility
    plugin(function({ addUtilities }) {
      addUtilities({
        '.bg-gradient-radial': {
          'background-image': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        },
        '.text-shadow-sm': {
          'text-shadow': '0 1px 2px rgba(0, 0, 0, 0.2)',
        },
        '.text-shadow': {
          'text-shadow': '0 2px 4px rgba(0, 0, 0, 0.2)',
        },
        '.text-shadow-md': {
          'text-shadow': '0 4px 8px rgba(0, 0, 0, 0.3)',
        },
        '.text-shadow-lg': {
          'text-shadow': '0 8px 16px rgba(0, 0, 0, 0.4)',
        },
        '.text-shadow-none': {
          'text-shadow': 'none',
        },
        '.bg-glass': {
          'background': 'rgba(255, 255, 255, 0.03)',
          'backdrop-filter': 'blur(16px)',
          'border': '1px solid rgba(255, 255, 255, 0.05)',
        },
        '.bg-glass-dark': {
          'background': 'rgba(10, 15, 28, 0.7)',
          'backdrop-filter': 'blur(16px)',
          'border': '1px solid rgba(255, 255, 255, 0.03)',
        },
      })
    }),
    require('@tailwindcss/forms'),
  ],
} 