import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import handler from './api/gasolineras.js'

// En local («npm run dev»), la ruta /api/gasolineras la atiende la misma función que se
// publica en Vercel: así la web funciona igual en el ordenador que en Internet.
function apiLocal() {
  const montar = (server) => {
    server.middlewares.use('/api/gasolineras', (req, res) => handler(req, res))
  }
  // Ojo: «montar» no devuelve nada a propósito. Si devolviera una función, Vite la
  // ejecutaría después como otro paso de configuración.
  return { name: 'api-local', configureServer: montar, configurePreviewServer: montar }
}

export default defineConfig({
  plugins: [react(), apiLocal()],
  server: { port: 5173 }
})
