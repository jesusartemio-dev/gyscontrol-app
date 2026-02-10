'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ResizableGanttBar } from './ResizableGanttBar'

interface GanttRowProps {
  item: any
  level: number
  timelineStart: Date
  timelineEnd: Date
  chartWidth: number
  y: number
  onClick?: (item: any) => void
  onDragEnd?: (item: any, newStartDate: Date, newEndDate: Date) => void
  onResizeEnd?: (item: any, newStartDate: Date, newEndDate: Date) => void
  showDependencies?: boolean
  isExpanded?: boolean
  hasChildren?: boolean
  onToggleExpand?: () => void
  showLeftColumn?: boolean
  baselineStart?: Date | null
  baselineEnd?: Date | null
}

export function GanttRow({
  item,
  level,
  timelineStart,
  timelineEnd,
  chartWidth,
  y,
  onClick,
  onDragEnd,
  onResizeEnd,
  showDependencies = true,
  isExpanded = false,
  hasChildren = false,
  onToggleExpand,
  showLeftColumn = true,
  baselineStart,
  baselineEnd
}: GanttRowProps) {
  const getLevelStyles = () => {
    const styles: Record<number, { indent: number, bg: string, border: string }> = {
      1: { indent: 0, bg: 'bg-blue-50', border: 'border-blue-200' },    // Fases
      2: { indent: 20, bg: 'bg-green-50', border: 'border-green-200' },  // EDTs
      3: { indent: 40, bg: 'bg-purple-50', border: 'border-purple-200' }, // Tareas
      4: { indent: 60, bg: 'bg-orange-50', border: 'border-orange-200' }  // Subtareas
    }
    return styles[level] || styles[3]
  }

  const styles = getLevelStyles()
  const progreso = item.porcentajeAvance || item.porcentajeCompletado || 0

  return (
    <div className={`flex border-b ${styles.bg} ${styles.border} hover:bg-opacity-75 transition-colors`}>
      {/* Columna de información */}
      {showLeftColumn && (
        <div
          className="flex items-center p-2 border-r border-gray-300 min-w-0"
          style={{ width: '350px', paddingLeft: styles.indent + 8 }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Botón expandir/colapsar */}
            {hasChildren && level < 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleExpand?.()
                }}
                className="w-4 h-4 p-0 hover:bg-gray-200"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            )}

            {/* Icono por nivel */}
            <div className={`w-4 h-4 rounded flex items-center justify-center text-xs font-bold ${level === 4 && !hasChildren ? 'opacity-50' : ''} ${
              level === 1 ? 'bg-blue-500 text-white' :
              level === 2 ? 'bg-green-500 text-white' :
              level === 3 ? 'bg-purple-500 text-white' :
              'bg-orange-500 text-white'
            }`}>
              {level === 1 ? '📁' : level === 2 ? '🔧' : level === 3 ? '✅' : '📝'}
            </div>

            {/* Nombre */}
            <span className="font-medium text-sm truncate flex-1">
              {item.nombre}
            </span>

            {/* Estado */}
            <Badge variant={
              item.estado === 'completado' || progreso >= 100 ? 'default' :
              item.estado === 'en_progreso' ? 'secondary' :
              'outline'
            } className="text-xs">
              {progreso >= 100 ? '100%' : `${progreso}%`}
            </Badge>

            {/* Responsable */}
            {item.responsable && (
              <span className="text-xs text-gray-500 truncate max-w-20">
                {item.responsable.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Área del Gantt */}
      <div className={`${showLeftColumn ? 'flex-1' : ''} relative`} style={!showLeftColumn ? { width: '100%' } : {}}>
        <ResizableGanttBar
          item={item}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          chartWidth={chartWidth}
          y={5}
          level={level}
          onResizeEnd={onResizeEnd}
          onClick={onClick}
          baselineStart={baselineStart}
          baselineEnd={baselineEnd}
        />
      </div>
    </div>
  )
}