// ===================================================
// 📁 Archivo: useSortableList.ts
// 📌 Ubicación: src/hooks/useSortableList.ts
// 🔧 Descripción: Hook personalizado para manejar reordenamiento de listas
// 🎯 Funcionalidades: API calls para actualizar orden de elementos
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-06
// ===================================================

import { useState } from 'react'
import { toast } from 'sonner'

interface SortableItem {
  id: string
  orden: number
}

interface UseSortableListOptions {
  proyectoId: string
  tipo: 'edt' | 'zona' | 'actividad' | 'tarea'
  parentId?: string // ID del elemento padre (ej: faseId, edtId, zonaId)
  cronogramaId?: string
}

export function useSortableList<T extends SortableItem>({
  proyectoId,
  tipo,
  parentId,
  cronogramaId
}: UseSortableListOptions) {

  const [isReordering, setIsReordering] = useState(false)

  const reorderItems = async (items: T[]): Promise<void> => {
    if (isReordering) return

    try {
      setIsReordering(true)

      // Preparar los datos para la API
      const reorderData = {
        tipo,
        proyectoId,
        parentId,
        cronogramaId,
        elementos: items.map((item, index) => ({
          id: item.id,
          orden: index
        }))
      }

      console.log('🔄 [SORTABLE] Reordenando elementos:', reorderData)

      // Hacer la llamada a la API
      const response = await fetch(`/api/proyectos/${proyectoId}/reordenar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(reorderData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al reordenar elementos')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al reordenar elementos')
      }

      console.log('✅ [SORTABLE] Elementos reordenados exitosamente')

    } catch (error) {
      console.error('❌ [SORTABLE] Error al reordenar:', error)
      toast.error('Error al reordenar elementos')
      throw error // Re-throw para que el componente pueda manejar el error
    } finally {
      setIsReordering(false)
    }
  }

  return {
    reorderItems,
    isReordering
  }
}

export default useSortableList