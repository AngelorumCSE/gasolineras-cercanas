import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import handler from './api/EstacionesTerrestres.js'

// En local, /api/EstacionesTerrestres se atiende con la misma función que se despliega
// en Vercel, así que «npm run dev» y la versión publicada se comportan igual.
function localApi() {
  // Sin «return»: si el hook devolviera una función, Vite la ejecutaría como hook posterior.
  const mount = (server) => {
    server.middlewares.use('/api/EstacionesTerrestres', (req, res) => handler(req, res))
  }
  return { name: 'local-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), localApi()],
  server: { port: 5173 }
})
