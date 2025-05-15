// ===================================================
// 📁 Archivo: ProyectoSubMenu.tsx
// 📌 Ubicación: src/components/proyectos/ProyectoSubMenu.tsx
// 🔧 Descripción: Submenú de navegación entre secciones del proyecto
//
// 🧠 Uso: Utilizado por layout.tsx en /proyectos/[id] como cliente
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-14
// ===================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface Props {
  proyectoId: string
}

const subMenu = [
  { label: '📦 Equipos Técnicos', path: 'equipos' },
  { label: '📋 Listas Técnicas', path: 'equipos/lista-equipos' },
  { label: '🧾 Requerimientos', path: 'requerimientos' },
  { label: '💰 Valorizaciones', path: 'gestion/valorizaciones' },
  { label: '🕓 Horas Hombre', path: 'gestion/horas' },
]

export default function ProyectoSubMenu({ proyectoId }: Props) {
  const currentPath = usePathname()
  const basePath = `/proyectos/${proyectoId}`

  return (
    <div className="bg-white border-b px-6 pt-4">
      <div className="flex gap-4 border-b border-gray-200">
        {subMenu.map((item) => {
          const href = `${basePath}/${item.path}`
          const isActive = currentPath === href
          return (
            <Link
              key={item.path}
              href={href}
              className={clsx(
                'relative pb-2 text-sm font-medium transition-colors duration-200 ease-in-out',
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-500'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
