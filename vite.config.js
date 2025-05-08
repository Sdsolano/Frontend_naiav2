import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    port:3000,
    open:true,
    hmr: {
      // Usar HTTP polling si WebSocket falla
      clientPort: 3000,
      host: 'localhost',
      protocol: 'ws',
      timeout: 10000,
      overlay: false
    }
  }
})
