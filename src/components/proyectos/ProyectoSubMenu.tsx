// ===================================================
// 📁 Archivo: ProyectoSubMenu.tsx
// 📌 Ubicación: src/components/proyectos/ProyectoSubMenu.tsx
// 🔧 Descripción: Submenú de navegación entre secciones del proyecto
//
// 🧠 Uso: Utilizado por layout.tsx en /proyectos/[id] como cliente
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-08-14
// ===================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  Package, 
  List, 
  Layers,
  GitCompare, 
  ShoppingCart, 
  FileText, 
  DollarSign, 
  Clock,
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import clsx from 'clsx'

interface Props {
  proyectoId: string
}

const subMenu = [
  { 
    label: 'Proyecto', 
    path: '', 
    icon: Home,
    description: 'Vista general del proyecto',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  { 
    label: 'Equipos', 
    path: 'equipos', 
    icon: Package,
    description: 'Gestión de equipos técnicos',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  { 
    label: 'Listas', 
    path: 'equipos/listas', 
    icon: List,
    description: 'Gestión de listas de equipos',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  { 
    label: 'Comparación', 
    path: 'equipos/comparacion', 
    icon: GitCompare,
    description: 'Comparar cotizaciones',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  { 
    label: 'Pedidos', 
    path: 'equipos/pedidos', 
    icon: ShoppingCart,
    description: 'Gestión de pedidos',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  { 
    label: 'Requerimientos', 
    path: 'requerimientos', 
    icon: FileText,
    description: 'Documentos y especificaciones',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200'
  },
  { 
    label: 'Horas Hombre', 
    path: 'gestion/horas', 
    icon: Clock,
    description: 'Registro de tiempo',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
]



export default function ProyectoSubMenu({ proyectoId }: Props) {
  const currentPath = usePathname()
  const basePath = `/proyectos/${proyectoId}`

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-white via-gray-50/50 to-white border-b border-gray-200/60 shadow-sm"
    >
      {/* Header Section */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Home size={16} className="text-gray-400" />
              <span>Proyecto</span>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="font-medium text-gray-800">Navegación</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {subMenu.length} secciones
            </Badge>
          </div>
        </div>
        
        <Separator className="bg-gray-200/60" />
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 pb-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {subMenu.map((item, index) => {
            const href = `${basePath}/${item.path}`
            const isActive = currentPath === href
            const Icon = item.icon
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative flex-shrink-0"
              >
                <Link
                  href={href}
                  className={clsx(
                    'group relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-fit',
                    'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                    isActive
                      ? `${item.color} ${item.bgColor} shadow-md border ${item.borderColor} font-semibold`
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-transparent'
                  )}
                  title={item.description}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className={clsx(
                        'absolute inset-0 rounded-lg border-2',
                        item.borderColor.replace('border-', 'border-')
                      )}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  <Icon 
                    size={16} 
                    className={clsx(
                      'transition-colors flex-shrink-0',
                      isActive ? item.color : 'text-gray-500 group-hover:text-gray-700'
                    )} 
                  />
                  
                  <span className="truncate">{item.label}</span>
                  
                  {/* Hover effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 rounded-lg"
                    transition={{ duration: 0.3 }}
                  />
                </Link>
                
                {/* Tooltip on hover */}
                <AnimatePresence>
                  <motion.div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 0, y: -5 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.description}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-800" />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
      
      {/* Bottom gradient effect */}
      <div className="h-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20" />
    </motion.div>
  )
}
