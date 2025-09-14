/**
 * 🚀 React Query Provider - FASE 2 Performance Optimization
 * 
 * Configuración centralizada de React Query con:
 * - Cache inteligente con TTL optimizado
 * - Invalidación automática
 * - Background refetch
 * - Error handling global
 * - DevTools en desarrollo
 * 
 * @author GYS Team
 * @version 2.0.0 - Performance Optimized
 */

'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { toast } from 'sonner';

// 🎯 Configuración optimizada de React Query
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 🚀 Cache inteligente - 10 minutos por defecto
        staleTime: 10 * 60 * 1000, // 10 minutos
        gcTime: 15 * 60 * 1000, // 15 minutos (antes cacheTime)
        
        // 🔄 Background refetch optimizado
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        
        // 🎯 Retry inteligente
        retry: (failureCount, error: any) => {
          // No retry en errores 4xx (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // Máximo 3 reintentos para errores de red/servidor
          return failureCount < 3;
        },
        
        // ⏱️ Timeout configurado
        networkMode: 'online',
      },
      mutations: {
        // 🎯 Error handling global para mutaciones
        onError: (error: any) => {
          console.error('Mutation error:', error);
          
          // Mostrar toast de error personalizado
          const message = error?.message || 'Error en la operación';
          toast.error(message);
        },
        
        // 🔄 Retry para mutaciones críticas
        retry: (failureCount, error: any) => {
          // Solo retry en errores de red (5xx)
          if (error?.status >= 500) {
            return failureCount < 2;
          }
          return false;
        },
      },
    },
  });
};

// 🎯 Singleton QueryClient para evitar recreación
let queryClient: QueryClient | undefined;

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: siempre crear nuevo cliente
    return createQueryClient();
  } else {
    // Browser: reutilizar cliente existente
    if (!queryClient) {
      queryClient = createQueryClient();
    }
    return queryClient;
  }
};

// 🚀 Provider component
interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const client = getQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* 🛠️ DevTools solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  );
};

// 🎯 Hook para acceder al QueryClient
export const useQueryClient = () => {
  const client = getQueryClient();
  return client;
};

// 🔧 Utilidades de invalidación
export const invalidateQueries = {
  // Invalidar todas las listas de equipo
  listasEquipo: (client: QueryClient) => {
    client.invalidateQueries({ queryKey: ['listas-equipo'] });
  },
  
  // Invalidar pedidos de equipo
  pedidosEquipo: (client: QueryClient) => {
    client.invalidateQueries({ queryKey: ['pedidos-equipo'] });
  },
  
  // Invalidar proyectos
  proyectos: (client: QueryClient) => {
    client.invalidateQueries({ queryKey: ['proyectos'] });
  },
  
  // Invalidar proveedores
  proveedores: (client: QueryClient) => {
    client.invalidateQueries({ queryKey: ['proveedores'] });
  },
  
  // Invalidar todo el aprovisionamiento
  aprovisionamiento: (client: QueryClient) => {
    client.invalidateQueries({ queryKey: ['aprovisionamiento'] });
  },
};

// 🎯 Prefetch utilities
export const prefetchQueries = {
  // Prefetch listas frecuentes
  listasEquipoFrecuentes: async (client: QueryClient) => {
    await client.prefetchQuery({
      queryKey: ['listas-equipo', 'frecuentes'],
      queryFn: () => fetch('/api/listas-equipo?frecuentes=true').then(res => res.json()),
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  },
  
  // Prefetch proyectos activos
  proyectosActivos: async (client: QueryClient) => {
    await client.prefetchQuery({
      queryKey: ['proyectos', 'activos'],
      queryFn: () => fetch('/api/proyectos?estado=activo').then(res => res.json()),
      staleTime: 10 * 60 * 1000, // 10 minutos
    });
  },
};

export default QueryProvider;