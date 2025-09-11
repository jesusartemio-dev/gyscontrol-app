'use client'

// ===================================================
// 📁 Archivo: SelectorVistaComparacion.tsx
// 📌 Ubicación: src/components/proyectos/equipos/SelectorVistaComparacion.tsx
// 🔧 Descripción: Selector de vista con tabs para múltiples opciones de visualización
//
// 🎨 Mejoras UX/UI aplicadas:
// - Tabs interactivos con animaciones
// - Iconografía descriptiva
// - Estados hover y active
// - Diseño responsivo
// ===================================================

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LayoutGrid,
  Table,
  BarChart3,
  GitCompare,
  Clock,
  List,
  DollarSign,
  Eye
} from 'lucide-react'

// 🎯 Tipos de vista disponibles
export type TipoVista = 
  | 'lado-a-lado'
  | 'tabla-dual'
  | 'matriz'
  | 'dashboard'
  | 'timeline'
  | 'lista-compacta'
  | 'impacto-financiero'

// 📊 Configuración de vistas
const VISTAS_CONFIG = {
  'lado-a-lado': {
    label: 'Lado a Lado',
    description: 'Vista actual con cards comparativos',
    icon: GitCompare,
    color: 'blue'
  },
  'tabla-dual': {
    label: 'Tabla Dual',
    description: 'Comparación en formato tabla',
    icon: Table,
    color: 'green'
  },
  'matriz': {
    label: 'Matriz',
    description: 'Grid responsivo con detalles',
    icon: LayoutGrid,
    color: 'purple'
  },
  'dashboard': {
    label: 'Dashboard',
    description: 'Análisis con gráficos y métricas',
    icon: BarChart3,
    color: 'orange'
  },
  'timeline': {
    label: 'Timeline',
    description: 'Flujo temporal de cambios',
    icon: Clock,
    color: 'indigo'
  },
  'lista-compacta': {
    label: 'Lista Compacta',
    description: 'Vista condensada con filtros',
    icon: List,
    color: 'gray'
  },
  'impacto-financiero': {
    label: 'Impacto Financiero',
    description: 'Visualización de costos y diferencias',
    icon: DollarSign,
    color: 'emerald'
  }
} as const

interface Props {
  vistaActual: TipoVista
  onCambiarVista: (vista: TipoVista) => void
  totalComparaciones: number
  className?: string
}

// 🎨 Función para obtener colores según el tipo
const getColorClasses = (color: string, isActive: boolean) => {
  const colors = {
    blue: isActive 
      ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-blue-100' 
      : 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
    green: isActive 
      ? 'bg-green-100 text-green-700 border-green-300 shadow-green-100' 
      : 'hover:bg-green-50 hover:text-green-600 hover:border-green-200',
    purple: isActive 
      ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-purple-100' 
      : 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200',
    orange: isActive 
      ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-orange-100' 
      : 'hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200',
    indigo: isActive 
      ? 'bg-indigo-100 text-indigo-700 border-indigo-300 shadow-indigo-100' 
      : 'hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200',
    gray: isActive 
      ? 'bg-gray-100 text-gray-700 border-gray-300 shadow-gray-100' 
      : 'hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200',
    emerald: isActive 
      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-emerald-100' 
      : 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
  }
  return colors[color as keyof typeof colors] || colors.gray
}

const SelectorVistaComparacion = memo(function SelectorVistaComparacion({
  vistaActual,
  onCambiarVista,
  totalComparaciones,
  className = ''
}: Props) {
  return (
    <Card className={`border-0 shadow-md bg-white/80 backdrop-blur-sm ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Opciones de Visualización
            </h3>
            <Badge variant="outline" className="ml-2">
              {totalComparaciones} items
            </Badge>
          </div>
        </div>

        {/* 📱 Vista móvil - Dropdown */}
        <div className="block md:hidden mb-4">
          <select
            value={vistaActual}
            onChange={(e) => onCambiarVista(e.target.value as TipoVista)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
          >
            {Object.entries(VISTAS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label} - {config.description}
              </option>
            ))}
          </select>
        </div>

        {/* 🖥️ Vista desktop - Tabs */}
        <div className="hidden md:block">
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {Object.entries(VISTAS_CONFIG).map(([key, config]) => {
              const isActive = vistaActual === key
              const Icon = config.icon
              
              return (
                <motion.div
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant={isActive ? "default" : "outline"}
                    onClick={() => onCambiarVista(key as TipoVista)}
                    className={`
                      w-full h-auto min-h-[80px] p-2 flex flex-col items-center justify-start 
                      transition-all duration-200 border-2
                      ${isActive 
                        ? getColorClasses(config.color, true) + ' shadow-lg transform scale-105'
                        : getColorClasses(config.color, false) + ' bg-white border-gray-200 text-gray-600'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mb-1 flex-shrink-0" />
                    <div className="text-center space-y-1">
                      <div className="text-xs font-medium leading-tight">
                        {config.label}
                      </div>
                      <div className="text-xs opacity-75 leading-tight px-1">
                        {config.description}
                      </div>
                    </div>
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* 📊 Información adicional */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Vista actual: <span className="font-medium text-gray-900">
                {VISTAS_CONFIG[vistaActual].label}
              </span>
            </span>
            <span className="text-gray-500">
              {VISTAS_CONFIG[vistaActual].description}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default SelectorVistaComparacion

// 🎯 Export tipos para uso en otros componentes
export { VISTAS_CONFIG }
