import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react() // Let the react plugin handle JSX transformation automatically
  ],
  server: {
    open: true
  },
  // Define environment variables that will be available in the frontend
  define: {
    // Use the VITE_SERVER_URL environment variable if available, otherwise use a relative path
    'process.env.VITE_SERVER_URL': JSON.stringify(process.env.VITE_SERVER_URL || '')
  }
})
