// ===================================================
// 📁 Archivo: EquipoCardView.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Vista en Cards moderna para equipos con UX/UI mejorada
// 🎨 Características: Animaciones, estados, filtros, responsive design
// ===================================================

'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Package, 
  Calendar, 
  DollarSign, 
  Users, 
  Eye, 
  Edit, 
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MoreHorizontal,
  Star,
  Bookmark
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ListaEquipoMaster } from '@/types/master-detail'
import Link from 'next/link'

interface EquipoCardViewProps {
  listas: ListaEquipoMaster[]
  proyectoId: string
  loading?: boolean
  onItemSelect?: (listaId: string) => void
  onDelete?: (listaId: string) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  showSelection?: boolean
  className?: string
}

// ✅ Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const cardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  hover: {
    y: -4,
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
}

// ✅ Status configuration
const statusConfig = {
  borrador: {
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    label: 'Borrador'
  },
  por_revisar: {
    variant: 'outline' as const,
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Por Revisar'
  },
  por_cotizar: {
    variant: 'default' as const,
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Por Cotizar'
  },
  aprobado: {
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Aprobado'
  }
}

/**
 * Componente de vista en Cards para equipos
 * Diseño moderno con animaciones y estados visuales
 */
export function EquipoCardView({
  listas,
  proyectoId,
  loading = false,
  onItemSelect,
  onDelete,
  selectedIds = [],
  onSelectionChange,
  showSelection = false,
  className
}: EquipoCardViewProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // 🔍 Memoized calculations
  const processedListas = useMemo(() => {
    return listas.map(lista => ({
      ...lista,
      isSelected: selectedIds.includes(lista.id),
      statusConfig: statusConfig[lista.estado as keyof typeof statusConfig] || statusConfig.borrador,
      completionPercentage: Math.round((lista.stats.itemsVerificados / lista.stats.totalItems) * 100) || 0
    }))
  }, [listas, selectedIds])

  // 🔄 Handle card selection
  const handleCardSelection = (listaId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!onSelectionChange) return
    
    const newSelection = selectedIds.includes(listaId)
      ? selectedIds.filter(id => id !== listaId)
      : [...selectedIds, listaId]
    
    onSelectionChange(newSelection)
  }

  // 📊 Empty state
  if (!loading && listas.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 px-4 text-center"
      >
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Package className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No hay listas de equipos
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          Crea tu primera lista de equipos para comenzar a gestionar los elementos técnicos del proyecto.
        </p>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Package className="w-4 h-4 mr-2" />
          Crear Lista
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
        className
      )}
    >
      <AnimatePresence>
        {processedListas.map((lista) => {
          const StatusIcon = lista.statusConfig.icon
          
          return (
            <motion.div
              key={lista.id}
              variants={cardVariants}
              whileHover="hover"
              onHoverStart={() => setHoveredCard(lista.id)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300 cursor-pointer group",
                "hover:shadow-xl hover:shadow-blue-500/10 border-2",
                lista.isSelected 
                  ? "border-blue-500 bg-blue-50/50" 
                  : "border-gray-200 hover:border-blue-300",
                loading && "opacity-50 pointer-events-none"
              )}>
                {/* 🎨 Header with status and actions */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {lista.nombre}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant={lista.statusConfig.variant}
                          className={cn(
                            "text-xs font-medium",
                            lista.statusConfig.color
                          )}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {lista.statusConfig.label}
                        </Badge>
                        {/* Priority badge removed - property doesn't exist in ListaEquipoMaster */}
                      </div>
                    </div>
                    
                    {/* Selection checkbox */}
                    {showSelection && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="ml-2"
                      >
                        <input
                          type="checkbox"
                          checked={lista.isSelected}
                          onChange={(e) => handleCardSelection(lista.id, e as any)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </motion.div>
                    )}
                  </div>
                </CardHeader>

                {/* 📊 Content with metrics */}
                <CardContent className="space-y-4">
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-medium text-gray-900">
                        {lista.completionPercentage}%
                      </span>
                    </div>
                    <Progress 
                      value={lista.completionPercentage} 
                      className="h-2"
                    />
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-600">
                        <Package className="w-4 h-4 mr-1" />
                        Items
                      </div>
                      <div className="font-semibold text-gray-900">
                        {lista.stats.totalItems}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Costo
                      </div>
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(lista.stats.costoTotal || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Date info */}
                  {lista.createdAt && (
                    <div className="flex items-center text-xs text-gray-500 pt-2 border-t">
                      <Calendar className="w-3 h-3 mr-1" />
                      Creado: {formatDate(lista.createdAt)}
                    </div>
                  )}

                  {/* Action buttons */}
                  <motion.div 
                    className="flex gap-2 pt-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: hoveredCard === lista.id ? 1 : 0,
                      y: hoveredCard === lista.id ? 0 : 10
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            onItemSelect?.(lista.id)
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver detalles de la lista</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle edit action
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar lista</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {onDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(lista.id)
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Eliminar lista</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </motion.div>
                </CardContent>

                {/* 🎨 Hover overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredCard === lista.id ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}

export default EquipoCardView
