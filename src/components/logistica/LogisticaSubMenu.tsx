// ===================================================
// 📁 Archivo: LogisticaSubMenu.tsx
// 📌 Ubicación: src/components/logistica/LogisticaSubMenu.tsx
// 🔧 Descripción: Submenú de navegación de la sección logística con mejoras UX/UI
//
// 🧠 Uso: Usado en layout.tsx de /logistica
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Package, FileText, Users, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import clsx from 'clsx'

const subMenu = [
  { 
    label: 'Listas', 
    path: 'listas',
    icon: FileText,
    description: 'Listas técnicas de equipos',
    color: 'text-green-600',
    hoverColor: 'hover:text-green-700'
  },
  { 
    label: 'Pedidos', 
    path: 'pedidos',
    icon: Package,
    description: 'Gestión de pedidos de equipos',
    color: 'text-blue-600',
    hoverColor: 'hover:text-blue-700'
  },
  { 
    label: 'Cotizaciones', 
    path: 'cotizaciones',
    icon: DollarSign,
    description: 'Cotizaciones de proveedores',
    color: 'text-orange-600',
    hoverColor: 'hover:text-orange-700'
  },
  { 
    label: 'Proveedores', 
    path: 'proveedores',
    icon: Users,
    description: 'Gestión de proveedores',
    color: 'text-purple-600',
    hoverColor: 'hover:text-purple-700'
  },
]

export default function LogisticaSubMenu() {
  const currentPath = usePathname()
  const basePath = '/logistica'

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/95 backdrop-blur-sm border-b border-gray-200/60 px-6 py-4 shadow-sm"
    >
      {/* Header Section */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Logística</h2>
        <p className="text-sm text-gray-600">Gestión integral de equipos y proveedores</p>
      </div>

      <Separator className="mb-4" />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 lg:gap-4">
        {subMenu.map((item, index) => {
          const href = `${basePath}/${item.path}`
          const isActive = currentPath === href
          const Icon = item.icon
          
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative"
            >
              <Link
                href={href}
                className={clsx(
                  'group relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out',
                  'hover:bg-gray-50 hover:shadow-sm',
                  isActive
                    ? `${item.color} bg-gray-50 shadow-sm border border-gray-200`
                    : `text-gray-600 ${item.hoverColor}`
                )}
                title={item.description}
              >
                <Icon className={clsx(
                  'h-4 w-4 transition-colors duration-200',
                  isActive ? item.color : 'text-gray-500 group-hover:text-current'
                )} />
                <span className="hidden sm:inline">{item.label}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={clsx(
                      'absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 rounded-full',
                      item.color.replace('text-', 'bg-')
                    )}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                {/* Hover effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.2 }}
                />
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Stats or Additional Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="mt-4 flex items-center justify-between text-xs text-gray-500"
      >
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-xs">
            Sistema Integrado
          </Badge>
          <span>Gestión completa de logística</span>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Sistema activo</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
