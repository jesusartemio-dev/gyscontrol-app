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
    <html lang="es">
      <body className="flex h-screen bg-gray-100 text-gray-800">
        <Providers>
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
