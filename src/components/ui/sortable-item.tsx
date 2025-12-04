// ===================================================
// 📁 Archivo: sortable-item.tsx
// 📌 Ubicación: src/components/ui/sortable-item.tsx
// 🔧 Descripción: Componente base para elementos arrastrables
// 🎯 Funcionalidades: Soporte para drag & drop con @dnd-kit
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-06
// ===================================================

'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortableItemProps {
  id: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  showHandle?: boolean
}

export function SortableItem({
  id,
  children,
  className,
  disabled = false,
  showHandle = true
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-all duration-200",
        isDragging && "opacity-50 z-50 shadow-2xl scale-105",
        className
      )}
    >
      {/* Drag Handle */}
      {showHandle && !disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Content */}
      <div className={cn(
        "transition-all duration-200",
        !disabled && "group hover:shadow-md",
        showHandle && !disabled && "group"
      )}>
        {children}
      </div>
    </div>
  )
}

export default SortableItem