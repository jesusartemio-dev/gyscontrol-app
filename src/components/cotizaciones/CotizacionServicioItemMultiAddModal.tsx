// ===================================================
// 📁 Archivo: CotizacionServicioItemMultiAddModal.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Modal para agregar múltiples items de servicio desde catálogo
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-01-28
// ===================================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Plus,
  Package,
  Loader2,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { getCatalogoServicios } from '@/lib/services/catalogoServicio'
import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { formatCurrency } from '@/lib/utils/plantilla-utils'
import { cn } from '@/lib/utils'
import type { CatalogoServicio, Recurso, UnidadServicio, CotizacionServicioItem, CotizacionServicioItemPayload } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    nombre: string
    edtId?: string
    edt?: { id: string; nombre: string }
  }
  onItemsCreated: (items: CotizacionServicioItem[]) => void
  existingItemIds?: string[] // IDs de catalogoServicio ya agregados
}

export default function CotizacionServicioItemMultiAddModal({
  isOpen,
  onClose,
  servicio,
  onItemsCreated,
  existingItemIds = []
}: Props) {
  const [servicios, setServicios] = useState<CatalogoServicio[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [unidadesServicio, setUnidadesServicio] = useState<UnidadServicio[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // Filtrar servicios por el EDT del grupo de servicio actual
  const filteredServicios = useMemo(() => {
    // Filtrar por EDT: usar edtId del servicio (grupo) o el edt.id
    const targetEdtId = servicio.edtId || servicio.edt?.id
    let filtered = servicios

    // Solo mostrar servicios del mismo EDT
    if (targetEdtId) {
      filtered = filtered.filter(s => s.categoriaId === targetEdtId)
    }

    // Excluir servicios ya agregados
    if (existingItemIds.length > 0) {
      const existingSet = new Set(existingItemIds)
      filtered = filtered.filter(s => !existingSet.has(s.id!))
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s =>
        s.nombre.toLowerCase().includes(term) ||
        s.descripcion?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [searchTerm, servicios, servicio.edtId, servicio.edt?.id, existingItemIds])

  // Calcular costo estimado de un servicio (usando fórmula escalonada estándar)
  // Muestra el mismo cálculo que el catálogo: HH Total × Costo/Hora (sin margen)
  const calcularCostoEstimado = (item: CatalogoServicio) => {
    const recurso = recursos.find(r => r.id === item.recursoId)
    const costoHora = recurso?.costoHora || item.recurso?.costoHora || 0

    // Fórmula escalonada: HH = HH_base + (cantidad - 1) × HH_repetido
    // Con cantidad = 1: HH = HH_base
    const cantidad = item.cantidad || 1
    const horasBase = (item.horaBase ?? 0) + Math.max(0, cantidad - 1) * (item.horaRepetido ?? 0)

    // Aplicar factor de dificultad
    const factorDificultad = item.nivelDificultad ?? 1
    const horaTotal = horasBase * factorDificultad

    // Costo total = HH × $/Hora (igual que el catálogo, sin margen)
    const costoTotal = horaTotal * costoHora
    return { horaTotal, costoHora, costoTotal }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [serviciosData, recursosData, unidadesData] = await Promise.all([
        getCatalogoServicios(),
        getRecursos(),
        getUnidadesServicio()
      ])

      setServicios(serviciosData)
      setRecursos(recursosData)
      setUnidadesServicio(unidadesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredServicios.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredServicios.map(s => s.id!)))
    }
  }

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un servicio')
      return
    }

    setSaving(true)
    try {
      const createdItems: CotizacionServicioItem[] = []
      const validRecursos = recursos.filter(r => r && r.id)
      const validUnidades = unidadesServicio.filter(u => u && u.id)
      const defaultRecurso = validRecursos.find(r => r.nombre === 'Ingeniero Senior') || validRecursos[0]
      const defaultUnidad = validUnidades.find(u => u.nombre === 'hora') || validUnidades[0]

      for (const id of selectedIds) {
        const catalogoServicio = servicios.find(s => s.id === id)
        if (!catalogoServicio) continue

        // Usar cantidad del catálogo o 1 por defecto
        const cantidad = catalogoServicio.cantidad || 1

        // Fórmula escalonada: HH = HH_base + (cantidad - 1) × HH_repetido
        const horasBase = (catalogoServicio.horaBase ?? 0) + Math.max(0, cantidad - 1) * (catalogoServicio.horaRepetido ?? 0)
        const factorDificultad = catalogoServicio.nivelDificultad ?? 1
        const horaTotal = horasBase * factorDificultad

        const servicioRecurso = catalogoServicio.recurso || validRecursos.find(r => r.id === catalogoServicio.recursoId)
        const costoHora = servicioRecurso?.costoHora || defaultRecurso?.costoHora || 0
        const factorSeguridad = 1.0
        const margen = 1.35
        const calculatedCostoInterno = +(horaTotal * costoHora * factorSeguridad).toFixed(2)
        const calculatedPrecioCliente = +(calculatedCostoInterno * margen).toFixed(2)

        const payload: CotizacionServicioItemPayload = {
          cotizacionServicioId: servicio.id,
          catalogoServicioId: catalogoServicio.id,
          nombre: catalogoServicio.nombre,
          descripcion: catalogoServicio.descripcion,
          edtId: catalogoServicio.edt?.id || catalogoServicio.categoriaId,
          unidadServicioId: defaultUnidad?.id || '',
          unidadServicioNombre: defaultUnidad?.nombre || '',
          recursoId: defaultRecurso?.id || '',
          recursoNombre: defaultRecurso?.nombre || '',
          formula: 'Escalonada',
          horaBase: catalogoServicio.horaBase,
          horaRepetido: catalogoServicio.horaRepetido,
          horaUnidad: undefined,
          horaFijo: undefined,
          costoHora,
          cantidad,
          horaTotal,
          factorSeguridad,
          margen,
          costoInterno: calculatedCostoInterno,
          costoCliente: calculatedPrecioCliente
        }

        const createdItem = await createCotizacionServicioItem(payload)
        createdItems.push(createdItem)
      }

      toast.success(`${createdItems.length} servicio(s) agregado(s)`)
      onItemsCreated(createdItems)
      handleClose()
    } catch (error) {
      console.error('Error saving items:', error)
      toast.error('Error al guardar los servicios')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    setSearchTerm('')
    onClose()
  }

  const allSelected = filteredServicios.length > 0 && selectedIds.size === filteredServicios.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredServicios.length

  // Calcular total estimado de seleccionados (mismo cálculo que el catálogo)
  const totalEstimado = useMemo(() => {
    let total = 0
    for (const id of selectedIds) {
      const item = servicios.find(s => s.id === id)
      if (item) {
        const costos = calcularCostoEstimado(item)
        total += costos.costoTotal
      }
    }
    return total
  }, [selectedIds, servicios, recursos])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Agregar Servicios
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  {servicio.edt?.nombre || servicio.nombre}
                </p>
              </div>
            </div>
            {selectedIds.size > 0 && (
              <Badge className="bg-blue-600 text-white">
                {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-2 border-b bg-gray-50/50 flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-8 bg-white text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {filteredServicios.length} disponible{filteredServicios.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-gray-500">Cargando servicios...</p>
            </div>
          ) : filteredServicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No se encontraron servicios</p>
              {searchTerm && (
                <p className="text-xs text-gray-400 mt-1">
                  Intenta con otro término de búsqueda
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b">
                  <th className="w-10 px-3 py-2 text-left">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) (el as any).indeterminate = someSelected
                      }}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Servicio</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 hidden sm:table-cell">Recurso</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">HH Total</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Costo/Hora</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">Costo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredServicios.map((item) => {
                  const isSelected = selectedIds.has(item.id!)
                  const costos = calcularCostoEstimado(item)
                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelection(item.id!)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(item.id!)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          "font-medium",
                          isSelected ? "text-blue-900" : "text-gray-900"
                        )}>
                          {item.nombre}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {item.recurso?.nombre || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="tabular-nums text-blue-600 font-medium">
                          {costos.horaTotal.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                        {formatCurrency(costos.costoHora)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={cn(
                          "font-semibold tabular-nums",
                          isSelected ? "text-blue-700" : "text-green-600"
                        )}>
                          {formatCurrency(costos.costoTotal)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {selectedIds.size > 0 ? (
                <>
                  <span className="font-medium text-blue-600">{selectedIds.size}</span> servicio{selectedIds.size !== 1 ? 's' : ''}
                </>
              ) : (
                'Selecciona servicios'
              )}
            </span>
            {selectedIds.size > 0 && (
              <span className="text-sm font-semibold text-green-600">
                Total: {formatCurrency(totalEstimado)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose} size="sm">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedIds.size === 0 || saving}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar ({selectedIds.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
