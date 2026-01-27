'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PlantillaServicioIndependienteMultiAddModal from '@/components/plantillas/servicios/PlantillaServicioIndependienteMultiAddModal'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import {
  Plus,
  AlertCircle,
  Loader2,
  Trash2,
  Save,
  X,
  ArrowLeft,
  Download,
  TrendingUp,
  Wrench,
  Clock,
  Edit
} from 'lucide-react'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

interface PlantillaServicioIndependiente {
  id: string
  nombre: string
  descripcion?: string
  edtId?: string
  edt?: { id: string; nombre: string }
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
  edtId?: string
  edt?: { id: string; nombre: string }
  nombre: string
  descripcion: string
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

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="border rounded-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
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
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set())

  const loadPlantilla = useCallback(async (plantillaId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/plantillas/servicios/${plantillaId}`)
      if (!response.ok) throw new Error('Error al cargar la plantilla')
      const data = await response.json()
      setPlantilla(data)
    } catch (err) {
      console.error('Error loading plantilla:', err)
      setError('Error al cargar la plantilla')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof id === 'string') loadPlantilla(id)
  }, [id, loadPlantilla])

  // Stats memoized
  const stats = useMemo(() => {
    if (!plantilla) return { items: 0, totalInterno: 0, totalCliente: 0, margen: 0, margenPct: 0, totalHoras: 0 }
    const items = plantilla.plantillaServicioItemIndependiente?.length || 0
    const margen = plantilla.totalCliente - plantilla.totalInterno
    const margenPct = plantilla.totalInterno > 0 ? (margen / plantilla.totalInterno) * 100 : 0
    const totalHoras = plantilla.plantillaServicioItemIndependiente?.reduce((sum, item) => sum + item.horaTotal, 0) || 0
    return { items, totalInterno: plantilla.totalInterno, totalCliente: plantilla.totalCliente, margen, margenPct, totalHoras }
  }, [plantilla])

  const handleItemsAdded = async (newItems: any[]) => {
    if (!plantilla) return
    await loadPlantilla(plantilla.id)
    toast.success(`Se agregaron ${newItems.length} servicios`)
  }

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!plantilla) return
    try {
      const response = await fetch(`/api/plantillas/servicios/${plantilla.id}/items/${itemId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al eliminar')
      setPlantilla(prev => {
        if (!prev) return prev
        const newItems = prev.plantillaServicioItemIndependiente.filter(item => item.id !== itemId)
        const newTotalInterno = newItems.reduce((sum, item) => sum + item.costoInterno, 0)
        const newTotalCliente = newItems.reduce((sum, item) => sum + item.costoCliente, 0)
        return { ...prev, plantillaServicioItemIndependiente: newItems, totalInterno: newTotalInterno, totalCliente: newTotalCliente, grandTotal: newTotalCliente - prev.descuento }
      })
      toast.success('Servicio eliminado')
    } catch (err) {
      console.error('Error deleting item:', err)
      toast.error('Error al eliminar')
    }
  }, [plantilla])

  const handleUpdateQuantity = useCallback(async (itemId: string) => {
    if (!plantilla) return
    const newQuantity = editingQuantities[itemId]
    if (!newQuantity || newQuantity <= 0) {
      toast.error('Cantidad debe ser mayor a 0')
      return
    }
    setSavingItems(prev => new Set(prev).add(itemId))
    try {
      const response = await fetch(`/api/plantillas/servicios/${plantilla.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: newQuantity })
      })
      if (!response.ok) throw new Error('Error al actualizar')
      const updatedItem = await response.json()
      setPlantilla(prev => {
        if (!prev) return prev
        const newItems = prev.plantillaServicioItemIndependiente.map(item => item.id === itemId ? updatedItem : item)
        const newTotalInterno = newItems.reduce((sum, item) => sum + item.costoInterno, 0)
        const newTotalCliente = newItems.reduce((sum, item) => sum + item.costoCliente, 0)
        return { ...prev, plantillaServicioItemIndependiente: newItems, totalInterno: newTotalInterno, totalCliente: newTotalCliente, grandTotal: newTotalCliente - prev.descuento }
      })
      toast.success('Cantidad actualizada')
      setEditingQuantities(prev => { const newState = { ...prev }; delete newState[itemId]; return newState })
    } catch (err) {
      console.error('Error updating quantity:', err)
      toast.error('Error al actualizar')
    } finally {
      setSavingItems(prev => { const newSet = new Set(prev); newSet.delete(itemId); return newSet })
    }
  }, [plantilla, editingQuantities])

  const handleUpdateFactor = useCallback(async (itemId: string) => {
    if (!plantilla) return
    const newFactor = editingFactors[itemId]
    if (!newFactor || newFactor < 1) {
      toast.error('Factor debe ser >= 1')
      return
    }
    setSavingItems(prev => new Set(prev).add(itemId))
    try {
      const response = await fetch(`/api/plantillas/servicios/${plantilla.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorSeguridad: newFactor })
      })
      if (!response.ok) throw new Error('Error al actualizar')
      const updatedItem = await response.json()
      setPlantilla(prev => {
        if (!prev) return prev
        const newItems = prev.plantillaServicioItemIndependiente.map(item => item.id === itemId ? updatedItem : item)
        const newTotalInterno = newItems.reduce((sum, item) => sum + item.costoInterno, 0)
        const newTotalCliente = newItems.reduce((sum, item) => sum + item.costoCliente, 0)
        return { ...prev, plantillaServicioItemIndependiente: newItems, totalInterno: newTotalInterno, totalCliente: newTotalCliente, grandTotal: newTotalCliente - prev.descuento }
      })
      toast.success('Factor actualizado')
      setEditingFactors(prev => { const newState = { ...prev }; delete newState[itemId]; return newState })
    } catch (err) {
      console.error('Error updating factor:', err)
      toast.error('Error al actualizar')
    } finally {
      setSavingItems(prev => { const newSet = new Set(prev); newSet.delete(itemId); return newSet })
    }
  }, [plantilla, editingFactors])

  if (loading) return <LoadingSkeleton />

  if (error || !plantilla) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <h3 className="text-base font-medium text-gray-900 mb-1">Error</h3>
        <p className="text-sm text-muted-foreground mb-4">{error || 'Plantilla no encontrada'}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </div>
    )
  }

  const sortedItems = [...plantilla.plantillaServicioItemIndependiente].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  return (
    <div className="p-4 space-y-4">
      {/* Header minimalista */}
      <div className="space-y-2">
        {/* Breadcrumb compacto */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/comercial/plantillas" className="hover:text-foreground transition-colors inline-flex items-center">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Plantillas
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Servicios</span>
        </nav>

        {/* Título + Acciones */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <h1 className="text-lg font-semibold truncate">{plantilla.nombre}</h1>
              {plantilla.edt && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {plantilla.edt.nombre}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {stats.items} items
              </Badge>
            </div>

            {/* Stats inline */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono text-purple-600 font-medium">{stats.totalHoras}h</span>
              </span>
              <span className="text-gray-300">|</span>
              <span>Interno: <span className="font-mono text-gray-700">{formatCurrency(stats.totalInterno)}</span></span>
              <span className="text-gray-300">|</span>
              <span>Cliente: <span className="font-mono text-green-600 font-medium">{formatCurrency(stats.totalCliente)}</span></span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                Margen: <span className={`font-mono font-medium ${stats.margen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.margen)} ({stats.margenPct.toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="h-8">
              <Download className="h-3.5 w-3.5 mr-1" />
              Exportar
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)} className="h-8 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla de servicios */}
      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-gray-50/50">
          <Wrench className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Sin servicios</p>
          <Button size="sm" variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Agregar servicios
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Servicio</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 w-24">Recurso</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Cant.</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-16">Horas</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Factor</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-16">Marg.</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 w-20">Interno</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 w-20">Cliente</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedItems.map((item, idx) => {
                  const isEditingQty = item.id in editingQuantities
                  const isEditingFactor = item.id in editingFactors
                  const isSaving = savingItems.has(item.id)

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-blue-50/50 transition-colors',
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      )}
                    >
                      {/* Servicio */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900 line-clamp-1">{item.nombre}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">
                            {item.unidadServicioNombre}
                          </Badge>
                        </div>
                      </td>

                      {/* Recurso */}
                      <td className="px-3 py-2">
                        <div className="text-gray-700">{item.recursoNombre}</div>
                        <div className="text-[10px] text-gray-400">${item.costoHora}/h</div>
                      </td>

                      {/* Cantidad - editable */}
                      <td className="px-3 py-2 text-center">
                        {isEditingQty ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={editingQuantities[item.id]}
                              onChange={(e) => setEditingQuantities(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                              className="w-12 h-6 text-xs text-center border rounded"
                              disabled={isSaving}
                              autoFocus
                            />
                            <Button size="sm" onClick={() => handleUpdateQuantity(item.id)} disabled={isSaving} className="h-6 w-6 p-0">
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingQuantities(prev => { const s = { ...prev }; delete s[item.id]; return s })} disabled={isSaving} className="h-6 w-6 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-center gap-1 cursor-pointer group"
                            onClick={() => setEditingQuantities(prev => ({ ...prev, [item.id]: item.cantidad }))}
                          >
                            <span className="font-medium">{item.cantidad}</span>
                            <Edit className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </td>

                      {/* Horas */}
                      <td className="px-3 py-2 text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <span className="font-medium text-purple-600">{item.horaTotal}h</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p>Base: {item.horaBase || 0}h + ({item.cantidad - 1} × {item.horaRepetido || 0}h)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>

                      {/* Factor - editable */}
                      <td className="px-3 py-2 text-center">
                        {isEditingFactor ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              step="0.1"
                              value={editingFactors[item.id]}
                              onChange={(e) => setEditingFactors(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 1 }))}
                              className="w-12 h-6 text-xs text-center border rounded"
                              disabled={isSaving}
                              autoFocus
                            />
                            <Button size="sm" onClick={() => handleUpdateFactor(item.id)} disabled={isSaving} className="h-6 w-6 p-0">
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingFactors(prev => { const s = { ...prev }; delete s[item.id]; return s })} disabled={isSaving} className="h-6 w-6 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-center gap-1 cursor-pointer group"
                            onClick={() => setEditingFactors(prev => ({ ...prev, [item.id]: item.factorSeguridad || 1 }))}
                          >
                            <span>{(item.factorSeguridad || 1).toFixed(1)}x</span>
                            <Edit className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </td>

                      {/* Margen */}
                      <td className="px-3 py-2 text-center text-gray-600">
                        {((item.margen || 0) * 100).toFixed(0)}%
                      </td>

                      {/* Interno */}
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {formatCurrency(item.costoInterno)}
                      </td>

                      {/* Cliente */}
                      <td className="px-3 py-2 text-right font-mono font-medium text-green-600">
                        {formatCurrency(item.costoCliente)}
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-6 w-6 p-0 hover:bg-red-100"
                          disabled={isSaving}
                        >
                          <Trash2 className="h-3 w-3 text-gray-500" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Footer con totales */}
              <tfoot>
                <tr className="bg-gray-100/80 border-t-2">
                  <td colSpan={3} className="px-3 py-2 text-right font-medium text-gray-700">
                    Total ({sortedItems.length} servicios):
                  </td>
                  <td className="px-3 py-2 text-center font-medium text-purple-700">
                    {stats.totalHoras}h
                  </td>
                  <td colSpan={2}></td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-gray-700">
                    {formatCurrency(stats.totalInterno)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-green-700">
                    {formatCurrency(stats.totalCliente)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <PlantillaServicioIndependienteMultiAddModal
        plantillaId={plantilla.id}
        edtId={plantilla.edtId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onItemsCreated={handleItemsAdded}
      />
    </div>
  )
}
