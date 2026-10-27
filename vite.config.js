import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Forward API calls to the backend (cd server && npm run dev).
  server: { proxy: { '/api': 'http://localhost:4000' } },
})
