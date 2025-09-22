import React from 'react'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { Toaster } from 'react-hot-toast'
import Providers from '@/components/Providers'

export const metadata = {
  title: 'Sistema GYS',
  description: 'Gestión de proyectos: Comercial, Proyectos y Logística',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        {/* ✅ Fuentes optimizadas para mejor performance */}
        {/* Fuentes externas removidas para evitar conflictos con react-pdf */}
      </head>
      <body className="h-full bg-gray-100 text-gray-800 overflow-hidden">
        <Providers>
          <div className="flex h-full">
            <Sidebar key="sidebar-main" />
            <main className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth" key="main-content">
              <div className="p-6">
                {children}
              </div>
            </main>
          </div>
          <Toaster 
            position="top-right" 
            key="toaster-main"
            toastOptions={{
              duration: 6000,
              style: {
                background: '#363636',
                color: '#fff',
                fontSize: '14px',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                maxWidth: '400px'
              },
              success: {
                duration: 4000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff'
                }
              },
              error: {
                duration: 8000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff'
                }
              }
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
