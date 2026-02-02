// ===================================================
// Archivo: CotizacionEquipoItemCreateModal.tsx
// Ubicación: src/components/cotizaciones/
// Descripción: Modal para crear/editar item de equipo manualmente (sin catálogo)
// Autor: Jesús Artemio
// Última actualización: 2025-02-01
// ===================================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Package, Loader2, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import type { CotizacionEquipoItem, CotizacionEquipoItemPayload, CategoriaEquipo } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  equipo: {
    id: string
    nombre: string
  }
  item?: CotizacionEquipoItem // Si se pasa, es modo edición
  onItemCreated: (item: CotizacionEquipoItem) => void
  onItemUpdated?: (item: CotizacionEquipoItem) => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function CotizacionEquipoItemCreateModal({
  isOpen,
  onClose,
  equipo,
  item,
  onItemCreated,
  onItemUpdated
}: Props) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const isEditMode = !!item

  // Form state
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [marca, setMarca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidad, setUnidad] = useState('Unidad')
  const [cantidad, setCantidad] = useState(1)
  const [precioLista, setPrecioLista] = useState<number | undefined>(undefined)
  const [precioInterno, setPrecioInterno] = useState(0)
  const [margen, setMargen] = useState(0.15) // 15% default

  useEffect(() => {
    if (isOpen) {
      loadCategorias()
      if (item) {
        // Edit mode - populate form with item data
        setCodigo(item.codigo || '')
        setDescripcion(item.descripcion || '')
        setMarca(item.marca || '')
        setCategoria(item.categoria || '')
        setUnidad(item.unidad || 'Unidad')
        setCantidad(item.cantidad || 1)
        setPrecioLista(item.precioLista || undefined)
        setPrecioInterno(item.precioInterno || 0)
        setMargen(item.margen || 0.15)
      } else {
        // Create mode - reset form
        resetForm()
      }
    }
  }, [isOpen, item])

  const loadCategorias = async () => {
    setLoading(true)
    try {
      const data = await getCategoriasEquipo()
      setCategorias(data)
    } catch (error) {
      console.error('Error loading categorias:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCodigo('')
    setDescripcion('')
    setMarca('')
    setCategoria('')
    setUnidad('Unidad')
    setCantidad(1)
    setPrecioLista(undefined)
    setPrecioInterno(0)
    setMargen(0.15)
  }

  // Calcular costos en tiempo real
  const calculados = useMemo(() => {
    // precioCliente = precioInterno × (1 + margen)
    const precioCliente = +(precioInterno * (1 + margen)).toFixed(2)
    // costos
    const costoInterno = +(precioInterno * cantidad).toFixed(2)
    const costoCliente = +(precioCliente * cantidad).toFixed(2)
    // diferencia con precio lista
    const diferencia = precioLista ? +((precioInterno - precioLista) * cantidad).toFixed(2) : null
    // rentabilidad %
    const rentabilidad = costoInterno > 0 ? ((costoCliente - costoInterno) / costoInterno) * 100 : 0

    return {
      precioCliente,
      costoInterno,
      costoCliente,
      diferencia,
      rentabilidad
    }
  }, [precioInterno, margen, cantidad, precioLista])

  const handleSave = async () => {
    // Validaciones
    if (!codigo.trim()) {
      toast.error('El código es requerido')
      return
    }
    if (!descripcion.trim()) {
      toast.error('La descripción es requerida')
      return
    }
    if (precioInterno <= 0) {
      toast.error('El precio real debe ser mayor a 0')
      return
    }
    if (cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    setSaving(true)
    try {
      const payload: CotizacionEquipoItemPayload = {
        cotizacionEquipoId: equipo.id,
        codigo: codigo.trim(),
        descripcion: descripcion.trim(),
        categoria: categoria.trim() || 'Sin categoría',
        unidad: unidad.trim() || 'Unidad',
        marca: marca.trim() || 'Sin marca',
        precioLista: precioLista || undefined,
        precioInterno,
        margen,
        precioCliente: calculados.precioCliente,
        cantidad,
        costoInterno: calculados.costoInterno,
        costoCliente: calculados.costoCliente
      }

      if (isEditMode && item) {
        // Update existing item
        const res = await fetch(`/api/cotizacion-equipo-item/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('Error al actualizar')
        const updated = await res.json()
        toast.success('Equipo actualizado')
        onItemUpdated?.(updated)
      } else {
        // Create new item
        const res = await fetch('/api/cotizacion-equipo-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('Error al crear')
        const created = await res.json()
        toast.success('Equipo creado')
        onItemCreated(created)
      }

      handleClose()
    } catch (error) {
      console.error('Error saving item:', error)
      toast.error(isEditMode ? 'Error al actualizar el equipo' : 'Error al crear el equipo')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Package className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {isEditMode ? 'Editar Equipo' : 'Nuevo Equipo'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">{equipo.nombre}</p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
        <div className="space-y-3">
          {/* Código y Marca */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Código *</Label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="EQ-001"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Marca</Label>
              <Input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Siemens"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <Label className="text-xs">Descripción *</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del equipo..."
              rows={2}
              className="text-sm min-h-[48px] resize-none"
            />
          </div>

          {/* Categoría y Unidad */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.nombre} className="text-sm">
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Unidad</Label>
              <Input
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="Unidad"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Precios */}
          <div className="border rounded-lg p-3 bg-gray-50/50">
            <div className="flex items-center gap-1.5 mb-3">
              <Calculator className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-medium">Precios y Cantidad</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">P.Lista</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={precioLista || ''}
                  onChange={(e) => setPrecioLista(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Ref."
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">P.Real *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={precioInterno || ''}
                  onChange={(e) => setPrecioInterno(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Margen</Label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.01}
                  value={+(1 + margen).toFixed(2)}
                  onChange={(e) => setMargen(Math.max(0, (parseFloat(e.target.value) || 1) - 1))}
                  placeholder="1.15"
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Cantidad *</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            {/* Precio Cliente calculado */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">P.Cliente (calculado):</span>
                <span className="font-mono font-medium text-green-600">
                  {formatCurrency(calculados.precioCliente)}
                </span>
              </div>
            </div>
          </div>

          {/* Resumen de costos */}
          <div className={cn(
            "grid grid-cols-4 gap-2 p-3 rounded-lg border",
            calculados.rentabilidad >= 15 ? "bg-green-50/50 border-green-200" : "bg-orange-50/50 border-orange-200"
          )}>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">C.Interno</p>
              <p className="text-sm font-semibold text-gray-700">
                {formatCurrency(calculados.costoInterno)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">C.Cliente</p>
              <p className="text-sm font-bold text-green-600">
                {formatCurrency(calculados.costoCliente)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Rent.</p>
              <p className={cn(
                "text-sm font-semibold",
                calculados.rentabilidad >= 20 ? 'text-emerald-600' :
                calculados.rentabilidad >= 10 ? 'text-amber-600' : 'text-red-500'
              )}>
                {calculados.rentabilidad.toFixed(0)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Difer.</p>
              <p className={cn(
                "text-sm font-semibold",
                calculados.diferencia === null ? 'text-gray-400' :
                calculados.diferencia >= 0 ? 'text-green-600' : 'text-red-500'
              )}>
                {calculados.diferencia !== null ? formatCurrency(calculados.diferencia) : '-'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !codigo.trim() || !descripcion.trim() || precioInterno <= 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : isEditMode ? (
                'Actualizar'
              ) : (
                'Crear Equipo'
              )}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
