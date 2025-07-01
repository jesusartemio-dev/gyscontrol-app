'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import LogoutButton from './LogoutButton'
import type { RolUsuario } from '@/types/modelos'

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    configuracion: true,
    comercial: true,
    proyectos: true,
    logistica: true,
    gestion: true,
  })

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  const toggleSidebar = () => setCollapsed((prev) => !prev)

  const allSections = [
    {
      key: 'configuracion',
      title: '⚙️ Configuración',
      roles: ['admin', 'gerente'],
      links: [
        { href: '/admin/usuarios', label: '👤 Usuarios' },
        { href: '/comercial/clientes', label: '👥 Clientes' },
        { href: '/catalogo/equipos', label: '🛠 Catálogo Equipos' },
        { href: '/catalogo/servicios', label: '🔧 Catálogo Servicios' },
        { href: '/catalogo/categorias-equipo', label: '📁 Categorías Equipo' },
        { href: '/catalogo/categorias-servicio', label: '📂 Categorías Servicio' },
        { href: '/catalogo/unidades', label: '📏 Unidades' },
        { href: '/catalogo/unidades-servicio', label: '📏 Unidades Servicio' },
        { href: '/catalogo/recursos', label: '🛠️ Recursos' },
      ],
    },
    {
      key: 'comercial',
      title: '📦 Comercial',
      roles: ['admin', 'gerente', 'comercial', 'presupuestos'],
      links: [
        { href: '/comercial/plantillas', label: '📦 Plantillas' },
        { href: '/comercial/cotizaciones', label: '🧾 Cotizaciones' },
      ],
    },
    {
      key: 'proyectos',
      title: '📁 Proyectos',
      roles: ['admin', 'gerente', 'proyectos', 'coordinador', 'gestor'],
      links: [{ href: '/proyectos', label: '📁 Ver Proyectos' }],
    },
    {
      key: 'logistica',
      title: '🚚 Logística',
      roles: ['admin', 'gerente', 'logistico'],
      links: [
        { href: '/logistica', label: '🚚 Panel Logística' },
        { href: '/logistica/catalogo', label: '🛠 Catálogo Equipos' },
      ],
    },
    {
      key: 'gestion',
      title: '📊 Gestión',
      roles: ['admin', 'gerente', 'gestor'],
      links: [
        { href: '/gestion/valorizaciones', label: '💰 Valorizaciones' },
        { href: '/gestion/reportes', label: '📈 Reportes' },
        { href: '/gestion/indicadores', label: '📊 Indicadores' },
      ],
    },
  ]

  const role = session?.user.role as RolUsuario | undefined

  const visibleSections = allSections.filter((section) =>
    role ? section.roles.includes(role) : false
  )

  return (
    <aside className={clsx(
      'bg-gray-900 text-white h-screen transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        {!collapsed && (
          <Image
            src="/logo.png"
            alt="Logo GyS"
            width={160}
            height={50}
            className="mb-2"
          />
        )}
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-white">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* User */}
      {!collapsed && session?.user && (
        <div className="px-4 text-center mt-2">
          <p className="text-xs text-gray-400">Bienvenido,</p>
          <p className="text-sm font-semibold">{session.user.name}</p>
        </div>
      )}

      {/* Menú */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {visibleSections.map(section => (
          <div key={section.key} className="mb-4">
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.key)}
                className="text-xs uppercase text-gray-400 mb-1 flex items-center justify-between w-full hover:text-white"
              >
                {section.title}
                <span>{openSections[section.key] ? '−' : '+'}</span>
              </button>
            )}

            {(openSections[section.key] || collapsed) && (
              <div className="flex flex-col gap-1">
                {section.links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={clsx(
                      'rounded px-2 py-2 text-sm hover:bg-gray-700 transition',
                      pathname.startsWith(link.href)
                        ? 'bg-gray-700 text-white font-semibold'
                        : 'text-gray-300',
                      collapsed && 'text-center px-1'
                    )}
                    title={collapsed ? link.label : undefined}
                  >
                    {collapsed ? link.label.split(' ')[0] : link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        {session?.user && (
          <LogoutButton className="bg-white text-gray-800 w-full py-2 rounded text-sm hover:bg-gray-100 flex justify-center items-center gap-2" />
        )}
      </div>
    </aside>
  )
}
