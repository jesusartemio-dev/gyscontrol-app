import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@react-pdf/renderer'],
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // 🔧 React 19 compatibility: Disable StrictMode in development to prevent duplicate key warnings
  reactStrictMode: process.env.NODE_ENV !== 'development',
  
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
