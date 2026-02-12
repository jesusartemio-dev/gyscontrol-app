'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  Package,
  Plus,
  ArrowLeft,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CatalogoEquipo {
  id: string
  codigo: string
  descripcion: string
  marca: string
  precioInterno: number
  precioVenta: number
  categoriaEquipo?: { id: string; nombre: string } | null
  unidad?: { id: string; nombre: string } | null
}

interface Props {
  open: boolean
  onClose: () => void
  pedidoId: string
  onCreated: () => void
}

type Step = 'buscar' | 'desde-catalogo' | 'nuevo'

export function PedidoItemDirectoModal({ open, onClose, pedidoId, onCreated }: Props) {
  const [step, setStep] = useState<Step>('buscar')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Catalogo search
  const [catalogoItems, setCatalogoItems] = useState<CatalogoEquipo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingCatalogo, setLoadingCatalogo] = useState(false)
  const [selectedCatalogo, setSelectedCatalogo] = useState<CatalogoEquipo | null>(null)

  // Dropdowns
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([])
  const [unidades, setUnidades] = useState<{ id: string; nombre: string }[]>([])

  // Form fields
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [marca, setMarca] = useState('')
  const [unidad, setUnidad] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [categoriaNombre, setCategoriaNombre] = useState('')
  const [cantidadPedida, setCantidadPedida] = useState(1)
  const [precioUnitario, setPrecioUnitario] = useState<number | null>(null)
  const [tiempoEntrega, setTiempoEntrega] = useState('')
  const [tiempoEntregaDias, setTiempoEntregaDias] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [agregarAlCatalogo, setAgregarAlCatalogo] = useState(true)
  const [catalogoEquipoId, setCatalogoEquipoId] = useState<string | null>(null)

  // Load catalogo and dropdowns on open
  useEffect(() => {
    if (!open) return
    resetForm()
    loadData()
  }, [open])

  const loadData = async () => {
    setLoadingCatalogo(true)
    try {
      const [catRes, uniRes, eqRes] = await Promise.all([
        fetch('/api/categoria-equipo', { cache: 'no-store' }),
        fetch('/api/unidad', { cache: 'no-store' }),
        fetch('/api/catalogo-equipo', { cache: 'no-store' }),
      ])
      if (catRes.ok) setCategorias(await catRes.json())
      if (uniRes.ok) setUnidades(await uniRes.json())
      if (eqRes.ok) setCatalogoItems(await eqRes.json())
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoadingCatalogo(false)
    }
  }

  const resetForm = () => {
    setStep('buscar')
    setSearchTerm('')
    setSelectedCatalogo(null)
    setCodigo('')
    setDescripcion('')
    setMarca('')
    setUnidad('')
    setCategoriaId('')
    setCategoriaNombre('')
    setCantidadPedida(1)
    setPrecioUnitario(null)
    setTiempoEntrega('')
    setTiempoEntregaDias(null)
    setComentario('')
    setAgregarAlCatalogo(true)
    setCatalogoEquipoId(null)
  }

  // Filter catalogo items by search
  const filteredCatalogo = useMemo(() => {
    if (!searchTerm.trim()) return catalogoItems.slice(0, 20)
    const s = searchTerm.toLowerCase()
    return catalogoItems
      .filter(eq =>
        eq.codigo.toLowerCase().includes(s) ||
        eq.descripcion.toLowerCase().includes(s) ||
        eq.marca.toLowerCase().includes(s)
      )
      .slice(0, 20)
  }, [catalogoItems, searchTerm])

  // Select from catalogo
  const handleSelectCatalogo = (equipo: CatalogoEquipo) => {
    setSelectedCatalogo(equipo)
    setCodigo(equipo.codigo)
    setDescripcion(equipo.descripcion)
    setMarca(equipo.marca)
    setUnidad(equipo.unidad?.nombre || '')
    setCategoriaId(equipo.categoriaEquipo?.id || '')
    setCategoriaNombre(equipo.categoriaEquipo?.nombre || '')
    setPrecioUnitario(equipo.precioVenta || equipo.precioInterno || null)
    setCatalogoEquipoId(equipo.id)
    setStep('desde-catalogo')
  }

  // Go to "create new" step
  const handleNuevo = async () => {
    // Generate TEMP code
    const today = new Date()
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `TEMP-${yyyymmdd}`

    // Count existing TEMP items for today to get correlative
    const existingTemp = catalogoItems.filter(eq => eq.codigo.startsWith(prefix)).length
    const correlativo = String(existingTemp + 1).padStart(3, '0')

    setCodigo(`${prefix}-${correlativo}`)
    setStep('nuevo')
  }

  const handleSubmit = async () => {
    if (!cantidadPedida || cantidadPedida <= 0) {
      toast.error('Ingrese una cantidad válida')
      return
    }
    if (!codigo || !descripcion || !unidad) {
      toast.error('Complete los campos obligatorios: código, descripción y unidad')
      return
    }

    setSubmitting(true)
    try {
      // If creating new and "agregar al catalogo" is checked, create catalog entry first
      let finalCatalogoEquipoId = catalogoEquipoId

      if (step === 'nuevo' && agregarAlCatalogo && categoriaId) {
        const unidadObj = unidades.find(u => u.nombre === unidad)
        if (!unidadObj) {
          toast.error('Seleccione una unidad válida')
          setSubmitting(false)
          return
        }

        const catalogoRes = await fetch('/api/catalogo-equipo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo,
            descripcion,
            marca: marca || 'SIN-MARCA',
            precioInterno: precioUnitario || 0,
            margen: 0,
            precioVenta: precioUnitario || 0,
            categoriaId,
            unidadId: unidadObj.id,
            estado: 'activo',
          }),
        })

        if (catalogoRes.ok) {
          const nuevoCatalogo = await catalogoRes.json()
          finalCatalogoEquipoId = nuevoCatalogo.id
          toast.success('Equipo agregado al catálogo')
        } else {
          const err = await catalogoRes.json()
          console.warn('No se pudo crear en catálogo:', err.error)
        }
      }

      // Create the pedido item (direct, without listaEquipoItemId)
      const costoTotal = precioUnitario ? precioUnitario * cantidadPedida : null

      const res = await fetch('/api/pedido-equipo-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          responsableId: '', // API uses session user
          codigo,
          descripcion,
          unidad,
          categoria: categoriaNombre || null,
          marca: marca || null,
          catalogoEquipoId: finalCatalogoEquipoId,
          cantidadPedida,
          precioUnitario,
          costoTotal,
          tiempoEntrega: tiempoEntrega || null,
          tiempoEntregaDias,
          comentarioLogistica: comentario || null,
          estado: 'pendiente',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Error al crear item')
        return
      }

      toast.success('Item directo agregado al pedido')
      onCreated()
      onClose()
    } catch (error) {
      toast.error('Error al crear item: ' + String(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4 text-blue-600" />
            Item Directo
            {step !== 'buscar' && (
              <Badge variant="outline" className="text-[10px] ml-1">
                {step === 'desde-catalogo' ? 'Desde catálogo' : 'Nuevo equipo'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ===== STEP: BUSCAR EN CATALOGO ===== */}
        {step === 'buscar' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipo por código, descripción o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
                autoFocus
              />
            </div>

            {loadingCatalogo ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
                  {filteredCatalogo.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No se encontraron equipos
                    </div>
                  ) : (
                    filteredCatalogo.map((eq) => (
                      <button
                        key={eq.id}
                        onClick={() => handleSelectCatalogo(eq)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
                      >
                        <div className="h-7 w-7 rounded bg-gray-100 flex items-center justify-center shrink-0">
                          <Package className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium">{eq.codigo}</span>
                            {eq.categoriaEquipo && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                {eq.categoriaEquipo.nombre}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{eq.descripcion}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {eq.marca} {eq.unidad ? `· ${eq.unidad.nombre}` : ''}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5"
                  onClick={handleNuevo}
                >
                  <Plus className="h-3.5 w-3.5" />
                  No está en el catálogo - Crear nuevo
                </Button>
              </>
            )}
          </div>
        )}

        {/* ===== STEP: DESDE CATALOGO ===== */}
        {step === 'desde-catalogo' && selectedCatalogo && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('buscar')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver a buscar
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Equipo seleccionado del catálogo</span>
              </div>
              <p className="text-xs"><span className="font-mono font-medium">{codigo}</span> — {descripcion}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {marca} · {unidad} · {categoriaNombre}
              </p>
            </div>

            {renderFormFields()}

            <Button
              className="w-full text-xs"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Agregar al Pedido
            </Button>
          </div>
        )}

        {/* ===== STEP: NUEVO EQUIPO ===== */}
        {step === 'nuevo' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('buscar')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver a buscar
            </button>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
              <p className="text-[10px] text-amber-700">
                Código temporal generado: <span className="font-mono font-bold">{codigo}</span>
              </p>
            </div>

            {/* Editable fields for new */}
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-[10px]">Descripción *</Label>
                <Input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Descripción del equipo"
                />
              </div>
              <div>
                <Label className="text-[10px]">Marca</Label>
                <Input
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Marca"
                />
              </div>
              <div>
                <Label className="text-[10px]">Unidad *</Label>
                <Select value={unidad} onValueChange={setUnidad}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.nombre}>
                        {u.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Categoría</Label>
                <Select
                  value={categoriaId}
                  onValueChange={(val) => {
                    setCategoriaId(val)
                    const cat = categorias.find(c => c.id === val)
                    setCategoriaNombre(cat?.nombre || '')
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {renderFormFields()}

            {/* Option to add to catalog */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
              <Checkbox
                id="agregarCatalogo"
                checked={agregarAlCatalogo}
                onCheckedChange={(v) => setAgregarAlCatalogo(v === true)}
              />
              <label htmlFor="agregarCatalogo" className="text-[10px] text-muted-foreground cursor-pointer">
                Agregar este equipo al catálogo central
              </label>
            </div>

            <Button
              className="w-full text-xs"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Agregar al Pedido
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  // Shared form fields for both "desde-catalogo" and "nuevo"
  function renderFormFields() {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Cantidad *</Label>
          <Input
            type="number"
            min={1}
            value={cantidadPedida}
            onChange={(e) => setCantidadPedida(Number(e.target.value))}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px]">Precio Unitario</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={precioUnitario ?? ''}
            onChange={(e) => setPrecioUnitario(e.target.value ? Number(e.target.value) : null)}
            className="h-8 text-xs"
            placeholder="0.00"
          />
        </div>
        <div>
          <Label className="text-[10px]">Tiempo Entrega</Label>
          <Input
            value={tiempoEntrega}
            onChange={(e) => setTiempoEntrega(e.target.value)}
            className="h-8 text-xs"
            placeholder="ej: 15 días"
          />
        </div>
        <div>
          <Label className="text-[10px]">Días Entrega</Label>
          <Input
            type="number"
            min={0}
            value={tiempoEntregaDias ?? ''}
            onChange={(e) => setTiempoEntregaDias(e.target.value ? Number(e.target.value) : null)}
            className="h-8 text-xs"
            placeholder="0"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-[10px]">Comentario</Label>
          <Input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="h-8 text-xs"
            placeholder="Comentario adicional..."
          />
        </div>
      </div>
    )
  }
}
