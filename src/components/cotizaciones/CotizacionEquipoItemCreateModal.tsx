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
import { Checkbox } from '@/components/ui/checkbox'
import { Package, Loader2, Calculator, Database } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import { createCatalogoEquipo } from '@/lib/services/catalogoEquipo'
import type { CotizacionEquipoItem, CotizacionEquipoItemPayload, CategoriaEquipo, Unidad, CatalogoEquipoPayload } from '@/types'

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
  defaultGuardarEnCatalogo?: boolean
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
  onItemUpdated,
  defaultGuardarEnCatalogo = false
}: Props) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const isEditMode = !!item

  // Form state
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [marca, setMarca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [unidad, setUnidad] = useState('Unidad')
  const [unidadId, setUnidadId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [precioLista, setPrecioLista] = useState(0)
  const [factorCosto, setFactorCosto] = useState(1.00)
  const [factorVenta, setFactorVenta] = useState(1.15)
  const [factorCostoDisplay, setFactorCostoDisplay] = useState('1.00')
  const [factorVentaDisplay, setFactorVentaDisplay] = useState('1.15')
  const [guardarEnCatalogo, setGuardarEnCatalogo] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFormData()
      if (!item) {
        resetForm()
        setGuardarEnCatalogo(defaultGuardarEnCatalogo)
      }
    }
  }, [isOpen, item, defaultGuardarEnCatalogo])

  // Populate edit mode after data is loaded
  useEffect(() => {
    if (isOpen && item && categorias.length > 0 && unidades.length > 0) {
      setCodigo(item.codigo || '')
      setDescripcion(item.descripcion || '')
      setMarca(item.marca || '')
      setCategoria(item.categoria || '')
      const matchedCat = categorias.find(c => c.nombre === item.categoria)
      setCategoriaId(matchedCat?.id || '')
      setUnidad(item.unidad || 'Unidad')
      const matchedUni = unidades.find(u => u.nombre === item.unidad)
      setUnidadId(matchedUni?.id || '')
      setCantidad(item.cantidad || 1)
      setPrecioLista(item.precioLista || 0)
      setFactorCosto(item.factorCosto || 1.00)
      setFactorVenta(item.factorVenta || 1.15)
      setFactorCostoDisplay((item.factorCosto || 1).toFixed(2))
      setFactorVentaDisplay((item.factorVenta || 1.15).toFixed(2))
    }
  }, [isOpen, item, categorias, unidades])

  const loadFormData = async () => {
    setLoading(true)
    try {
      const [cats, unis] = await Promise.all([
        getCategoriasEquipo(),
        getUnidades()
      ])
      setCategorias(cats)
      setUnidades(unis)
    } catch (error) {
      console.error('Error loading form data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCodigo('')
    setDescripcion('')
    setMarca('')
    setCategoria('')
    setCategoriaId('')
    setUnidad('Unidad')
    setUnidadId('')
    setCantidad(1)
    setPrecioLista(0)
    setFactorCosto(1.00)
    setFactorVenta(1.15)
    setFactorCostoDisplay('1.00')
    setFactorVentaDisplay('1.15')
    setGuardarEnCatalogo(false)
  }

  // Calcular costos en tiempo real
  const precioInterno = +(precioLista * factorCosto).toFixed(2)

  const calculados = useMemo(() => {
    const pInterno = +(precioLista * factorCosto).toFixed(2)
    // precioCliente = precioInterno × factorVenta
    const precioCliente = +(pInterno * factorVenta).toFixed(2)
    // costos
    const costoInterno = +(pInterno * cantidad).toFixed(2)
    const costoCliente = +(precioCliente * cantidad).toFixed(2)
    // rentabilidad %
    const rentabilidad = costoInterno > 0 ? ((costoCliente - costoInterno) / costoInterno) * 100 : 0

    return {
      precioInterno: pInterno,
      precioCliente,
      costoInterno,
      costoCliente,
      rentabilidad
    }
  }, [precioLista, factorCosto, factorVenta, cantidad])

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
    if (precioLista <= 0) {
      toast.error('El precio lista debe ser mayor a 0')
      return
    }
    if (cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }
    if (guardarEnCatalogo && !categoriaId) {
      toast.error('Selecciona una categoría para guardar en catálogo')
      return
    }
    if (guardarEnCatalogo && !unidadId) {
      toast.error('Selecciona una unidad para guardar en catálogo')
      return
    }

    setSaving(true)
    try {
      let catalogoEquipoId: string | undefined = undefined

      // Si "Guardar en Catálogo" está marcado, crear primero en catálogo
      if (guardarEnCatalogo && !isEditMode) {
        try {
          const catalogoPayload: CatalogoEquipoPayload = {
            codigo: codigo.trim(),
            descripcion: descripcion.trim(),
            marca: marca.trim() || 'Sin marca',
            precioLista,
            precioInterno: calculados.precioInterno,
            factorCosto,
            factorVenta,
            precioVenta: calculados.precioCliente,
            categoriaId,
            unidadId,
            estado: 'activo'
          }
          const catalogoEquipo = await createCatalogoEquipo(catalogoPayload)
          catalogoEquipoId = catalogoEquipo.id
          toast.success('Equipo guardado en catálogo')
        } catch (error) {
          console.error('Error saving to catalog:', error)
          toast.warning('No se pudo guardar en catálogo (código duplicado?). Se creará solo en la cotización.')
        }
      }

      const payload: CotizacionEquipoItemPayload = {
        cotizacionEquipoId: equipo.id,
        catalogoEquipoId,
        codigo: codigo.trim(),
        descripcion: descripcion.trim(),
        categoria: categoria.trim() || 'Sin categoría',
        unidad: unidad.trim() || 'Unidad',
        marca: marca.trim() || 'Sin marca',
        precioLista,
        precioInterno: calculados.precioInterno,
        factorCosto,
        factorVenta,
        precioCliente: calculados.precioCliente,
        cantidad,
        costoInterno: calculados.costoInterno,
        costoCliente: calculados.costoCliente
      }

      if (isEditMode && item) {
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
              <Select value={categoriaId} onValueChange={(id) => {
                setCategoriaId(id)
                const cat = categorias.find(c => c.id === id)
                setCategoria(cat?.nombre || '')
              }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id!} className="text-sm">
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Unidad</Label>
              <Select value={unidadId} onValueChange={(id) => {
                setUnidadId(id)
                const uni = unidades.find(u => u.id === id)
                setUnidad(uni?.nombre || 'Unidad')
              }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-sm">
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label className="text-[10px] text-muted-foreground">P.Lista *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={precioLista || ''}
                  onChange={(e) => setPrecioLista(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">F.Costo</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={3}
                  step={0.01}
                  value={factorCostoDisplay}
                  onChange={(e) => {
                    setFactorCostoDisplay(e.target.value)
                    setFactorCosto(parseFloat(e.target.value) || 1.00)
                  }}
                  onBlur={() => setFactorCostoDisplay(factorCosto.toFixed(2))}
                  placeholder="1.00"
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">F.Venta</Label>
                <Input
                  type="number"
                  min={1}
                  max={3}
                  step={0.01}
                  value={factorVentaDisplay}
                  onChange={(e) => {
                    setFactorVentaDisplay(e.target.value)
                    setFactorVenta(parseFloat(e.target.value) || 1.15)
                  }}
                  onBlur={() => setFactorVentaDisplay(factorVenta.toFixed(2))}
                  placeholder="1.15"
                  className="h-7 text-xs font-mono"
                />
                <span className="text-[9px] text-muted-foreground">
                  {((factorVenta - 1) * 100).toFixed(0)}%
                </span>
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

            {/* Precios calculados */}
            <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">P.Interno (P.Lista × F.Costo):</span>
                <span className="font-mono font-medium text-blue-600">
                  {formatCurrency(calculados.precioInterno)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">P.Cliente (P.Interno × F.Venta):</span>
                <span className="font-mono font-medium text-green-600">
                  {formatCurrency(calculados.precioCliente)}
                </span>
              </div>
            </div>
          </div>

          {/* Resumen de costos */}
          <div className={cn(
            "grid grid-cols-3 gap-2 p-3 rounded-lg border",
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
          </div>

          {/* Guardar en Catálogo - solo en modo crear */}
          {!isEditMode && (
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="guardarCatalogo"
                checked={guardarEnCatalogo}
                onCheckedChange={(checked) => setGuardarEnCatalogo(checked === true)}
              />
              <Label
                htmlFor="guardarCatalogo"
                className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
              >
                <Database className="h-3 w-3" />
                Guardar en Catálogo de Equipos
              </Label>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !codigo.trim() || !descripcion.trim() || precioLista <= 0}
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
