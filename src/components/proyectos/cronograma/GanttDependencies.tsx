'use client'

import React from 'react'

interface Dependency {
  id: string
  fromTaskId: string
  toTaskId: string
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
}

interface GanttDependenciesProps {
  dependencies: Dependency[]
  tasks: any[]
  timelineStart: Date
  timelineEnd: Date
  chartWidth: number
  chartHeight: number
  getTaskPosition: (taskId: string) => { x: number, y: number, width: number, height: number }
}

export function GanttDependencies({
  dependencies,
  tasks,
  timelineStart,
  timelineEnd,
  chartWidth,
  chartHeight,
  getTaskPosition
}: GanttDependenciesProps) {
  const renderDependencyArrow = (fromPos: any, toPos: any, type: string) => {
    if (!fromPos || !toPos) return null

    const offset = 8 // Espacio desde el borde de la barra

    let startX, startY, endX, endY

    switch (type) {
      case 'finish_to_start':
        startX = fromPos.x + fromPos.width
        startY = fromPos.y + fromPos.height / 2
        endX = toPos.x
        endY = toPos.y + toPos.height / 2
        break
      case 'start_to_start':
        startX = fromPos.x
        startY = fromPos.y + fromPos.height / 2
        endX = toPos.x
        endY = toPos.y + toPos.height / 2
        break
      case 'finish_to_finish':
        startX = fromPos.x + fromPos.width
        startY = fromPos.y + fromPos.height / 2
        endX = toPos.x + toPos.width
        endY = toPos.y + toPos.height / 2
        break
      case 'start_to_finish':
        startX = fromPos.x
        startY = fromPos.y + fromPos.height / 2
        endX = toPos.x + toPos.width
        endY = toPos.y + toPos.height / 2
        break
      default:
        return null
    }

    // Calcular puntos para la flecha curva
    const midX = (startX + endX) / 2
    const controlPoint1X = startX + (endX - startX) * 0.3
    const controlPoint2X = endX - (endX - startX) * 0.3

    const pathData = `M ${startX} ${startY} C ${controlPoint1X} ${startY}, ${controlPoint2X} ${endY}, ${endX} ${endY}`

    return (
      <g key={`dep-${fromPos.taskId}-${toPos.taskId}`}>
        {/* Línea curva */}
        <path
          d={pathData}
          stroke="#6b7280"
          strokeWidth={2}
          fill="none"
          markerEnd="url(#arrowhead)"
          className="pointer-events-none"
        />

        {/* Círculo en el punto de inicio */}
        <circle
          cx={startX}
          cy={startY}
          r={4}
          fill="#6b7280"
          className="pointer-events-none"
        />

        {/* Círculo en el punto final */}
        <circle
          cx={endX}
          cy={endY}
          r={4}
          fill="#6b7280"
          className="pointer-events-none"
        />
      </g>
    )
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: chartWidth, height: chartHeight }}
    >
      {/* Definición de la flecha */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#6b7280"
          />
        </marker>
      </defs>

      {/* Renderizar dependencias */}
      {dependencies.map(dep => {
        const fromPos = getTaskPosition(dep.fromTaskId)
        const toPos = getTaskPosition(dep.toTaskId)

        return renderDependencyArrow(fromPos, toPos, dep.type)
      })}
    </svg>
  )
}