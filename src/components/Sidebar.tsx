'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import { useState } from 'react'
import Image from 'next/image'
import LogoutButton from './LogoutButton'

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    configuracion: true,
    admin: true,
    catalogo: true,
    plantillas: true,
    cotizaciones: true,
    proyectos: true,
    logistica: true,
  })

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  const configuracionLinks = [
    { href: '/comercial/clientes', label: '👥 Clientes' },
    { href: '/admin/usuarios', label: '👤 Usuarios' },
  ]

  const catalogoLinks = [
    { href: '/catalogo/equipos', label: '🛠 Catálogo Equipos' },
    { href: '/catalogo/servicios', label: '🔧 Catálogo Servicios' },
    { href: '/catalogo/categorias-equipo', label: '📁 Categorías Equipo' },
    { href: '/catalogo/categorias-servicio', label: '📂 Categorías Servicio' },
    //{ href: '/catalogo/niveles-servicio', label: '📊 Niveles Servicio' },
    { href: '/catalogo/unidades', label: '📏 Unidades' },
    { href: '/catalogo/unidades-servicio', label: '📏 Unidades Servicio' },
    { href: '/catalogo/recursos', label: '🛠️ Recursos' },
  ]

  const plantillasLinks = [
    { href: '/comercial/dashboard', label: '📊 Dashboard' },
    { href: '/comercial/plantillas', label: '📦 Plantillas' },
  ]

  const cotizacionesLinks = [
    { href: '/comercial/cotizaciones', label: '🧾 Cotizaciones' },
  ]

  const proyectosLinks = [
    { href: '/proyectos', label: '📁 Proyectos' },
  ]

  const logisticaLinks = [
    { href: '/logistica', label: '🚚 Logística' },
  ]

  const adminLinks = [
    { href: '/admin/usuarios', label: '👤 Usuarios' },
  ]

  let links: {
    [key: string]: { href: string; label: string }[]
  } = {}

  if (session?.user.role === 'admin') {
    links = {
      configuracion: configuracionLinks,
      admin: adminLinks,
      catalogo: catalogoLinks,
      plantillas: plantillasLinks,
      cotizaciones: cotizacionesLinks,
      proyectos: proyectosLinks,
      logistica: logisticaLinks,
    }
  } else if (session?.user.role === 'comercial') {
    links = {
      configuracion: configuracionLinks,
      catalogo: catalogoLinks,
      plantillas: plantillasLinks,
      cotizaciones: cotizacionesLinks,
    }
  } else if (session?.user.role === 'proyectos') {
    links = {
      configuracion: configuracionLinks,
      proyectos: proyectosLinks,
    }
  } else if (session?.user.role === 'logistica') {
    links = {
      configuracion: configuracionLinks,
      logistica: logisticaLinks,
    }
  }

  const renderSection = (
    key: string,
    title: string,
    sectionLinks: { href: string; label: string }[]
  ) => (
    <div className="mb-4" key={key}>
      <button
        onClick={() => toggleSection(key)}
        className="text-xs uppercase text-gray-400 mb-1 flex items-center justify-between w-full hover:text-white"
      >
        {title}
        <span>{openSections[key] ? '−' : '+'}</span>
      </button>

      {openSections[key] && (
        <div className="flex flex-col gap-1">
          {sectionLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 transition',
                pathname.startsWith(link.href) &&
                  'bg-gray-700 text-white font-semibold'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col h-screen">
      <div className="p-4 border-b border-gray-700 flex flex-col items-center">
        <Image
          src="/logo.png"
          alt="Logo GyS"
          width={160}
          height={50}
          className="mb-2"
        />
        {session?.user && (
          <div className="text-center">
            <p className="text-xs text-gray-400">Bienvenido,</p>
            <p className="text-sm font-semibold">{session.user.name}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-3">
        {links.configuracion && renderSection('configuracion', 'Configuración', links.configuracion)}
        {links.admin && renderSection('admin', 'Administración', links.admin)}
        {links.catalogo && renderSection('catalogo', 'Catálogo', links.catalogo)}
        {links.plantillas && renderSection('plantillas', 'Plantillas', links.plantillas)}
        {links.cotizaciones && renderSection('cotizaciones', 'Cotizaciones', links.cotizaciones)}
        {links.proyectos && renderSection('proyectos', 'Proyectos', links.proyectos)}
        {links.logistica && renderSection('logistica', 'Logística', links.logistica)}
      </nav>

      <div className="p-4 border-t border-gray-700">
        {session?.user && (
          <LogoutButton className="bg-white text-gray-800 w-full py-2 rounded text-sm hover:bg-gray-100 flex justify-center items-center gap-2" />
        )}
      </div>
    </aside>
  )
}
