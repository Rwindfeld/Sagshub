// =============================================================================
// SAGSHUB FRONTEND VITE KONFIGURATION
// =============================================================================
// Denne fil konfigurerer Vite build system til React frontend applikationen og indeholder:
// - React plugin konfiguration
// - Development server indstillinger  
// - Path aliasing for clean imports
// - Proxy setup til backend API
// - Build optimization indstillinger
// =============================================================================

// Import af Vite core funktionaliteter
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// =============================================================================
// VITE KONFIGURATION
// =============================================================================
export default defineConfig({
  // =================================================================
  // PLUGINS KONFIGURATION
  // =================================================================
  plugins: [
    react()                                                   // Aktiverer React support med Fast Refresh, JSX transform, etc.
  ],
  
  // =================================================================
  // PATH ALIASING
  // =================================================================
  // Tillader clean imports som "@/components/ui/button" i stedet for "../../components/ui/button"
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),                  // @ mappes til src/ mappen
      "@shared": path.resolve(__dirname, "../shared"),        // @shared mappes til shared workspace
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  
  // =================================================================
  // DEVELOPMENT SERVER KONFIGURATION
  // =================================================================
  server: {
    host: '0.0.0.0',
    port: 5174,                                               // Frontend development server port
    strictPort: true,
    
    // Proxy konfiguration til backend API
    proxy: {
      '/api': {                                               // Alle /api requests proxies til backend
        target: 'http://localhost:3000',                     // Backend server adresse
        changeOrigin: true,                                   // Ændrer origin header til target
        secure: false,                                        // Tillader self-signed certificates i development
        rewrite: (path) => path
      }
    },
    fs: {
      allow: ['..']
    }
  },
  
  // =================================================================
  // BUILD OPTIMIZATION
  // =================================================================
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  
  build: {
    // Output konfiguration
    outDir: 'dist',                                           // Build output directory
    sourcemap: false,                                          // Source maps til debugging i production
    
    // Build performance optimization
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignorer TypeScript fejl under build
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      }
    }
  },
  
  // =================================================================
  // PREVIEW SERVER KONFIGURATION
  // =================================================================
  // Indstillinger for "npm run preview" kommando
  preview: {
    port: 4173,                                               // Preview server port
    host: true,                                               // Tillader netværksadgang
  },
  
  // =================================================================
  // ENVIRONMENT VARIABLES
  // =================================================================
  // Prefixes for environment variables der skal være tilgængelige i frontend
  envPrefix: 'VITE_',                                         // Kun VITE_ prefixed env vars er tilgængelige i browser
  
  // =================================================================
  // CSS PROCESSING
  // =================================================================
  css: {
    // PostCSS konfiguration (bruges til TailwindCSS)
    postcss: './postcss.config.cjs',                         // Reference til PostCSS konfigurationsfil
    
    // CSS modules konfiguration (hvis brugt)
    modules: {
      localsConvention: 'camelCase',                          // Konverterer CSS class names til camelCase
    },
  },
  
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  
  define: {
    // Ignorer process.env fejl
    'process.env': {}
  }
}) 