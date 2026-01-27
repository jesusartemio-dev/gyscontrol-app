import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@react-pdf/renderer'],
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // 🔧 React 19 compatibility: Disable StrictMode in development to prevent duplicate key warnings
  reactStrictMode: process.env.NODE_ENV !== 'development',
  
  // 🚀 Fase 3: Bundle Optimization & Code Splitting
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'lucide-react', 'framer-motion'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // 📦 Webpack optimizations for code splitting
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    //  Code splitting por funcionalidad
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // 📊 Chunk para aprovisionamiento
          aprovisionamiento: {
            name: 'aprovisionamiento',
            test: /[\/\\]src[\/\\](components|lib|types)[\/\\](aprovisionamiento|proyectos)[\/\\]/,
            chunks: 'all',
            priority: 30,
            minSize: 20000,
          },
          // 📈 Chunk para reportes y analytics
          reportes: {
            name: 'reportes',
            test: /[\/\\]src[\/\\](components|lib)[\/\\](reportes|analytics|charts)[\/\\]/,
            chunks: 'all',
            priority: 25,
            minSize: 15000,
          },
          // ⚙️ Chunk para configuración y admin
          configuracion: {
            name: 'configuracion',
            test: /[\/\\]src[\/\\](components|lib)[\/\\](admin|configuracion|settings)[\/\\]/,
            chunks: 'all',
            priority: 20,
            minSize: 10000,
          },
          // 🎨 Chunk para UI components
          ui: {
            name: 'ui-components',
            test: /[\/\\]src[\/\\]components[\/\\]ui[\/\\]/,
            chunks: 'all',
            priority: 15,
            minSize: 8000,
          },
          // 📚 Vendor libraries
          vendor: {
            name: 'vendor',
            test: /[\/\\]node_modules[\/\\]/,
            chunks: 'all',
            priority: 10,
            minSize: 30000,
          },
        },
      };
    }
    
    // 🖼️ Optimización de imágenes y assets
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|webp)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/images/',
            outputPath: 'static/images/',
            name: '[name].[hash].[ext]',
          },
        },
      ],
    });
    
    return config;
  },
  
  // 🖼️ Images optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
  },
  
  // 🔧 Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 🔄 Redirects para backward compatibility
  async redirects() {
    return [
      // 📋 Redirects para listas de equipos (Master-Detail migration)
      {
        source: '/proyectos/:id/equipos/lista/:listaId',
        destination: '/proyectos/:id/equipos/:listaId/detalle',
        permanent: true,
      },
      // ❌ REMOVED: Conflicting redirect that was breaking new structure
      // {
      //   source: '/proyectos/:id/equipos/listas/:listaId',
      //   destination: '/proyectos/:id/equipos/:listaId/detalle',
      //   permanent: true,
      // },
      {
        source: '/proyectos/:id/lista-equipos/:listaId',
        destination: '/proyectos/:id/equipos/:listaId/detalle',
        permanent: true,
      },
      
      // 🎯 Redirects para vistas de comparación
      {
        source: '/proyectos/:id/equipos/comparar',
        destination: '/proyectos/:id/equipos?view=comparison',
        permanent: false,
      },
      {
        source: '/proyectos/:id/equipos/dashboard',
        destination: '/proyectos/:id/equipos?view=dashboard',
        permanent: false,
      },
      
      // 📊 Redirects para reportes y análisis
      {
        source: '/proyectos/:id/equipos/reportes',
        destination: '/proyectos/:id/equipos?tab=reports',
        permanent: false,
      },
      {
        source: '/proyectos/:id/equipos/analisis',
        destination: '/proyectos/:id/equipos?tab=analytics',
        permanent: false,
      },
      
      // 🔧 Redirects para configuración y plantillas
      {
        source: '/proyectos/:id/equipos/plantillas',
        destination: '/proyectos/:id/equipos?tab=templates',
        permanent: false,
      },
      {
        source: '/proyectos/:id/equipos/configuracion',
        destination: '/proyectos/:id/equipos?tab=settings',
        permanent: false,
      },
      
      // 📱 Redirects para vistas móviles legacy
      {
        source: '/mobile/proyectos/:id/equipos/:path*',
        destination: '/proyectos/:id/equipos/:path*',
        permanent: true,
      },
      
      // 🏠 Redirect de home legacy
      {
        source: '/equipos',
        destination: '/proyectos',
        permanent: true,
      },

      // 🔄 Redirects para reorganizacion de menus (Mi Trabajo + Supervision)
      // Horas Hombre -> Mi Trabajo
      {
        source: '/horas-hombre/timesheet',
        destination: '/mi-trabajo/timesheet',
        permanent: true,
      },
      {
        source: '/horas-hombre/historial',
        destination: '/mi-trabajo/progreso',
        permanent: true,
      },
      {
        source: '/horas-hombre/registro',
        destination: '/mi-trabajo/timesheet',
        permanent: true,
      },
      {
        source: '/horas-hombre/:path*',
        destination: '/mi-trabajo/timesheet',
        permanent: true,
      },
      // Horas Hombre -> Supervision
      {
        source: '/horas-hombre/supervision',
        destination: '/supervision/equipo',
        permanent: true,
      },
      {
        source: '/horas-hombre/resumen',
        destination: '/supervision/resumen',
        permanent: true,
      },
      {
        source: '/horas-hombre/analisis-transversal',
        destination: '/supervision/analisis-edt',
        permanent: true,
      },
      {
        source: '/horas-hombre/analisis-edt',
        destination: '/supervision/analisis-edt',
        permanent: true,
      },
      // Tareas -> Mi Trabajo / Supervision
      {
        source: '/tareas/asignadas',
        destination: '/mi-trabajo/tareas',
        permanent: true,
      },
      {
        source: '/tareas/progreso',
        destination: '/mi-trabajo/progreso',
        permanent: true,
      },
      {
        source: '/tareas/equipo',
        destination: '/supervision/equipo',
        permanent: true,
      },
      // Proyectos/Tareas -> Supervision/Tareas
      {
        source: '/proyectos/tareas',
        destination: '/supervision/tareas',
        permanent: true,
      },
      {
        source: '/proyectos/tareas/:path*',
        destination: '/supervision/tareas',
        permanent: true,
      },
    ];
  },
  
  // 🔄 Rewrites para API compatibility
  async rewrites() {
    return [
      // API v1 compatibility
      {
        source: '/api/v1/listas-equipo/:path*',
        destination: '/api/listas-equipo/:path*',
      },
      {
        source: '/api/v1/proyectos/:path*',
        destination: '/api/proyectos/:path*',
      },
    ];
  },
};

export default nextConfig;
