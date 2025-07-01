// ===================================================
// 📁 Archivo: LogisticaSubMenu.tsx
// 📌 Ubicación: src/components/logistica/LogisticaSubMenu.tsx
// 🔧 Descripción: Submenú de navegación de la sección logística
//
// 🧠 Uso: Usado en layout.tsx de /logistica
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-22
// ===================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const subMenu = [
  { label: '📦 Pedidos', path: 'pedidos' },
  { label: '📋 Listas', path: 'listas' },
  { label: '🤝 Proveedores', path: 'proveedores' },
  { label: '💰 Cotizaciones', path: 'cotizaciones' },
]

export default function LogisticaSubMenu() {
  const currentPath = usePathname()
  const basePath = '/logistica'

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
