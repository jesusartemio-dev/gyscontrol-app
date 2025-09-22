'use client'

/**
 * 🚀 QuickImportModal - Modal para importación rápida de tareas
 *
 * Modal simple de 1 paso que importa todas las tareas disponibles
 * con valores por defecto automáticos.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Zap,
  Package,
  CheckCircle,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react'

interface CotizacionServicioItem {
  id: string
  nombre: string
  descripcion?: string
  categoria: string
  cantidad: number
  horaTotal: number
  costoInterno: number
  costoCliente: number
  recursoNombre?: string
  unidadServicioNombre?: string
  orden?: number
  yaImportado?: boolean
  tareaExistente?: {
    id: string
    nombre: string
  } | null
}

interface QuickImportModalProps {
  cotizacionId: string
  edtId: string
  edt?: any // EDT data for date constraints
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function QuickImportModal({
  cotizacionId,
  edtId,
  edt,
  isOpen,
  onClose,
  onSuccess
}: QuickImportModalProps) {
  const [loading, setLoading] = useState(false)
  const [servicioItems, setServicioItems] = useState<CotizacionServicioItem[]>([])
  const [draggedItem, setDraggedItem] = useState<CotizacionServicioItem | null>(null)
  const [customOrder, setCustomOrder] = useState<CotizacionServicioItem[]>([])
  const { toast } = useToast()

  // Cargar ítems de servicio disponibles
  useEffect(() => {
    if (isOpen) {
      loadServicioItems()
    }
  }, [isOpen])

  // Auto-ordenar al cargar
  useEffect(() => {
    if (servicioItems.length > 0) {
      const availableItems = servicioItems.filter(item => !item.yaImportado)
      setCustomOrder(availableItems)
    }
  }, [servicioItems])

  const loadServicioItems = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/${edtId}/servicio-items`)

      if (!response.ok) {
        throw new Error('Error al cargar ítems de servicio')
      }

      const data = await response.json()
      setServicioItems(data.data || [])
    } catch (error) {
      console.error('Error loading servicio items:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los ítems de servicio.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }


  // Función para calcular fechas dentro del rango del EDT
  const calculateTaskDates = (selectedItems: CotizacionServicioItem[], edt: any) => {
    if (!edt?.fechaInicioComercial || !edt?.fechaFinComercial) {
      // Si no hay fechas en el EDT, usar lógica por defecto
      return selectedItems.map((item, index) => {
        const baseDate = new Date()
        const startDate = new Date(baseDate)
        startDate.setDate(startDate.getDate() + (index * 2))
  
        const endDate = new Date(startDate)
        const diasTrabajo = Math.max(1, Math.ceil(item.horaTotal / 8))
        // Asegurar que siempre haya al menos 1 día de diferencia
        const diasTotales = Math.max(1, diasTrabajo)
        endDate.setDate(endDate.getDate() + diasTotales)
  
        return {
          fechaInicio: startDate.toISOString(),
          fechaFin: endDate.toISOString()
        }
      })
    }

    // Usar fechas del EDT
    const edtStart = new Date(edt.fechaInicioComercial)
    const edtEnd = new Date(edt.fechaFinComercial)
    const totalDiasEdt = Math.max(1, Math.floor((edtEnd.getTime() - edtStart.getTime()) / (1000 * 60 * 60 * 24)))

    return selectedItems.map((item, index) => {
      // Distribuir tareas uniformemente dentro del EDT
      const diasPorTarea = Math.max(1, Math.floor(totalDiasEdt / selectedItems.length))
      const startOffset = index * diasPorTarea

      const startDate = new Date(edtStart)
      startDate.setDate(startDate.getDate() + startOffset)

      const diasTrabajo = Math.max(1, Math.ceil(item.horaTotal / 8))
      const endDate = new Date(startDate)
      // Asegurar que siempre haya al menos 1 día de diferencia
      const diasTotales = Math.max(1, diasTrabajo)
      endDate.setDate(endDate.getDate() + diasTotales)

      // Asegurar que no exceda la fecha fin del EDT
      if (endDate > edtEnd) {
        endDate.setTime(edtEnd.getTime())
      }

      // Si después de ajustar, la fecha fin es igual o anterior a la fecha inicio, ajustar
      if (endDate <= startDate) {
        endDate.setTime(startDate.getTime() + (24 * 60 * 60 * 1000)) // Al menos 1 día después
      }

      return {
        fechaInicio: startDate.toISOString(),
        fechaFin: endDate.toISOString()
      }
    })
  }

  // Función para calcular si necesitamos extender la fecha fin del EDT
  const calculateExtendedEdtEnd = (taskDates: { fechaInicio: string, fechaFin: string }[], edt: any): string | null => {
    if (!edt?.fechaFinComercial) return null

    const edtEnd = new Date(edt.fechaFinComercial)
    const maxTaskEnd = new Date(Math.max(...taskDates.map(d => new Date(d.fechaFin).getTime())))

    if (maxTaskEnd > edtEnd) {
      return maxTaskEnd.toISOString()
    }

    return null
  }

  const handleQuickImport = async () => {
    if (customOrder.length === 0) {
      toast({
        title: 'Sin tareas disponibles',
        description: 'No hay tareas disponibles para importar.',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)

      // Usar el orden personalizado definido por el usuario
      const orderedItems = customOrder.length > 0 ? customOrder : servicioItems.filter(item => !item.yaImportado)

      console.log('🔍 Debug - EDT data:', edt)
      console.log('🔍 Debug - Ordered items:', orderedItems)
      console.log('🔍 Debug - Cotizacion ID:', cotizacionId)
      console.log('🔍 Debug - EDT ID:', edtId)

      // Calcular fechas dentro del EDT
      const taskDates = calculateTaskDates(orderedItems, edt)
      console.log('🔍 Debug - Task dates calculated:', taskDates)

      // Crear tareas con valores por defecto automáticos
      const batchData = {
        tasks: orderedItems.map((item, index) => {
          const dates = taskDates[index]

          return {
            nombre: item.nombre,
            descripcion: item.descripcion || `Tarea basada en ítem de servicio: ${item.nombre}`,
            fechaInicioCom: dates.fechaInicio,
            fechaFinCom: dates.fechaFin,
            horasCom: item.horaTotal,
            prioridad: 'media' as const,
            responsableId: undefined,
            cotizacionServicioItemId: item.id
          }
        }),
        dependencies: [], // Sin dependencias en importación rápida
        extendEdtEnd: calculateExtendedEdtEnd(taskDates, edt) // Nueva propiedad para extender EDT
      }

      console.log('🔍 Debug - Batch data to send:', batchData)

      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/${edtId}/tareas/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchData)
      })

      console.log('🔍 Debug - Response status:', response.status)
      console.log('🔍 Debug - Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔍 Debug - Error response:', errorText)
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('🔍 Debug - Success result:', result)

      toast({
        title: '✅ Importación exitosa',
        description: `Se importaron ${result.createdTasks?.length || 0} tareas automáticamente.`,
      })

      onSuccess()
    } catch (error) {
      console.error('❌ Error creating tasks:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron importar las tareas.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener ítems en orden personalizado
  const getOrderedItems = () => {
    return customOrder.length > 0 ? customOrder : servicioItems.filter(item => !item.yaImportado)
  }

  // Funciones para drag and drop
  const handleDragStart = (e: React.DragEvent, item: CotizacionServicioItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropItem: CotizacionServicioItem) => {
    e.preventDefault()

    if (!draggedItem || draggedItem.id === dropItem.id) {
      return
    }

    const currentOrder = getOrderedItems()
    const draggedIndex = currentOrder.findIndex(item => item.id === draggedItem.id)
    const dropIndex = currentOrder.findIndex(item => item.id === dropItem.id)

    if (draggedIndex === -1 || dropIndex === -1) {
      return
    }

    // Reordenar el array
    const newOrder = [...currentOrder]
    const [removed] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, removed)

    setCustomOrder(newOrder)
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const availableItems = servicioItems.filter(item => !item.yaImportado)
  const alreadyImportedItems = servicioItems.filter(item => item.yaImportado)
  const orderedItems = getOrderedItems()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Importación Rápida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información concisa */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Importa tareas automáticamente con configuración inteligente
              </span>
            </div>
          </div>

          {/* Controles de ordenamiento manual */}
          {orderedItems.length > 1 && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Orden personalizado</span>
              </div>
            </div>
          )}

          {/* Vista previa del orden de tareas con drag & drop */}
          {orderedItems.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Orden de importación</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {orderedItems.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center gap-3 p-2 bg-white border border-green-200 rounded cursor-move
                      hover:bg-green-25 hover:border-green-300 transition-colors
                      ${draggedItem?.id === item.id ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-green-600" />
                      <span className="w-6 text-center font-mono text-green-700 text-sm">#{index + 1}</span>
                    </div>
                    <span className="flex-1 text-sm truncate">{item.nombre}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {item.horaTotal}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ítems ya importados */}
          {alreadyImportedItems.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {alreadyImportedItems.length} ya importados
                </span>
              </div>
            </div>
          )}

          {/* Sin ítems disponibles */}
          {orderedItems.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No hay ítems disponibles</h3>
              <p className="text-sm">
                Todos los ítems ya fueron importados.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleQuickImport}
            disabled={loading || availableItems.length === 0}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importando...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}