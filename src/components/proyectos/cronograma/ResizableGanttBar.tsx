'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'

interface ResizableGanttBarProps {
  item: any
  timelineStart: Date
  timelineEnd: Date
  chartWidth: number
  y: number
  level: number
  onResizeEnd?: (item: any, newStartDate: Date, newEndDate: Date) => void
  onClick?: (item: any) => void
  isResizing?: boolean
}

type ResizeHandle = 'start' | 'end' | null

export function ResizableGanttBar({
  item,
  timelineStart,
  timelineEnd,
  chartWidth,
  y,
  level,
  onResizeEnd,
  onClick,
  isResizing = false
}: ResizableGanttBarProps) {
  const [resizeState, setResizeState] = useState({
    isResizing: false,
    handle: null as ResizeHandle,
    startX: 0,
    originalStartDate: new Date(),
    originalEndDate: new Date()
  })

  const barRef = useRef<HTMLDivElement>(null)

  // Determinar fechas a usar
  const useRealDates = item.fechaInicioReal && item.fechaFinReal
  const startDate = new Date(useRealDates ? item.fechaInicioReal : (item.fechaInicio || item.fechaInicioPlan))
  const endDate = new Date(useRealDates ? item.fechaFinReal : (item.fechaFin || item.fechaFinPlan))
  const totalDuration = timelineEnd.getTime() - timelineStart.getTime()

  // Handlers de resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState.isResizing || !barRef.current) return

    const deltaX = e.clientX - resizeState.startX
    const pixelsPerMs = chartWidth / totalDuration
    const deltaMs = deltaX / pixelsPerMs

    let newStartDate = resizeState.originalStartDate
    let newEndDate = resizeState.originalEndDate

    if (resizeState.handle === 'start') {
      newStartDate = new Date(resizeState.originalStartDate.getTime() + deltaMs)
      // No permitir que la fecha de inicio sea posterior a la fecha de fin
      if (newStartDate >= resizeState.originalEndDate) {
        newStartDate = new Date(resizeState.originalEndDate.getTime() - (1000 * 60 * 60 * 24)) // Al menos 1 día
      }
    } else if (resizeState.handle === 'end') {
      newEndDate = new Date(resizeState.originalEndDate.getTime() + deltaMs)
      // No permitir que la fecha de fin sea anterior a la fecha de inicio
      if (newEndDate <= resizeState.originalStartDate) {
        newEndDate = new Date(resizeState.originalStartDate.getTime() + (1000 * 60 * 60 * 24)) // Al menos 1 día
      }
    }

    // Actualizar posición y ancho visual durante el resize
    const newStartOffset = newStartDate.getTime() - timelineStart.getTime()
    const newItemDuration = newEndDate.getTime() - newStartDate.getTime()
    const newX = (newStartOffset / totalDuration) * chartWidth
    const newWidth = Math.max(30, (newItemDuration / totalDuration) * chartWidth)

    barRef.current.style.left = `${newX}px`
    barRef.current.style.width = `${newWidth}px`
  }, [resizeState, chartWidth, totalDuration, timelineStart])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (resizeState.isResizing) {
      const deltaX = e.clientX - resizeState.startX
      const pixelsPerMs = chartWidth / totalDuration
      const deltaMs = deltaX / pixelsPerMs

      let newStartDate = resizeState.originalStartDate
      let newEndDate = resizeState.originalEndDate

      if (resizeState.handle === 'start') {
        newStartDate = new Date(resizeState.originalStartDate.getTime() + deltaMs)
        if (newStartDate >= resizeState.originalEndDate) {
          newStartDate = new Date(resizeState.originalEndDate.getTime() - (1000 * 60 * 60 * 24))
        }
      } else if (resizeState.handle === 'end') {
        newEndDate = new Date(resizeState.originalEndDate.getTime() + deltaMs)
        if (newEndDate <= resizeState.originalStartDate) {
          newEndDate = new Date(resizeState.originalStartDate.getTime() + (1000 * 60 * 60 * 24))
        }
      }

      onResizeEnd?.(item, newStartDate, newEndDate)
    }

    setResizeState({
      isResizing: false,
      handle: null,
      startX: 0,
      originalStartDate: new Date(),
      originalEndDate: new Date()
    })

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [resizeState, chartWidth, totalDuration, onResizeEnd, item])

  const handleMouseDown = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault()
    e.stopPropagation()

    setResizeState({
      isResizing: true,
      handle,
      startX: e.clientX,
      originalStartDate: new Date(startDate),
      originalEndDate: new Date(endDate)
    })

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [startDate, endDate])

  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null

  // Calcular posición y ancho
  const itemDuration = endDate.getTime() - startDate.getTime()
  const startOffset = startDate.getTime() - timelineStart.getTime()

  const x = (startOffset / totalDuration) * chartWidth
  const width = Math.max(30, (itemDuration / totalDuration) * chartWidth) // Mínimo 30px para handles

  // Calcular progreso
  const progreso = item.porcentajeAvance || item.porcentajeCompletado || 0
  const progressWidth = (progreso / 100) * width

  // Colores por nivel
  const getBarColor = () => {
    const baseColors: Record<number, { bg: string, progress: string, border: string, hover: string }> = {
      1: { bg: 'bg-blue-500', progress: 'bg-blue-700', border: 'border-blue-600', hover: 'hover:bg-blue-600' },
      2: { bg: 'bg-green-500', progress: 'bg-green-700', border: 'border-green-600', hover: 'hover:bg-green-600' },
      3: { bg: 'bg-purple-500', progress: 'bg-purple-700', border: 'border-purple-600', hover: 'hover:bg-purple-600' },
      4: { bg: 'bg-orange-500', progress: 'bg-orange-700', border: 'border-orange-600', hover: 'hover:bg-orange-600' }
    }
    return baseColors[level] || baseColors[3]
  }

  const colors = getBarColor()
  const isCompleted = progreso >= 100
  const isDelayed = new Date() > endDate && !isCompleted

  return (
    <div
      ref={barRef}
      className={`absolute cursor-move group ${isResizing ? 'z-50' : ''}`}
      style={{
        left: x,
        top: y,
        width: width,
        height: '24px',
        transform: isResizing ? 'scale(1.05)' : 'scale(1)'
      }}
      onClick={(e) => {
        if (!resizeState.isResizing) onClick?.(item)
      }}
    >
      {/* Barra principal */}
      <div className={`
        relative h-full rounded border-2 transition-all duration-200
        ${colors.bg} ${colors.border} ${colors.hover}
        ${isCompleted ? 'opacity-75' : ''}
        ${isDelayed ? 'ring-2 ring-red-400' : ''}
        ${isResizing ? 'shadow-2xl ring-4 ring-blue-300' : 'group-hover:shadow-lg'}
      `}>
        {/* Barra de progreso */}
        {progreso > 0 && (
          <div
            className={`h-full rounded-l ${colors.progress} transition-all duration-300`}
            style={{ width: `${progreso}%` }}
          />
        )}

        {/* Etiqueta */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white truncate px-1">
            {item.nombre}
          </span>
        </div>

        {/* Handle izquierdo (resize start) */}
        <div
          className="absolute left-0 top-0 w-3 h-full bg-white bg-opacity-30 cursor-ew-resize
                     hover:bg-opacity-50 rounded-l transition-all duration-200"
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        />

        {/* Handle derecho (resize end) */}
        <div
          className="absolute right-0 top-0 w-3 h-full bg-white bg-opacity-30 cursor-ew-resize
                     hover:bg-opacity-50 rounded-r transition-all duration-200"
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        />

        {/* Indicadores */}
        {progreso > 0 && progreso < 100 && (
          <div className="absolute -top-6 left-0 text-xs font-medium text-gray-600">
            {progreso}%
          </div>
        )}

        {isDelayed && (
          <div className="absolute -top-5 -right-5 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
          <div className="font-medium">{item.nombre}</div>
          <div>Inicio: {startDate.toLocaleDateString('es-ES')}</div>
          <div>Fin: {endDate.toLocaleDateString('es-ES')}</div>
          <div>Progreso: {progreso}%</div>
          <div className="text-yellow-300 mt-1">💡 Arrastra para mover • Handles para redimensionar</div>
        </div>
      </div>
    </div>
  )
}