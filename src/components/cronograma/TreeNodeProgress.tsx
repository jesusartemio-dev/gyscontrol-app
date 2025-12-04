// ===================================================
// 📁 Archivo: TreeNodeProgress.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Componente para mostrar indicador de progreso visual
// ✅ Barras de progreso, estados visuales, tooltips
// ===================================================

import React from 'react'
import { Badge } from '@/components/ui/badge'

interface TreeNodeProgressProps {
  percentage: number
  status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const STATUS_CONFIG = {
  pending: {
    color: 'bg-gray-400',
    label: 'Pendiente',
    badgeColor: 'bg-gray-100 text-gray-800'
  },
  in_progress: {
    color: 'bg-yellow-500',
    label: 'En Progreso',
    badgeColor: 'bg-yellow-100 text-yellow-800'
  },
  completed: {
    color: 'bg-green-500',
    label: 'Completado',
    badgeColor: 'bg-green-100 text-green-800'
  },
  paused: {
    color: 'bg-orange-500',
    label: 'Pausado',
    badgeColor: 'bg-orange-100 text-orange-800'
  },
  cancelled: {
    color: 'bg-red-500',
    label: 'Cancelado',
    badgeColor: 'bg-red-100 text-red-800'
  }
}

export function TreeNodeProgress({
  percentage,
  status,
  size = 'sm',
  showLabel = false
}: TreeNodeProgressProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  const sizeClasses = {
    sm: {
      container: 'h-2 w-12',
      text: 'text-xs'
    },
    md: {
      container: 'h-3 w-16',
      text: 'text-sm'
    },
    lg: {
      container: 'h-4 w-20',
      text: 'text-base'
    }
  }

  const classes = sizeClasses[size]

  return (
    <div className="flex items-center gap-2">
      {/* Barra de progreso */}
      <div
        className={`relative ${classes.container} bg-gray-200 rounded-full overflow-hidden`}
        title={`${config.label}: ${clampedPercentage}%`}
      >
        <div
          className={`absolute left-0 top-0 h-full ${config.color} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>

      {/* Porcentaje */}
      <span className={`${classes.text} font-medium text-gray-600 min-w-[2.5rem]`}>
        {clampedPercentage}%
      </span>

      {/* Badge de estado opcional */}
      {showLabel && (
        <Badge variant="outline" className={config.badgeColor}>
          {config.label}
        </Badge>
      )}
    </div>
  )
}