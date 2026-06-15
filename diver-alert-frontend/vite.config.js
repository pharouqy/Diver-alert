import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,  // Port fixe — correspond à CLIENT_URL dans le backend .env
    strictPort: true, // Échoue si le port est déjà occupé plutôt que d'en choisir un autre
  },
})