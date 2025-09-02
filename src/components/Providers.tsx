'use client'

import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'

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

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={swrConfig}>
        {children}
      </SWRConfig>
    </SessionProvider>
  )
}
