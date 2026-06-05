import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Poloduf Fishing',
        short_name: 'Fishing',
        description: 'Prévisions pêche — marées, lune, solunaire',
        theme_color: '#080f1e',
        background_color: '#050d1a',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'fr',
        start_url: '/',
        icons: [
          { src:'icons/icon-192.png', sizes:'192x192', type:'image/png' },
          { src:'icons/icon-512.png', sizes:'512x512', type:'image/png' },
          { src:'icons/icon-maskable-512.png', sizes:'512x512', type:'image/png', purpose:'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        runtimeCaching: [
          { urlPattern:/^https:\/\/api\.open-meteo\.com\/.*/i,         handler:'NetworkFirst', options:{ cacheName:'openmeteo',   expiration:{ maxAgeSeconds:3600  } } },
          { urlPattern:/^https:\/\/api\.stormglass\.io\/.*/i,          handler:'NetworkFirst', options:{ cacheName:'stormglass',  expiration:{ maxAgeSeconds:21600 } } },
          { urlPattern:/^https:\/\/nominatim\.openstreetmap\.org\/.*/i,handler:'NetworkFirst', options:{ cacheName:'nominatim',   expiration:{ maxAgeSeconds:86400 } } },
        ],
      },
    }),
  ],
  server: { host:'127.0.0.1', port:5174 },
})
