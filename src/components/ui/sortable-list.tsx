// ===================================================
// 📁 Archivo: sortable-list.tsx
// 📌 Ubicación: src/components/ui/sortable-list.tsx
// 🔧 Descripción: Contenedor para listas ordenables con drag & drop
// 🎯 Funcionalidades: Gestión de reordenamiento y actualización de orden
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-06
// ===================================================

'use client'

import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableItem } from './sortable-item'
import { toast } from 'sonner'

interface SortableListProps<T extends { id: string; orden: number }> {
  items: T[]
  onReorder: (items: T[]) => Promise<void>
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  strategy?: 'rect' | 'vertical' | 'horizontal'
  disabled?: boolean
  showHandles?: boolean
}

export function SortableList<T extends { id: string; orden: number }>({
  items,
  onReorder,
  renderItem,
  className = "",
  strategy = 'rect',
  disabled = false,
  showHandles = true
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimiento antes de activar drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortingStrategy =
    strategy === 'vertical' ? rectSortingStrategy :
    strategy === 'horizontal' ? rectSortingStrategy :
    rectSortingStrategy

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    try {
      setIsReordering(true)

      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      // Reordenar el array localmente
      const reorderedItems = arrayMove(items, oldIndex, newIndex)

      // Actualizar el campo orden de cada elemento
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        orden: index
      }))

      // Llamar a la función de reordenamiento
      await onReorder(updatedItems)

      toast.success('Elementos reordenados exitosamente')

    } catch (error) {
      console.error('Error al reordenar elementos:', error)
      toast.error('Error al reordenar elementos')
    } finally {
      setIsReordering(false)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    // Lógica adicional si es necesario para drag over
  }

  const activeItem = activeId ? items.find(item => item.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <SortableContext
        items={items.map(item => item.id)}
        strategy={sortingStrategy}
      >
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              disabled={disabled || isReordering}
              showHandle={showHandles}
              className="group"
            >
              {renderItem(item, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>

      {/* Overlay para drag preview si es necesario */}
      {activeItem && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {/* Aquí se puede agregar un preview personalizado si es necesario */}
        </div>
      )}
    </DndContext>
  )
}

export default SortableList