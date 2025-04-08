import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react() // Let the react plugin handle JSX transformation automatically
  ],
  server: {
    open: true
  }
})
