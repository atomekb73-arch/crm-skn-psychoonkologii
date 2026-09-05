import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    build: {
      // 1. Source maps wyłączone na produkcji (brak podglądu struktury kodu w F12)
      sourcemap: false,
      emptyOutDir: true,
      // 2. Zaawansowana obfuskacja i minifikacja kodu produkcyjnego przez Terser
      minify: isProd ? 'terser' : 'esbuild',
      terserOptions: isProd ? {
        compress: {
          drop_console: true,        // usuwa wszelkie console.log z produkcji
          drop_debugger: true,       // usuwa instrukcje debugger
          pure_funcs: ['console.info', 'console.debug', 'console.warn'],
          passes: 2,                 // dwuetapowa kompresja dla maksymalnej optymalizacji
        },
        mangle: {
          toplevel: true,            // zamiana nazw zmiennych i funkcji na poziomie głównym
          eval: true,
        },
        format: {
          comments: false,           // całkowite usunięcie komentarzy i licencji z kodu
        },
      } : undefined,
    },

    server: {
      port: 5175,
      proxy: {
        '/api-teamup': {
          target: 'https://api.teamup.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-teamup/, ''),
          headers: {
            'Teamup-Token': '20dc4242d0d74be314e5ee108dc618cf3f6fbcb7647865568775fe4d9a89c112'
          }
        }
      }
    }
  }
})

