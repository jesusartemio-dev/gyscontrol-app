'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import PlantillaServicioIndependienteMultiAddModal from '@/components/plantillas/servicios/PlantillaServicioIndependienteMultiAddModal'
import CrearCotizacionModal from '@/components/cotizaciones/CrearCotizacionModal'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

import {
  Plus,
  ChevronRight,
  Share2,
  Download,
  Edit,
  FileText,
  Settings,
  AlertCircle,
  Loader2,
  Truck,
  DollarSign,
  Package,
  Trash2,
  Calculator,
  Clock,
  Save,
  X,
  Grid3X3,
  List
} from 'lucide-react'

import { calcularTotal } from '@/lib/utils/costos'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'activo':
    case 'active':
      return { variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200' }
    case 'inactivo':
    case 'inactive':
      return { variant: 'secondary' as const, className: 'bg-red-100 text-red-800 border-red-200' }
    case 'borrador':
    case 'draft':
      return { variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    case 'pendiente':
    case 'pending':
      return { variant: 'outline' as const, className: 'bg-blue-100 text-blue-800 border-blue-200' }
    case 'archivado':
    case 'archived':
      return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800 border-gray-200' }
    default:
      return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
}

interface PlantillaServicioIndependiente {
  id: string
  nombre: string
  descripcion?: string
  categoria: string
  categoriaNombre?: string
  estado: string
  totalInterno: number
  totalCliente: number
  descuento: number
  grandTotal: number
  createdAt: string
  updatedAt: string
  plantillaServicioItemIndependiente: PlantillaServicioItemIndependiente[]
}

interface PlantillaServicioItemIndependiente {
  id: string
  plantillaServicioId: string
  catalogoServicioId?: string
  unidadServicioId: string
  recursoId: string
  nombre: string
  descripcion: string
  categoria: string
  unidadServicioNombre: string
  recursoNombre: string
  formula: string
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  costoHora: number
  cantidad: number
  horaTotal: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  orden?: number
  nivelDificultad?: number
  createdAt: string
  updatedAt: string
}

export default function PlantillaServiciosDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [plantilla, setPlantilla] = useState<PlantillaServicioIndependiente | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingQuantities, setEditingQuantities] = useState<Record<string, number>>({})
  const [editingFactors, setEditingFactors] = useState<Record<string, number>>({})
  const [editingDificultades, setEditingDificultades] = useState<Record<string, number>>({})
  const [savingQuantities, setSavingQuantities] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  const loadPlantilla = useCallback(async (plantillaId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/plantillas/servicios/${plantillaId}`)
      if (!response.ok) {
        throw new Error('Error al cargar la plantilla')
      }
      const data = await response.json()
      setPlantilla(data)
    } catch (err) {
      console.error('Error loading plantilla:', err)
      setError('❌ Error al cargar la plantilla.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof id === 'string') {
      loadPlantilla(id)
    }
  }, [id, loadPlantilla])

  const handleItemsAdded = async (newItems: any[]) => {
    if (!plantilla) return

    try {
      // Recargar la plantilla para obtener los datos actualizados
      await loadPlantilla(plantilla.id)
      toast.success(`Se agregaron ${newItems.length} items a la plantilla`)
    } catch (err) {
      console.error('Error updating plantilla:', err)
      toast.error('Error al actualizar la plantilla')
    }
  }

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!plantilla) return

    try {
      const response = await fetch(`/api/plantillas/servicios/${plantilla.id}/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Error response:', errorData)
        throw new Error(errorData.details || errorData.error || 'Error al eliminar el item')
      }

      // Update local state by removing the item and recalculate totals
      setPlantilla(prev => {
        if (!prev) return prev
        const newItems = prev.plantillaServicioItemIndependiente.filter(item => item.id !== itemId)
        const newTotalInterno = newItems.reduce((sum, item) => sum + item.costoInterno, 0)
        const newTotalCliente = newItems.reduce((sum, item) => sum + item.costoCliente, 0)
        const newGrandTotal = newTotalCliente - prev.descuento
        return { ...prev, plantillaServicioItemIndependiente: newItems, totalInterno: newTotalInterno, totalCliente: newTotalCliente, grandTotal: newGrandTotal }
      })
      toast.success('Item eliminado de la plantilla')
    } catch (err) {
      console.error('Error deleting item:', err)
      toast.error('Error al eliminar el item')
    }
  }, [plantilla, loadPlantilla])

  const handleStartEditQuantity = useCallback((itemId: string, currentQuantity: number) => {
    setEditingQuantities(prev => ({
      ...prev,
      [itemId]: currentQuantity
    }))
  }, [])

  const handleCancelEditQuantity = useCallback((itemId: string) => {
    setEditingQuantities(prev => {
      const newState = { ...prev }
      delete newState[itemId]
      return newState
    })
  }, [])

  const handleUpdateQuantity = useCallback(async (itemId: string) => {
    if (!plantilla) return

    const newQuantity = editingQuantities[itemId]
    if (!newQuantity || newQuantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    setSavingQuantities(prev => new Set(prev).add(itemId))

    try {
      const response = await fetch(`/api/plantillas/servicios/${plantilla.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: newQuantity })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar la cantidad')
      }

      // Update the local state with the updated item and recalculate totals
      const updatedItem = await response.json()
      setPlantilla(prev => {
        if (!prev) return prev
        const newItems = prev.plantillaServicioItemIndependiente.map(item => item.id === itemId ? updatedItem : item)
        const newTotalInterno = newItems.reduce((sum, item) => sum + item.costoInterno, 0)
        const newTotalCliente = newItems.reduce((sum, item) => sum + item.costoCliente, 0)
        const newGrandTotal = newTotalCliente - prev.descuento
        return { ...prev, plantillaServicioItemIndependiente: newItems, totalInterno: newTotalInterno, totalCliente: newTotalCliente, grandTotal: newGrandTotal }
      })
      toast.success('Cantidad actualizada')

      // Limpiar el estado de edición
      setEditingQuantities(prev => {
        const newState = { ...prev }
        delete newState[itemId]
        return newState
      })
    } catch (err) {
      console.error('Error updating quantity:', err)
      toast.error('Error al actualizar la cantidad')
    } finally {
      setSavingQuantities(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }, [plantilla, editingQuantities, loadPlantilla])

  const handleQuantityChange = useCallback((itemId: string, value: string) => {
    const numValue = parseInt(value) || 0
    setEditingQuantities(prev => ({
      ...prev,
      [itemId]: numValue
    }))
  }, [])

  const handleUpdateFactor = useCallback(async (itemId: string) => {
    if (!plantilla) return

    const newFactor = editingFactors[itemId]
    if (!newFactor || newFactor < 1) {
      toast.error('El factor de seguridad debe ser mayor o igual a 1')
      return
    }

    setSavingQuantities(prev => new Set(prev).add(itemId))

    try {
      const response = await fetch(`/api/plantillas/servicios/${plantilla.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorSeguridad: newFactor })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el factor de seguridad')
      }

      // Update the local state with the updated item and recalculate totals
      const updatedItem = await response.json()
      setPlantilla(prev => {
        if (!prev) return prev
        const newItems = prev.plantillaServicioItemIndependiente.map(item => item.id === itemId ? updatedItem : item)
        const newTotalInterno = newItems.reduce((sum, item) => sum + item.costoInterno, 0)
        const newTotalCliente = newItems.reduce((sum, item) => sum + item.costoCliente, 0)
        const newGrandTotal = newTotalCliente - prev.descuento
        return { ...prev, plantillaServicioItemIndependiente: newItems, totalInterno: newTotalInterno, totalCliente: newTotalCliente, grandTotal: newGrandTotal }
      })
      toast.success('Factor de seguridad actualizado')

      // Limpiar el estado de edición
      setEditingFactors(prev => {
        const newState = { ...prev }
        delete newState[itemId]
        return newState
      })
    } catch (err) {
      console.error('Error updating factor:', err)
      toast.error('Error al actualizar el factor de seguridad')
    } finally {
      setSavingQuantities(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }, [plantilla, editingFactors, loadPlantilla])

  const handleUpdateDificultad = useCallback(async (itemId: string) => {
    if (!plantilla) return

    const newDificultad = editingDificultades[itemId]
    if (!newDificultad || newDificultad < 1 || newDificultad > 4) {
      toast.error('La dificultad debe estar entre 1 y 4')
      return
    }

    setSavingQuantities(prev => new Set(prev).add(itemId))

    try {
      const response = await fetch(`/api/plantillas/servicios/${plantilla.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nivelDificultad: newDificultad })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar la dificultad')
      }

      // Update the local state with the updated item and recalculate totals
      const updatedItem = await response.json()
      setPlantilla(prev => {
        if (!prev) return prev
        const newItems = prev.plantillaServicioItemIndependiente.map(item => item.id === itemId ? updatedItem : item)
        const newTotalInterno = newItems.reduce((sum, item) => sum + item.costoInterno, 0)
        const newTotalCliente = newItems.reduce((sum, item) => sum + item.costoCliente, 0)
        const newGrandTotal = newTotalCliente - prev.descuento
        return { ...prev, plantillaServicioItemIndependiente: newItems, totalInterno: newTotalInterno, totalCliente: newTotalCliente, grandTotal: newGrandTotal }
      })
      toast.success('Dificultad actualizada')

      // Limpiar el estado de edición
      setEditingDificultades(prev => {
        const newState = { ...prev }
        delete newState[itemId]
        return newState
      })
    } catch (err) {
      console.error('Error updating dificultad:', err)
      toast.error('Error al actualizar la dificultad')
    } finally {
      setSavingQuantities(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }, [plantilla, editingDificultades, loadPlantilla])

  // Determine current view mode based on screen size and user preference
  const currentViewMode = useMemo(() => {
    // On mobile, always show cards
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'card'
    }
    // On desktop, use user preference
    return viewMode
  }, [viewMode])

  // Table row component with grouped columns (Option 3)
  const TableItemRow = React.memo(({
    item,
    index,
    onQuantityChange,
    onStartEdit,
    onCancelEdit,
    onUpdateQuantity,
    onDelete,
    isEditing,
    editedQuantity,
    isSaving
  }: {
    item: PlantillaServicioItemIndependiente
    index: number
    onQuantityChange: (itemId: string, value: string) => void
    onStartEdit: (itemId: string, quantity: number) => void
    onCancelEdit: (itemId: string) => void
    onUpdateQuantity: (itemId: string) => Promise<void>
    onDelete: (itemId: string) => Promise<void>
    isEditing: boolean
    editedQuantity: number
    isSaving: boolean
  }) => {
    const dificultadLabels: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Crítica' }
    const dificultadColors: Record<number, string> = {
      1: 'bg-green-100 text-green-700',
      2: 'bg-yellow-100 text-yellow-700',
      3: 'bg-orange-100 text-orange-700',
      4: 'bg-red-100 text-red-700'
    }

    return (
      <motion.tr
        variants={itemVariants}
        transition={{ delay: index * 0.02 }}
        className="border-b hover:bg-gray-50"
      >
        {/* Servicio - nombre + unidad */}
        <td className="p-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{item.nombre}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {item.unidadServicioNombre}
            </Badge>
          </div>
        </td>

        {/* Recurso + Costo/Hora agrupado */}
        <td className="p-2">
          <div className="text-sm text-gray-700">{item.recursoNombre}</div>
          <div className="text-xs text-gray-500">${item.costoHora}/h</div>
        </td>

        {/* Cantidad - editable con altura fija */}
        <td className="p-2">
          <div className="h-8 flex items-center w-[100px]">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editedQuantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '')
                    onQuantityChange(item.id, val || '0')
                  }}
                  className="w-10 h-7 text-sm text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id)}
                  disabled={isSaving || editedQuantity === item.cantidad}
                  className="h-7 w-7 p-0"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancelEdit(item.id)}
                  disabled={isSaving}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="font-semibold w-10 text-center">{item.cantidad}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStartEdit(item.id, item.cantidad)}
                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </td>

        {/* Horas agrupadas: Total (base+repet) con tooltip */}
        <td className="p-2 text-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className="font-medium text-purple-600">{item.horaTotal}h</div>
                  <div className="text-[10px] text-gray-400">{item.horaBase || 0}+{item.horaRepetido || 0}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Fórmula Escalonada:</p>
                  <p><span className="text-gray-500">Hora Base:</span> {item.horaBase || 0}h (primera unidad)</p>
                  <p><span className="text-gray-500">Hora Repetido:</span> {item.horaRepetido || 0}h (por c/unidad adicional)</p>
                  <p className="pt-1 border-t mt-1">
                    <span className="text-gray-500">Cálculo:</span> {item.horaBase || 0} + ({item.cantidad - 1} × {item.horaRepetido || 0}) = <span className="font-semibold text-purple-600">{item.horaTotal}h</span>
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>

        {/* Factor Seguridad - editable con altura fija */}
        <td className="p-2 text-center">
          <div className="h-8 flex items-center justify-center w-[90px] mx-auto">
            {editingFactors[item.id] !== undefined ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingFactors[item.id]}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '')
                    setEditingFactors(prev => ({
                      ...prev,
                      [item.id]: parseFloat(val) || 1
                    }))
                  }}
                  className="w-12 h-7 text-sm text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => handleUpdateFactor(item.id)}
                  disabled={isSaving}
                  className="h-7 w-7 p-0"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingFactors(prev => {
                    const newState = { ...prev }
                    delete newState[item.id]
                    return newState
                  })}
                  disabled={isSaving}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1 cursor-pointer group"
                onClick={() => setEditingFactors(prev => ({
                  ...prev,
                  [item.id]: item.factorSeguridad || 1
                }))}
              >
                <span className="text-sm font-medium w-10 text-center">{(item.factorSeguridad || 1).toFixed(1)}x</span>
                <Edit className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </td>

        {/* Dificultad - editable con altura fija */}
        <td className="p-2 text-center">
          <div className="h-8 flex items-center justify-center w-[110px] mx-auto">
            {editingDificultades[item.id] !== undefined ? (
              <div className="flex items-center gap-1">
                <select
                  className="border rounded px-1 h-7 text-xs w-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingDificultades[item.id]}
                  onChange={(e) => setEditingDificultades(prev => ({
                    ...prev,
                    [item.id]: parseInt(e.target.value)
                  }))}
                  disabled={isSaving}
                  autoFocus
                >
                  <option value={1}>Baja</option>
                  <option value={2}>Media</option>
                  <option value={3}>Alta</option>
                  <option value={4}>Crítica</option>
                </select>
                <Button
                  size="sm"
                  onClick={() => handleUpdateDificultad(item.id)}
                  disabled={isSaving}
                  className="h-7 w-7 p-0"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingDificultades(prev => {
                    const newState = { ...prev }
                    delete newState[item.id]
                    return newState
                  })}
                  disabled={isSaving}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className="cursor-pointer group flex items-center gap-1"
                onClick={() => setEditingDificultades(prev => ({
                  ...prev,
                  [item.id]: item.nivelDificultad || 1
                }))}
              >
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${dificultadColors[item.nivelDificultad || 1]}`}
                >
                  {dificultadLabels[item.nivelDificultad || 1]}
                </Badge>
                <Edit className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </td>

        {/* Margen */}
        <td className="p-2 text-center">
          <span className="text-sm">{((item.margen || 0) * 100).toFixed(0)}%</span>
        </td>

        {/* Precios agrupados: Interno / Cliente */}
        <td className="p-2 text-right">
          <div className="text-xs text-blue-600">{formatCurrency(item.costoInterno)}</div>
          <div className="font-semibold text-green-600">{formatCurrency(item.costoCliente)}</div>
        </td>

        {/* Acciones */}
        <td className="p-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={isSaving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </motion.tr>
    )
  })

  // Card item component for detailed view
  const CardItemRow = React.memo(({
    item,
    index,
    onQuantityChange,
    onStartEdit,
    onCancelEdit,
    onUpdateQuantity,
    onDelete,
    isEditing,
    editedQuantity,
    isSaving
  }: {
    item: PlantillaServicioItemIndependiente
    index: number
    onQuantityChange: (itemId: string, value: string) => void
    onStartEdit: (itemId: string, quantity: number) => void
    onCancelEdit: (itemId: string) => void
    onUpdateQuantity: (itemId: string) => Promise<void>
    onDelete: (itemId: string) => Promise<void>
    isEditing: boolean
    editedQuantity: number
    isSaving: boolean
  }) => {

    return (
      <motion.div
        variants={itemVariants}
        transition={{ delay: index * 0.05 }}
        className="border rounded-lg p-6 hover:shadow-md transition-all bg-white"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-semibold text-lg text-gray-900">{item.nombre}</h4>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {item.unidadServicioNombre}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Escalonada
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">{item.descripcion}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Formula Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm text-gray-700">Detalles de la Fórmula</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Recurso:</span>
              <div className="font-medium">{item.recursoNombre}</div>
              <div className="text-xs text-gray-500">${item.costoHora}/hora</div>
            </div>
            <div>
              <span className="text-gray-500">Fórmula:</span>
              <div className="font-medium">Escalonada</div>
            </div>
            <div>
              <span className="text-gray-500">Horas Base:</span>
              <div className="font-medium">{item.horaBase || 0}h</div>
            </div>
            <div>
              <span className="text-gray-500">Horas Repetidas:</span>
              <div className="font-medium">{item.horaRepetido || 0}h</div>
            </div>
            {item.formula === 'Escalonada' && (
              <>
                <div>
                  <span className="text-gray-500">Horas Base:</span>
                  <div className="font-medium">{item.horaBase || 0}h</div>
                </div>
                <div>
                  <span className="text-gray-500">Horas Repetidas:</span>
                  <div className="font-medium">{item.horaRepetido || 0}h</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quantity, Difficulty and Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Quantity Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Cantidad
            </Label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={editedQuantity}
                  onChange={(e) => onQuantityChange(item.id, e.target.value)}
                  className="w-20"
                  disabled={isSaving}
                />
                <Button
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id)}
                  disabled={isSaving || editedQuantity === item.cantidad}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancelEdit(item.id)}
                  disabled={isSaving}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">{item.cantidad}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStartEdit(item.id, item.cantidad)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              ⚡ Dificultad
            </Label>
            <div className="text-center">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {(() => {
                  const dificultad = item.nivelDificultad || 1;
                  const labels = { 1: 'Baja (1.0x)', 2: 'Media (1.2x)', 3: 'Alta (1.5x)', 4: 'Crítica (2.0x)' };
                  return labels[dificultad as keyof typeof labels] || 'Baja (1.0x)';
                })()}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Factor de complejidad
            </div>
          </div>

          {/* Hours Calculation */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horas Totales
            </Label>
            <div className="text-2xl font-bold text-purple-600">
              {item.horaTotal}h
            </div>
            <div className="text-xs text-gray-500">
              Con factor dificultad
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Precios
            </Label>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Interno:</span>
                <span className="font-semibold text-blue-600">{formatCurrency(item.costoInterno)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cliente:</span>
                <span className="font-semibold text-green-600">{formatCurrency(item.costoCliente)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Total: {formatCurrency(item.cantidad * item.costoCliente)}
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Costo Interno:</span>
              <div className="font-medium">{formatCurrency(item.costoInterno)}</div>
            </div>
            <div>
              <span className="text-gray-500">Factor Seguridad:</span>
              <div className="font-medium">{item.factorSeguridad}x</div>
            </div>
            <div>
              <span className="text-gray-500">Margen:</span>
              <div className="font-medium">{((item.margen || 0) * 100).toFixed(1)}%</div>
            </div>
            <div>
              <span className="text-gray-500">Total Unitario:</span>
              <div className="font-medium text-green-600">{formatCurrency(item.costoCliente)}</div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  })

  // Loading State
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p className="font-semibold">{error}</p>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (!plantilla) {
    return null
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gray-50/50"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with Breadcrumb */}
        <motion.div variants={itemVariants}>
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/comercial/plantillas')}
              className="hover:bg-gray-100"
            >
              Plantillas
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">Plantillas de Servicios</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{plantilla.nombre}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{plantilla.nombre}</h1>
                <Badge
                  variant={getStatusVariant(plantilla.estado).variant}
                  className={getStatusVariant(plantilla.estado).className}
                >
                  {plantilla.estado}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                  <Truck className="h-3 w-3" />
                  Servicios - {plantilla.categoriaNombre || plantilla.categoria}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Plantilla Especializada
                </span>
                <span>Creada: {formatDate(plantilla.createdAt)}</span>
                <span>{plantilla.plantillaServicioItemIndependiente.length} items</span>
                <span>Total: {formatCurrency(plantilla.grandTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Financial Summary */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Resumen de Costos - Servicios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(plantilla.totalInterno)}
                  </div>
                  <div className="text-sm text-blue-600">Costo Interno</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(plantilla.totalCliente)}
                  </div>
                  <div className="text-sm text-green-600">Precio Cliente</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {plantilla.totalCliente - plantilla.totalInterno > 0 ?
                      `+${formatCurrency(plantilla.totalCliente - plantilla.totalInterno)}` :
                      formatCurrency(plantilla.totalCliente - plantilla.totalInterno)}
                  </div>
                  <div className="text-sm text-purple-600">Margen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* Items Section */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    Items de Servicios
                  </CardTitle>
                  <CardDescription>
                    Servicios incluidos en la plantilla ({plantilla.plantillaServicioItemIndependiente.length} items)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Toggle Buttons - Hidden on mobile, shown on desktop */}
                  <div className="hidden md:flex items-center gap-1 border rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('table')}
                      className="h-8 px-3"
                    >
                      <List className="h-4 w-4 mr-1" />
                      Tabla
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'card' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('card')}
                      className="h-8 px-3"
                    >
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      Cards
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Items
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PlantillaServicioIndependienteMultiAddModal
                plantillaId={plantilla.id}
                categoriaId={plantilla.categoria}
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onItemsCreated={handleItemsAdded}
              />

              {plantilla.plantillaServicioItemIndependiente.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay items en la plantilla
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comienza agregando servicios del catálogo a tu plantilla
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primeros Servicios
                  </Button>
                </div>
              ) : (
                <div>
                  {currentViewMode === 'table' ? (
                    /* Table View - Grouped columns */
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 table-fixed">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                              Servicio
                            </th>
                            <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                              Recurso
                            </th>
                            <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                              Cant.
                            </th>
                            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[8%]">
                              Horas
                            </th>
                            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                              Factor
                            </th>
                            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                              Dificultad
                            </th>
                            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[7%]">
                              Marg.
                            </th>
                            <th className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[13%]">
                              Precios
                            </th>
                            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[6%]">

                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {plantilla.plantillaServicioItemIndependiente
                            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                            .map((item, index) => (
                            <TableItemRow
                              key={item.id}
                              item={item}
                              index={index}
                              onQuantityChange={handleQuantityChange}
                              onStartEdit={handleStartEditQuantity}
                              onCancelEdit={handleCancelEditQuantity}
                              onUpdateQuantity={handleUpdateQuantity}
                              onDelete={handleDeleteItem}
                              isEditing={item.id in editingQuantities}
                              editedQuantity={editingQuantities[item.id] || item.cantidad}
                              isSaving={savingQuantities.has(item.id)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Card View */
                    <div className="space-y-6">
                      {plantilla.plantillaServicioItemIndependiente
                        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                        .map((item, index) => (
                        <CardItemRow
                          key={item.id}
                          item={item}
                          index={index}
                          onQuantityChange={handleQuantityChange}
                          onStartEdit={handleStartEditQuantity}
                          onCancelEdit={handleCancelEditQuantity}
                          onUpdateQuantity={handleUpdateQuantity}
                          onDelete={handleDeleteItem}
                          isEditing={item.id in editingQuantities}
                          editedQuantity={editingQuantities[item.id] || item.cantidad}
                          isSaving={savingQuantities.has(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}