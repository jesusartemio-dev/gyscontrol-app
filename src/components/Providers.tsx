'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SidebarProvider } from '@/lib/context/SidebarContext'

// ✅ SWR configuration
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  fetcher: async (url: string) => {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!res.ok) {
      const error = new Error('An error occurred while fetching the data.')
      // Attach extra info to the error object
      ;(error as any).info = await res.json()
      ;(error as any).status = res.status
      throw error
    }
    
    return res.json()
  }
}

// 🚀 React Query configuration - Optimized for GYS Performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 📊 Cache de 10 minutos para listas (según FASE 2)
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
      // 🔄 Background refetch para datos actualizados
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      // 🎯 Retry configuration optimizada
      retry: (failureCount, error: any) => {
        // No retry en errores 4xx (client errors)
        if (error?.status >= 400 && error?.status < 500) return false
        // Max 3 retries para otros errores
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // 🔄 Invalidación automática en mutaciones
      retry: 1,
      retryDelay: 1000,
    },
  },
})

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SWRConfig value={swrConfig}>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </SWRConfig>
        {/* 🔧 React Query DevTools solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </SessionProvider>
  )
}
