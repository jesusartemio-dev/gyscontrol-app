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
  PackagePlus,
} from 'lucide-react'
import { cn, normalizeStr } from '@/lib/utils'

interface CatalogoEquipo {
  id: string
  codigo: string
  descripcion: string
  marca: string
  precioLista: number
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

type RightPanel = 'empty' | 'catalogo' | 'nuevo'

export function PedidoItemDirectoModal({ open, onClose, pedidoId, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const [catalogoItems, setCatalogoItems] = useState<CatalogoEquipo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')
  const [loadingCatalogo, setLoadingCatalogo] = useState(false)
  const [selectedCatalogo, setSelectedCatalogo] = useState<CatalogoEquipo | null>(null)
  const [rightPanel, setRightPanel] = useState<RightPanel>('empty')

  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([])
  const [unidades, setUnidades] = useState<{ id: string; nombre: string }[]>([])

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
    setSearchTerm('')
    setCategoriaFiltro('__ALL__')
    setSelectedCatalogo(null)
    setRightPanel('empty')
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

  const categoriasDisponibles = useMemo(() =>
    [...new Set(catalogoItems.map(eq => eq.categoriaEquipo?.nombre).filter(Boolean))]
      .sort() as string[],
    [catalogoItems]
  )

  const { filteredCatalogo, totalMatches } = useMemo(() => {
    const words = normalizeStr(searchTerm).split(/\s+/).filter(Boolean)
    const all = catalogoItems.filter(eq => {
      const matchSearch = words.length === 0 || (() => {
        const haystack = normalizeStr(`${eq.codigo} ${eq.descripcion} ${eq.marca} ${eq.categoriaEquipo?.nombre || ''}`)
        return words.every(w => haystack.includes(w))
      })()
      const matchCat = categoriaFiltro === '__ALL__' || normalizeStr(eq.categoriaEquipo?.nombre) === normalizeStr(categoriaFiltro)
      return matchSearch && matchCat
    })
    return { filteredCatalogo: all.slice(0, 80), totalMatches: all.length }
  }, [catalogoItems, searchTerm, categoriaFiltro])

  const handleSelectCatalogo = (equipo: CatalogoEquipo) => {
    setSelectedCatalogo(equipo)
    setCodigo(equipo.codigo)
    setDescripcion(equipo.descripcion)
    setMarca(equipo.marca)
    setUnidad(equipo.unidad?.nombre || '')
    setCategoriaId(equipo.categoriaEquipo?.id || '')
    setCategoriaNombre(equipo.categoriaEquipo?.nombre || '')
    setPrecioUnitario(equipo.precioLista || null)
    setCatalogoEquipoId(equipo.id)
    setRightPanel('catalogo')
  }

  const handleNuevo = () => {
    const today = new Date()
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `TEMP-${yyyymmdd}`
    const existingTemp = catalogoItems.filter(eq => eq.codigo.startsWith(prefix)).length
    const correlativo = String(existingTemp + 1).padStart(3, '0')
    setCodigo(`${prefix}-${correlativo}`)
    setSelectedCatalogo(null)
    setCatalogoEquipoId(null)
    setDescripcion('')
    setMarca('')
    setUnidad('')
    setCategoriaId('')
    setCategoriaNombre('')
    setPrecioUnitario(null)
    setRightPanel('nuevo')
  }

  const handleSubmit = async () => {
    if (!cantidadPedida || cantidadPedida <= 0) {
      toast.error('Ingrese una cantidad válida')
      return
    }
    if (!codigo || !descripcion || !unidad) {
      toast.error('Complete los campos obligatorios: descripción y unidad')
      return
    }

    setSubmitting(true)
    try {
      let finalCatalogoEquipoId = catalogoEquipoId

      if (rightPanel === 'nuevo' && agregarAlCatalogo && categoriaId) {
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

      const costoTotal = precioUnitario ? precioUnitario * cantidadPedida : null

      const res = await fetch('/api/pedido-equipo-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          responsableId: '',
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

      toast.success('Ítem agregado al pedido')
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
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 py-3.5 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-blue-600" />
            Item de Catálogo
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[290px,1fr] divide-x" style={{ height: 540 }}>

          {/* LEFT — search + category + list */}
          <div className="flex flex-col min-h-0">
            <div className="p-2.5 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Código, descripción, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  autoFocus
                />
              </div>
              {categoriasDisponibles.length > 0 && (
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__" className="text-xs">Todas las categorías</SelectItem>
                    {categoriasDisponibles.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!loadingCatalogo && catalogoItems.length > 0 && (
                <p className="text-[10px] text-muted-foreground px-0.5">
                  {searchTerm.trim() || categoriaFiltro !== '__ALL__'
                    ? totalMatches === 0
                      ? 'Sin resultados'
                      : totalMatches > 80
                        ? `Mostrando 80 de ${totalMatches} resultados`
                        : `${totalMatches} resultado${totalMatches !== 1 ? 's' : ''}`
                    : `${catalogoItems.length} equipos en catálogo`
                  }
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingCatalogo ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : filteredCatalogo.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-10">Sin resultados</p>
              ) : (
                filteredCatalogo.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => handleSelectCatalogo(eq)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left border-b last:border-b-0 transition-colors hover:bg-blue-50',
                      selectedCatalogo?.id === eq.id
                        ? 'bg-blue-50 border-l-2 border-l-blue-500 pl-[10px]'
                        : 'border-l-2 border-l-transparent'
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                      <span className="text-[11px] font-mono font-semibold text-gray-800 truncate leading-tight">
                        {eq.codigo}
                      </span>
                      {eq.categoriaEquipo && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0 h-3.5 shrink-0 leading-none"
                        >
                          {eq.categoriaEquipo.nombre}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{eq.descripcion}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {[eq.marca, eq.unidad?.nombre].filter(Boolean).join(' · ')}
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="p-2 border-t bg-gray-50/50">
              <button
                onClick={handleNuevo}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors hover:bg-blue-50',
                  rightPanel === 'nuevo'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-muted-foreground hover:text-blue-600'
                )}
              >
                <PackagePlus className="h-3.5 w-3.5 shrink-0" />
                No está en el catálogo — Crear nuevo
              </button>
            </div>
          </div>

          {/* RIGHT — detail + form */}
          <div className="flex flex-col overflow-y-auto">
            {rightPanel === 'empty' && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Package className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">Selecciona un equipo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Busca en la lista o crea uno nuevo
                </p>
              </div>
            )}

            {rightPanel === 'catalogo' && selectedCatalogo && (
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Package className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-mono font-bold text-blue-900">{codigo}</span>
                      {categoriaNombre && (
                        <Badge className="text-[9px] px-1.5 h-4 bg-blue-200 text-blue-800 hover:bg-blue-200 border-0">
                          {categoriaNombre}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 leading-snug">{descripcion}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {[marca, unidad].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>

                {renderFormFields()}

                <Button
                  className="w-full text-xs h-8"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Agregar al Pedido
                </Button>
              </div>
            )}

            {rightPanel === 'nuevo' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <PackagePlus className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-700">
                    Código temporal: <span className="font-mono font-bold">{codigo}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground">Descripción *</Label>
                    <Input
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="h-8 text-xs mt-1"
                      placeholder="Descripción del equipo"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Marca</Label>
                    <Input
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className="h-8 text-xs mt-1"
                      placeholder="Marca"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Unidad *</Label>
                    <Select value={unidad} onValueChange={setUnidad}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.map((u) => (
                          <SelectItem key={u.id} value={u.nombre} className="text-xs">
                            {u.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground">Categoría</Label>
                    <Select
                      value={categoriaId}
                      onValueChange={(val) => {
                        setCategoriaId(val)
                        const cat = categorias.find(c => c.id === val)
                        setCategoriaNombre(cat?.nombre || '')
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {renderFormFields()}

                <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-md border">
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
                  className="w-full text-xs h-8"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Agregar al Pedido
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  function renderFormFields() {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-[10px] text-muted-foreground">Cantidad *</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              min={1}
              value={cantidadPedida}
              onChange={(e) => setCantidadPedida(Number(e.target.value))}
              className="h-8 text-xs"
            />
            {unidad && (
              <span className="text-xs text-muted-foreground bg-gray-100 px-2 h-8 flex items-center rounded-md border shrink-0">
                {unidad}
              </span>
            )}
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Comentario</Label>
          <Input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="h-8 text-xs mt-1"
            placeholder="Comentario adicional..."
          />
        </div>
      </div>
    )
  }
}
