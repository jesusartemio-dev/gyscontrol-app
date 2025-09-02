'use client'

// ===================================================
// 📁 Archivo: VistaMatriz.tsx
// 📌 Ubicación: src/components/proyectos/equipos/VistaMatriz.tsx
// 🔧 Descripción: Vista de matriz con grid responsivo para comparación de equipos
//
// 🎨 Mejoras UX/UI aplicadas:
// - Grid responsivo adaptativo
// - Cards compactos con información clave
// - Colores diferenciados por estado
// - Animaciones staggered
// ===================================================

import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  staggerContainerVariants,
  staggerItemVariants 
} from '@/lib/animations/masterDetailAnimations'
import { 
  useIsMobile,
  useIsTouchDevice,
  touchInteractions,
  getResponsiveClasses
} from '@/lib/responsive/breakpoints'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowRight,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Package,
  DollarSign,
  Building,
  Hash
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { ProyectoEquipoItem, ListaEquipoItem } from '@/types'

// 🎯 Tipos para el componente
interface ComparisonData {
  type: 'mantenido' | 'reemplazado' | 'agregado' | 'descartado' | 'no_incluido'
  category: string
  pei: ProyectoEquipoItem | null
  lei: ListaEquipoItem | null
  grupo: string
  costoPEI: number
  costoLEI: number
  diferencia: number
  estado: string
  trazabilidad?: {
    original: ProyectoEquipoItem
    reemplazo: ListaEquipoItem
    motivo: string
  }
}

interface Summary {
  mantenidos: number
  reemplazados: number
  agregados: number
  descartados: number
  totalItems: number
  impactoFinanciero: number
  porcentajeCambio: number
}

interface Props {
  comparisons: ComparisonData[]
  summary: Summary
  className?: string
}

// 🎨 Utilidades para estilos y colores
const getTypeConfig = (type: string) => {
  switch (type) {
    case 'mantenido': 
      return {
        color: 'border-green-200 bg-green-50 hover:bg-green-100',
        badgeColor: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        iconColor: 'text-green-600',
        label: 'Mantenido'
      }
    case 'reemplazado': 
      return {
        color: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
        badgeColor: 'bg-blue-100 text-blue-800',
        icon: ArrowLeftRight,
        iconColor: 'text-blue-600',
        label: 'Reemplazado'
      }
    case 'agregado': 
      return {
        color: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
        badgeColor: 'bg-purple-100 text-purple-800',
        icon: Package,
        iconColor: 'text-purple-600',
        label: 'Agregado'
      }
    case 'descartado': 
      return {
        color: 'border-red-200 bg-red-50 hover:bg-red-100',
        badgeColor: 'bg-red-100 text-red-800',
        icon: XCircle,
        iconColor: 'text-red-600',
        label: 'Descartado'
      }
    case 'no_incluido': 
      return {
        color: 'border-gray-200 bg-gray-50 hover:bg-gray-100',
        badgeColor: 'bg-gray-100 text-gray-800',
        icon: AlertTriangle,
        iconColor: 'text-gray-600',
        label: 'No Incluido'
      }
    default: 
      return {
        color: 'border-gray-200 bg-gray-50 hover:bg-gray-100',
        badgeColor: 'bg-gray-100 text-gray-800',
        icon: Info,
        iconColor: 'text-gray-600',
        label: 'Desconocido'
      }
  }
}

const getDifferenceDisplay = (diferencia: number) => {
  if (diferencia > 0) {
    return {
      color: 'text-red-600',
      icon: TrendingUp,
      text: `+${formatCurrency(diferencia)}`,
      bgColor: 'bg-red-50'
    }
  }
  if (diferencia < 0) {
    return {
      color: 'text-green-600',
      icon: TrendingDown,
      text: formatCurrency(diferencia),
      bgColor: 'bg-green-50'
    }
  }
  return {
    color: 'text-gray-600',
    icon: null,
    text: '±0.00',
    bgColor: 'bg-gray-50'
  }
}

// Animation variants
// ✅ Usando variantes centralizadas de animación

