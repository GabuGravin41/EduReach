import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Performance-optimized Vite configuration
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
    }),
  ],
  
  // Build optimizations
  build: {
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: ['react', 'react-dom'],
          
          // UI chunk for UI components
          ui: ['@tanstack/react-query'],
          
          // Utils chunk for utilities
          utils: ['axios'],
          
          // Icons chunk (if using icon library)
          icons: ['lucide-react'],
        },
        
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `img/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    // Source maps for production debugging (optional)
    sourcemap: false, // Set to true if you need source maps in production
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000, // KB
  },
  
  // Development server optimizations
  server: {
    // Enable HMR
    hmr: true,
    
    // Proxy API requests to Django backend
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
    
    // Optimize dev server
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
  
  // Dependency optimization
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'axios',
    ],
    
    // Exclude dependencies from pre-bundling
    exclude: [
      // Large dependencies that are better loaded dynamically
    ],
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
  
  // CSS optimization
  css: {
    // Enable CSS modules
    modules: {
      localsConvention: 'camelCase',
    },
    
    // PostCSS configuration
    postcss: {
      plugins: [
        // Add autoprefixer for better browser support
        require('autoprefixer'),
        
        // Add cssnano for CSS minification in production
        ...(process.env.NODE_ENV === 'production' 
          ? [require('cssnano')({ preset: 'default' })] 
          : []
        ),
      ],
    },
  },
  
  // Environment variables
  define: {
    // Define global constants
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  
  // Performance monitoring in development
  ...(process.env.NODE_ENV === 'development' && {
    plugins: [
      react(),
      // Add bundle analyzer plugin for development
      {
        name: 'bundle-analyzer',
        generateBundle(options, bundle) {
          const bundleSize = Object.values(bundle).reduce((total, chunk) => {
            return total + (chunk.type === 'chunk' ? chunk.code.length : 0);
          }, 0);
          console.log(`Bundle size: ${(bundleSize / 1024).toFixed(2)} KB`);
        },
      },
    ],
  }),
});

// Additional package.json scripts for performance:
/*
{
  "scripts": {
    "build:analyze": "vite build && npx vite-bundle-analyzer dist",
    "build:profile": "vite build --mode production --profile",
    "preview:performance": "vite preview --port 4173",
    "test:lighthouse": "lighthouse http://localhost:4173 --output html --output-path ./lighthouse-report.html",
    "test:performance": "npm run build && npm run preview:performance"
  }
}
*/

// Performance monitoring setup:
/*
// Add to main.tsx or App.tsx:
if (process.env.NODE_ENV === 'development') {
  // Enable React DevTools Profiler
  import('./src/utils/performance-monitor').then(({ setupPerformanceMonitoring }) => {
    setupPerformanceMonitoring();
  });
}
*/
