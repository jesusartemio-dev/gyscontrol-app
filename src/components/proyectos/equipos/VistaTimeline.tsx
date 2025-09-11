'use client'

// ===================================================
// 📁 Archivo: VistaTimeline.tsx
// 📌 Ubicación: src/components/proyectos/equipos/VistaTimeline.tsx
// 🔧 Descripción: Vista de timeline para mostrar evolución de cambios
//
// 🎨 Mejoras UX/UI aplicadas:
// - Timeline vertical con línea conectora
// - Cards diferenciadas por tipo de cambio
// - Animaciones de entrada escalonadas
// - Iconos contextuales y badges informativos
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
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckCircle,
  ArrowLeftRight,
  Plus,
  Trash2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Package,
  DollarSign,
  Calendar,
  User,
  FileText,
  Target
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



// 🎯 Función para obtener configuración por tipo
const getTypeConfig = (type: ComparisonData['type']) => {
  switch (type) {
    case 'mantenido':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        badgeVariant: 'default' as const,
        title: 'Mantenido',
        description: 'Item conservado sin cambios'
      }
    case 'reemplazado':
      return {
        icon: ArrowLeftRight,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeVariant: 'secondary' as const,
        title: 'Reemplazado',
        description: 'Item sustituido por alternativa'
      }
    case 'agregado':
      return {
        icon: Plus,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        badgeVariant: 'outline' as const,
        title: 'Agregado',
        description: 'Nuevo item incorporado'
      }
    case 'descartado':
      return {
        icon: Trash2,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        badgeVariant: 'destructive' as const,
        title: 'Descartado',
        description: 'Item removido del proyecto'
      }
    default:
      return {
        icon: Minus,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeVariant: 'outline' as const,
        title: 'No Incluido',
        description: 'Item no considerado'
      }
  }
}

// 📊 Función para agrupar por tipo y ordenar
const groupAndSortComparisons = (comparisons: ComparisonData[]) => {
  // Agrupar por tipo
  const grouped = comparisons.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = []
    }
    acc[item.type].push(item)
    return acc
  }, {} as Record<string, ComparisonData[]>)

  // Ordenar por impacto financiero dentro de cada grupo
  Object.keys(grouped).forEach(type => {
    grouped[type].sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia))
  })

  // Orden de prioridad para mostrar
  const typeOrder = ['reemplazado', 'agregado', 'descartado', 'mantenido', 'no_incluido']
  
  return typeOrder.reduce((acc, type) => {
    if (grouped[type]) {
      acc.push(...grouped[type])
    }
    return acc
  }, [] as ComparisonData[])
}