const VistaMatriz = memo(function VistaMatriz({ comparisons, summary, className = '' }: Props) {
  // 📱 Responsive hooks
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const containerSpacing = getResponsiveClasses({ xs: 'space-y-4', md: 'space-y-6' });
  const gridClasses = getResponsiveClasses({ xs: 'grid-cols-1 gap-3', md: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' });
  
  // 📊 Agrupar por tipo para mejor organización
  const groupedByType = useMemo(() => {
    return comparisons.reduce((acc, comparison) => {
      if (!acc[comparison.type]) {
        acc[comparison.type] = []
      }
      acc[comparison.type].push(comparison)
      return acc
    }, {} as Record<string, ComparisonData[]>)
  }, [comparisons])

  return (
    <div className={`space-y ${containerSpacing} ${className}`}>
      {Object.entries(groupedByType).map(([type, items]) => {
        const typeConfig = getTypeConfig(type)
        const Icon = typeConfig.icon
        
        return (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-5 w-5 ${typeConfig.iconColor}`} />
                    <span>{typeConfig.label}</span>
                    <Badge variant="outline" className="ml-2">
                      {items.length} items
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    Total: {formatCurrency(items.reduce((sum, item) => sum + item.diferencia, 0))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  className={`grid ${gridClasses}`}
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {items.map((comparison, index) => {
                    const { pei, lei, grupo, costoPEI, costoLEI, diferencia } = comparison
                    const differenceDisplay = getDifferenceDisplay(diferencia)
                    const DifferenceIcon = differenceDisplay.icon
                    
                    return (
                      <motion.div
                        key={`${pei?.id || 'new'}-${lei?.id || 'none'}-${index}`}
                        variants={staggerItemVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Card className={`h-full transition-all duration-200 ${typeConfig.color} border-2`}>
                          <CardContent className="p-4 space-y-3">
                            {/* Header con grupo y badge */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                <Building className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700 truncate">
                                  {grupo || 'Sin grupo'}
                                </span>
                              </div>
                              <Badge className={`${typeConfig.badgeColor} text-xs`}>
                                {typeConfig.label}
                              </Badge>
                            </div>

                            {/* Información principal */}
                            <div className="space-y-2">
                              {/* Comercial (PEI) */}
                              {pei && (
                                <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                                  <div className="flex items-center space-x-1 mb-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs font-medium text-blue-700">Comercial</span>
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                                    {pei.descripcion}
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>{pei.marca}</span>
                                    <span className="flex items-center space-x-1">
                                      <Hash className="h-3 w-3" />
                                      <span>{pei.cantidad}</span>
                                    </span>
                                  </div>
                                  {costoPEI > 0 && (
                                    <div className="mt-2 text-sm font-semibold text-blue-700">
                                      {formatCurrency(costoPEI)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Proyectos (LEI) */}
                              {lei && (
                                <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                                  <div className="flex items-center space-x-1 mb-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs font-medium text-green-700">Proyectos</span>
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                                    {lei.descripcion}
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>{lei.catalogoEquipo?.marca || 'Sin marca'}</span>
                                    <span className="flex items-center space-x-1">
                                      <Hash className="h-3 w-3" />
                                      <span>{lei.cantidad}</span>
                                    </span>
                                  </div>
                                  {costoLEI > 0 && (
                                    <div className="mt-2 text-sm font-semibold text-green-700">
                                      {formatCurrency(costoLEI)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Diferencia */}
                              {diferencia !== 0 && (
                                <div className={`rounded-lg p-3 border ${differenceDisplay.bgColor}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1">
                                      <DollarSign className="h-4 w-4 text-gray-500" />
                                      <span className="text-xs font-medium text-gray-700">Diferencia</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {DifferenceIcon && <DifferenceIcon className="h-4 w-4" />}
                                      <span className={`text-sm font-semibold ${differenceDisplay.color}`}>
                                        {differenceDisplay.text}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Footer con información adicional */}
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>ID: {pei?.id || lei?.id || 'N/A'}</span>
                                {Math.abs(diferencia) > 1000 && (
                                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                                    Alto impacto
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
})

export default VistaMatriz