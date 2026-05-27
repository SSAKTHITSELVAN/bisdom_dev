import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'bisdomai.com',
      'www.bisdomai.com',
      'localhost',
      '.bisdomai.com',
      '3.109.70.144',  // IP address for testing
      '.compute.amazonaws.com'  // AWS hostname
    ]
  }
})
