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
          <Toaster position="top-right" key="toaster-main" />
        </Providers>
      </body>
    </html>
  )
}
