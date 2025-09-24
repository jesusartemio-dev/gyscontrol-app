'use client'

import React from 'react'

interface TimeGridProps {
  startDate: Date
  endDate: Date
  scale: 'days' | 'weeks' | 'months'
  width: number
  height: number
}

export function TimeGrid({ startDate, endDate, scale, width, height }: TimeGridProps) {
  const intervals = generateTimeIntervals(startDate, endDate, scale, width)
  const today = new Date()

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width, height }}>
      {/* Líneas verticales */}
      {intervals.map((interval, index) => (
        <g key={index}>
          <line
            x1={interval.x}
            y1={0}
            x2={interval.x}
            y2={height}
            stroke={interval.isMajor ? "#374151" : "#d1d5db"}
            strokeWidth={interval.isMajor ? 2 : 1}
            opacity={interval.isMajor ? 0.8 : 0.4}
          />

          {/* Etiquetas */}
          <text
            x={interval.x + 5}
            y={20}
            fontSize="11"
            fill="#374151"
            fontWeight={interval.isMajor ? "600" : "400"}
          >
            {interval.label}
          </text>
        </g>
      ))}

      {/* Línea del día actual */}
      {today >= startDate && today <= endDate && (
        <line
          x1={getDatePosition(today, startDate, endDate, width)}
          y1={0}
          x2={getDatePosition(today, startDate, endDate, width)}
          y2={height}
          stroke="#ef4444"
          strokeWidth={3}
          strokeDasharray="5,5"
          opacity={0.8}
        />
      )}

      {/* Etiqueta del día actual */}
      {today >= startDate && today <= endDate && (
        <text
          x={getDatePosition(today, startDate, endDate, width) + 5}
          y={height - 10}
          fontSize="10"
          fill="#ef4444"
          fontWeight="600"
        >
          HOY
        </text>
      )}
    </svg>
  )
}

function generateTimeIntervals(start: Date, end: Date, scale: string, width: number) {
  const intervals = []
  const totalDuration = end.getTime() - start.getTime()

  if (scale === 'days') {
    const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24))
    const pixelsPerDay = width / totalDays

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
      const x = i * pixelsPerDay

      intervals.push({
        x: x,
        label: date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: date.getDate() === 1 ? '2-digit' : undefined
        }),
        isMajor: date.getDay() === 1 || date.getDate() === 1 // Lunes o primer día del mes
      })
    }
  } else if (scale === 'weeks') {
    const totalWeeks = Math.ceil(totalDuration / (7 * 24 * 60 * 60 * 1000))
    const pixelsPerWeek = width / totalWeeks

    for (let i = 0; i <= totalWeeks; i++) {
      const date = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000)
      const x = i * pixelsPerWeek

      intervals.push({
        x: x,
        label: `Sem ${date.toLocaleDateString('es-ES', {
          month: 'short',
          day: '2-digit'
        })}`,
        isMajor: date.getDate() <= 7 // Primer semana del mes
      })
    }
  } else if (scale === 'months') {
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
    const endMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0)
    const totalMonths = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
                       (endMonth.getMonth() - startMonth.getMonth()) + 1
    const pixelsPerMonth = width / totalMonths

    for (let i = 0; i <= totalMonths; i++) {
      const date = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
      const x = i * pixelsPerMonth

      intervals.push({
        x: x,
        label: date.toLocaleDateString('es-ES', {
          month: 'short',
          year: '2-digit'
        }),
        isMajor: true
      })
    }
  }

  return intervals
}

function getDatePosition(date: Date, start: Date, end: Date, width: number): number {
  const totalDuration = end.getTime() - start.getTime()
  const dateOffset = date.getTime() - start.getTime()
  return (dateOffset / totalDuration) * width
}