// 🎯 Componente de item del timeline
const TimelineItem = ({ item, index, isLast }: { item: ComparisonData; index: number; isLast: boolean }) => {
  const config = getTypeConfig(item.type)
  const Icon = config.icon
  
  return (
    <motion.div
      variants={staggerItemVariants}
      className="relative flex items-start space-x-4 pb-8"
    >
      {/* Línea conectora */}
      {!isLast && (
        <div className="absolute left-6 top-12 w-0.5 h-full bg-gradient-to-b from-gray-300 to-gray-100" />
      )}
      
      {/* Icono del timeline */}
      <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${config.bgColor} ${config.borderColor} border-2 shadow-sm`}>
        <Icon className={`h-6 w-6 ${config.color}`} />
      </div>
      
      {/* Contenido del item */}
      <div className="flex-1 min-w-0">
        <Card className={`${config.bgColor} ${config.borderColor} border shadow-sm hover:shadow-md transition-shadow duration-200`}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant={config.badgeVariant as "default" | "secondary" | "outline"} className="text-xs">
                    {config.title}
                  </Badge>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <h3 className="font-semibold text-gray-900 truncate">
                  {item.pei?.descripcion || item.lei?.descripcion || 'Sin descripción'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{config.description}</p>
              </div>
              
              {/* Impacto financiero */}
              <div className="text-right ml-4">
                <div className={`flex items-center space-x-1 ${
                  item.diferencia > 0 ? 'text-red-600' : 
                  item.diferencia < 0 ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {item.diferencia > 0 && <TrendingUp className="h-4 w-4" />}
                  {item.diferencia < 0 && <TrendingDown className="h-4 w-4" />}
                  {item.diferencia === 0 && <Minus className="h-4 w-4" />}
                  <span className="font-semibold text-sm">
                    {item.diferencia !== 0 && (item.diferencia > 0 ? '+' : '')}
                    {formatCurrency(item.diferencia)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Impacto</p>
              </div>
            </div>
            
            {/* Detalles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Información del item */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>Categoría: {item.category}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Target className="h-4 w-4" />
                  <span>Grupo: {item.grupo}</span>
                </div>
                {item.pei?.codigo && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>Código: {item.pei.codigo}</span>
                  </div>
                )}
              </div>
              
              {/* Costos */}
              <div className="space-y-2">
                {item.costoPEI > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Comercial:</span>
                    <span className="font-medium">{formatCurrency(item.costoPEI)}</span>
                  </div>
                )}
                {item.costoLEI > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Proyectos:</span>
                    <span className="font-medium">{formatCurrency(item.costoLEI)}</span>
                  </div>
                )}
                {item.type === 'reemplazado' && item.trazabilidad && (
                  <div className="mt-2 p-2 bg-white/50 rounded border">
                    <p className="text-xs text-gray-600 mb-1">Motivo del reemplazo:</p>
                    <p className="text-xs font-medium">{item.trazabilidad.motivo}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Estado */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>Estado: {item.estado}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
  }
  
  const VistaTimeline = memo(function VistaTimeline({ comparisons, summary, className = '' }: Props) {
  // 📱 Responsive hooks
  const isMobile = useIsMobile()
  const isTouchDevice = useIsTouchDevice()
  const touchButtonClasses = isTouchDevice ? touchInteractions.button.touch : touchInteractions.button.desktop
  const containerSpacing = getResponsiveClasses({
    xs: 'space-y-4',
    md: 'space-y-6'
  })
  const gridClasses = getResponsiveClasses({
    xs: 'grid-cols-1 gap-4',
    md: 'grid-cols-2 gap-6',
    lg: 'grid-cols-3 gap-6'
  })
  
  const groupedData = useMemo(() => groupAndSortComparisons(comparisons), [comparisons])
  
  // 📊 Estadísticas rápidas
  const stats = {
    total: comparisons.length,
    mantenidos: comparisons.filter(c => c.type === 'mantenido').length,
    reemplazados: comparisons.filter(c => c.type === 'reemplazado').length,
    agregados: comparisons.filter(c => c.type === 'agregado').length,
    descartados: comparisons.filter(c => c.type === 'descartado').length,
    impactoTotal: comparisons.reduce((sum, c) => sum + c.diferencia, 0)
  }

  return (
    <motion.div
      className={`space-y ${containerSpacing} ${className}`}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 📊 Header con estadísticas */}
      <motion.div variants={staggerItemVariants}>
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Timeline de Cambios</h2>
                <p className="text-gray-600">Evolución cronológica de las modificaciones en equipos</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  stats.impactoTotal >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {stats.impactoTotal >= 0 ? '+' : ''}{formatCurrency(stats.impactoTotal)}
                </div>
                <p className="text-sm text-gray-600">Impacto Total</p>
              </div>
            </div>
            
            {/* Estadísticas rápidas */}
            <div className={`grid ${gridClasses}`}>
              <div className="text-center p-3 bg-white/60 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-700">{stats.mantenidos}</div>
                <div className="text-xs text-green-600">Mantenidos</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-700">{stats.reemplazados}</div>
                <div className="text-xs text-blue-600">Reemplazados</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-700">{stats.agregados}</div>
                <div className="text-xs text-purple-600">Agregados</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-700">{stats.descartados}</div>
                <div className="text-xs text-red-600">Descartados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 📅 Timeline */}
      <motion.div variants={staggerItemVariants}>
        <div className="relative">
          {groupedData.length > 0 ? (
            <div className="space-y-0">
              {groupedData.map((item, index) => (
                <TimelineItem
                  key={`${item.type}-${item.pei?.id || item.lei?.id || index}`}
                  item={item}
                  index={index}
                  isLast={index === groupedData.length - 1}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cambios para mostrar</h3>
                <p className="text-gray-600">No se encontraron comparaciones para visualizar en el timeline.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
})

export default VistaTimeline
