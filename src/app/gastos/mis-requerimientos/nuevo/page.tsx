'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Loader2, CreditCard, Package, Search, ChevronDown, ChevronRight,
  AlertCircle, Plus, Trash2, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { createHojaDeGastos } from '@/lib/services/hojaDeGastos'
import {
  getItemsParaRequerimiento,
  type ProyectoParaRequerimiento,
  type ItemParaRequerimiento,
} from '@/lib/services/hojaDeGastos'
import SelectorAsignacion, { type AsignacionValue } from '@/components/shared/SelectorAsignacion'

type TipoRequerimiento = 'gastos_viaticos' | 'compra_materiales'
type AgrupacionModal = 'proyecto' | 'pedido' | 'proveedor'

const CATEGORIAS = [
  { value: 'gastos', label: 'Gastos' },
  { value: 'equipos', label: 'Equipos' },
  { value: 'servicios', label: 'Servicios' },
]

interface ItemSeleccionado {
  item: ItemParaRequerimiento
  cantidad: number
  precioEstimado: number | null
}

const fmt = (n: number | null | undefined) =>
  n != null ? new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(n) : '—'

// ─── Modal de selección ───────────────────────────────────────────────────────
interface ModalSelectorProps {
  open: boolean
  /** Confirmar agrega los items nuevos al formulario */
  onConfirm: (nuevos: Map<string, ItemSeleccionado>) => void
  /** Cancelar descarta sin tocar el formulario */
  onCancel: () => void
  proyectos: ProyectoParaRequerimiento[]
  loading: boolean
  busqueda: string
  onBusqueda: (q: string) => void
  /** IDs ya confirmados — se excluyen del modal */
  yaConfirmados: Set<string>
}

function ModalSelectorItems({
  open, onConfirm, onCancel, proyectos, loading, busqueda, onBusqueda, yaConfirmados,
}: ModalSelectorProps) {
  // Selección temporal: arranca vacía cada vez
  const [temp, setTemp] = useState<Map<string, ItemSeleccionado>>(new Map())
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [agrupacion, setAgrupacion] = useState<AgrupacionModal>('pedido')

  // Al abrir: limpiar selección temporal
  useEffect(() => {
    if (open) {
      setTemp(new Map())
    }
  }, [open])

  // Expandir todos los grupos al cargar datos
  useEffect(() => {
    if (!open) return
    const ids = new Set<string>()
    proyectos.forEach(p => {
      ids.add(p.id)
      p.pedidos.forEach(ped => ids.add(ped.id))
    })
    setExpandidos(ids)
  }, [open, proyectos])

  const toggleExpand = (id: string) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleItem = (item: ItemParaRequerimiento, checked: boolean) => {
    setTemp(prev => {
      const next = new Map(prev)
      if (checked) {
        next.set(item.id, {
          item,
          cantidad: item.cantidadDisponible,
          precioEstimado: item.precioUnitario,
        })
      } else {
        next.delete(item.id)
      }
      return next
    })
  }

  // Excluir items ya confirmados en el formulario
  const proyectosFiltrados = proyectos.map(p => ({
    ...p,
    pedidos: p.pedidos.map(ped => ({
      ...ped,
      items: ped.items.filter(it => !yaConfirmados.has(it.id)),
    })).filter(ped => ped.items.length > 0),
  })).filter(p => p.pedidos.length > 0)

  const pedidosFlat = proyectosFiltrados.flatMap(p =>
    p.pedidos.map(ped => ({ ...ped, proyectoCodigo: p.codigo, proyectoNombre: p.nombre }))
  )

  // Agrupar por proveedor
  const proveedoresMap = new Map<string, {
    id: string; nombre: string; items: ItemParaRequerimiento[]
  }>()
  for (const p of proyectosFiltrados) {
    for (const ped of p.pedidos) {
      for (const item of ped.items) {
        const key = item.proveedorId || '__sin_proveedor__'
        const nombre = item.proveedor?.nombre || item.proveedorNombre || 'Sin proveedor asignado'
        if (!proveedoresMap.has(key)) {
          proveedoresMap.set(key, { id: key, nombre, items: [] })
        }
        proveedoresMap.get(key)!.items.push(item)
      }
    }
  }
  // Sin proveedor al final
  const proveedoresFlat = Array.from(proveedoresMap.values()).sort((a, b) => {
    if (a.id === '__sin_proveedor__') return 1
    if (b.id === '__sin_proveedor__') return -1
    return a.nombre.localeCompare(b.nombre)
  })

  const totalDisponibles = proyectosFiltrados.reduce((s, p) => s + p.pedidos.reduce((ss, ped) => ss + ped.items.length, 0), 0)
  const countTemp = temp.size

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-blue-600" />
            Agregar Items a Comprar
          </DialogTitle>

          {/* Búsqueda + agrupación */}
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9"
                placeholder="Buscar código, descripción, proyecto, pedido..."
                value={busqueda}
                onChange={e => onBusqueda(e.target.value)}
              />
              {busqueda && (
                <button onClick={() => onBusqueda('')} className="absolute right-2 top-2.5">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={agrupacion} onValueChange={v => setAgrupacion(v as AgrupacionModal)}>
              <SelectTrigger className="w-[140px] h-9 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proyecto">Por Proyecto</SelectItem>
                <SelectItem value="pedido">Por Pedido</SelectItem>
                <SelectItem value="proveedor">Por Proveedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground mt-1.5">
            {totalDisponibles} item(s) disponibles para agregar
            {yaConfirmados.size > 0 && ` · ${yaConfirmados.size} ya incluido(s) en el requerimiento`}
          </p>
        </DialogHeader>

        {/* Lista scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Cargando...
            </div>
          ) : proyectosFiltrados.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No hay items disponibles para agregar.
            </div>
          ) : agrupacion === 'proyecto' ? (
            // ── Por Proyecto → Pedido ──
            proyectosFiltrados.map(proyecto => {
              const selProyecto = proyecto.pedidos.reduce((s, p) => s + p.items.filter(it => temp.has(it.id)).length, 0)
              return (
                <div key={proyecto.id} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpand(proyecto.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted/80 text-left transition-colors"
                  >
                    {expandidos.has(proyecto.id)
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    <span className="font-semibold text-sm">{proyecto.codigo}</span>
                    <span className="text-sm text-muted-foreground truncate">— {proyecto.nombre}</span>
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                      {selProyecto > 0 && (
                        <Badge className="text-xs py-0 px-1.5 h-4 bg-blue-100 text-blue-700 border-0">
                          {selProyecto} sel.
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs py-0 h-4">
                        {proyecto.pedidos.reduce((s, p) => s + p.items.length, 0)}
                      </Badge>
                    </div>
                  </button>
                  {expandidos.has(proyecto.id) && proyecto.pedidos.map(pedido => (
                    <PedidoGroup
                      key={pedido.id}
                      pedido={pedido}
                      expandidos={expandidos}
                      onToggleExpand={toggleExpand}
                      temp={temp}
                      onToggleItem={toggleItem}
                      indent
                    />
                  ))}
                </div>
              )
            })
          ) : agrupacion === 'pedido' ? (
            // ── Por Pedido ──
            pedidosFlat.map(pedido => {
              const selPedido = pedido.items.filter(it => temp.has(it.id)).length
              return (
                <div key={pedido.id} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpand(pedido.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted/80 text-left transition-colors"
                  >
                    {expandidos.has(pedido.id)
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    <span className="font-semibold text-sm">{pedido.codigo}</span>
                    <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">{pedido.estado}</Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {pedido.proyectoCodigo} — {pedido.proyectoNombre}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                      {selPedido > 0 && (
                        <Badge className="text-xs py-0 px-1.5 h-4 bg-blue-100 text-blue-700 border-0">
                          {selPedido} sel.
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs py-0 h-4">
                        {pedido.items.length}
                      </Badge>
                    </div>
                  </button>
                  {expandidos.has(pedido.id) && (
                    <div className="divide-y">
                      {pedido.items.map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          checked={temp.has(item.id)}
                          onToggle={toggleItem}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            // ── Por Proveedor ──
            proveedoresFlat.map(prov => {
              const selProv = prov.items.filter(it => temp.has(it.id)).length
              const esSinProveedor = prov.id === '__sin_proveedor__'
              return (
                <div key={prov.id} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpand(prov.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted/80 text-left transition-colors"
                  >
                    {expandidos.has(prov.id)
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    <span className={`font-semibold text-sm ${esSinProveedor ? 'text-muted-foreground italic' : ''}`}>
                      {prov.nombre}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                      {selProv > 0 && (
                        <Badge className="text-xs py-0 px-1.5 h-4 bg-blue-100 text-blue-700 border-0">
                          {selProv} sel.
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs py-0 h-4">
                        {prov.items.length}
                      </Badge>
                    </div>
                  </button>
                  {expandidos.has(prov.id) && (
                    <div className="divide-y">
                      {prov.items.map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          checked={temp.has(item.id)}
                          onToggle={toggleItem}
                          showPedido
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t shrink-0 flex items-center justify-between sm:justify-between gap-3">
          <span className="text-sm text-muted-foreground shrink-0">
            {countTemp > 0
              ? <><span className="font-medium text-foreground">{countTemp}</span> marcado(s) para agregar</>
              : 'Selecciona items para agregar'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => onConfirm(temp)}
              disabled={countTemp === 0}
            >
              Agregar {countTemp > 0 ? `${countTemp} item(s)` : 'items'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sub-componentes del modal ────────────────────────────────────────────────
interface PedidoGroupProps {
  pedido: ProyectoParaRequerimiento['pedidos'][number]
  expandidos: Set<string>
  onToggleExpand: (id: string) => void
  temp: Map<string, ItemSeleccionado>
  onToggleItem: (item: ItemParaRequerimiento, checked: boolean) => void
  indent?: boolean
}
function PedidoGroup({ pedido, expandidos, onToggleExpand, temp, onToggleItem, indent }: PedidoGroupProps) {
  const selCount = pedido.items.filter(it => temp.has(it.id)).length
  return (
    <>
      <button
        type="button"
        onClick={() => onToggleExpand(pedido.id)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 bg-muted/20 hover:bg-muted/40 border-t text-left transition-colors ${indent ? 'pl-6' : ''}`}
      >
        {expandidos.has(pedido.id)
          ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
        <span className="text-xs font-medium">{pedido.codigo}</span>
        <Badge variant="outline" className="text-xs py-0 px-1 h-3.5 font-normal">{pedido.estado}</Badge>
        {selCount > 0 && (
          <Badge className="text-xs py-0 px-1.5 h-3.5 bg-blue-100 text-blue-700 border-0">
            {selCount} sel.
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{pedido.items.length} item(s)</span>
      </button>
      {expandidos.has(pedido.id) && (
        <div className="divide-y">
          {pedido.items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              checked={temp.has(item.id)}
              onToggle={onToggleItem}
              indent={indent}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface ItemRowProps {
  item: ItemParaRequerimiento
  checked: boolean
  onToggle: (item: ItemParaRequerimiento, checked: boolean) => void
  indent?: boolean
  showPedido?: boolean
}
function ItemRow({ item, checked, onToggle, indent, showPedido }: ItemRowProps) {
  return (
    <label
      className={`flex items-start gap-3 py-2 cursor-pointer transition-colors select-none ${
        checked
          ? 'bg-blue-50 dark:bg-blue-950/15 border-l-2 border-l-blue-500'
          : 'hover:bg-muted/20 border-l-2 border-l-transparent'
      } ${indent ? 'pl-8 pr-4' : 'px-4'}`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={v => onToggle(item, !!v)}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground">{item.codigo}</span>
          <span className={`text-sm truncate ${checked ? 'font-semibold' : 'font-medium'}`}>
            {item.descripcion}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{item.unidad}</span>
        </div>
        <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
          <span>Disp: <strong className="text-foreground">{item.cantidadDisponible}</strong></span>
          {item.precioUnitario != null && <span>P.U.: S/ {fmt(item.precioUnitario)}</span>}
          {showPedido && (
            <span className="text-muted-foreground/70">
              {item.pedidoEquipo.proyecto.codigo} · {item.pedidoEquipo.codigo}
            </span>
          )}
        </div>
      </div>
      {checked && (
        <span className="text-xs text-blue-600 font-medium shrink-0 self-center">✓</span>
      )}
    </label>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function NuevoRequerimientoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [tipo, setTipo] = useState<TipoRequerimiento>(
    searchParams.get('tipo') === 'compra_materiales' ? 'compra_materiales' : 'gastos_viaticos'
  )
  const [showModal, setShowModal] = useState(false)

  // Campos comunes
  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [requiereAnticipo, setRequiereAnticipo] = useState(false)
  const [montoAnticipo, setMontoAnticipo] = useState('')

  // Campos gastos/viáticos
  const [asignacion, setAsignacion] = useState<AsignacionValue>({ proyectoId: null, centroCostoId: null })
  const [categoriaCosto, setCategoriaCosto] = useState('gastos')

  // Campos materiales
  const [justificacion, setJustificacion] = useState('')
  const [proyectos, setProyectos] = useState<ProyectoParaRequerimiento[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [busqueda, setBusqueda] = useState(searchParams.get('pedidoCodigo') || '')

  // Selección CONFIRMADA (lo que va al formulario)
  const [seleccionados, setSeleccionados] = useState<Map<string, ItemSeleccionado>>(new Map())

  // Si viene desde un pedido, auto-abrir modal al cargar
  const pedidoCodigoParam = searchParams.get('pedidoCodigo')

  useEffect(() => {
    if (tipo === 'compra_materiales') loadItems(pedidoCodigoParam || undefined)
  }, [tipo])

  // Auto-abrir modal cuando los items estén cargados y viene de un pedido
  useEffect(() => {
    if (pedidoCodigoParam && tipo === 'compra_materiales' && !loadingItems && proyectos.length > 0 && !showModal) {
      setShowModal(true)
    }
  }, [pedidoCodigoParam, tipo, loadingItems, proyectos.length])

  const loadItems = useCallback(async (q?: string) => {
    setLoadingItems(true)
    try {
      const data = await getItemsParaRequerimiento(q)
      setProyectos(data)
    } catch {
      toast.error('Error al cargar items de pedidos')
    } finally {
      setLoadingItems(false)
    }
  }, [])

  useEffect(() => {
    if (tipo !== 'compra_materiales') return
    const t = setTimeout(() => loadItems(busqueda || undefined), 350)
    return () => clearTimeout(t)
  }, [busqueda, tipo, loadItems])

  // Confirmar del modal → AGREGA los nuevos items a los ya confirmados
  const handleConfirmarModal = (nuevos: Map<string, ItemSeleccionado>) => {
    setSeleccionados(prev => {
      const next = new Map(prev)
      for (const [id, entry] of nuevos) {
        if (!next.has(id)) next.set(id, entry)
      }
      return next
    })
    setShowModal(false)
  }

  const updateCantidad = (itemId: string, cantidad: number) => {
    setSeleccionados(prev => {
      const next = new Map(prev)
      const entry = next.get(itemId)
      if (entry) next.set(itemId, { ...entry, cantidad: Math.max(0.01, cantidad) })
      return next
    })
  }

  const updatePrecio = (itemId: string, precio: number | null) => {
    setSeleccionados(prev => {
      const next = new Map(prev)
      const entry = next.get(itemId)
      if (entry) next.set(itemId, { ...entry, precioEstimado: precio })
      return next
    })
  }

  const removeItem = (itemId: string) => {
    setSeleccionados(prev => {
      const next = new Map(prev)
      next.delete(itemId)
      return next
    })
  }

  const totalEstimado = Array.from(seleccionados.values()).reduce(
    (sum, s) => sum + s.cantidad * (s.precioEstimado ?? 0), 0
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivo.trim()) { toast.error('El motivo es requerido'); return }

    if (tipo === 'gastos_viaticos') {
      if (!asignacion.proyectoId && !asignacion.centroCostoId) {
        toast.error('Selecciona un proyecto o centro de costo'); return
      }
      try {
        setSaving(true)
        const hoja = await createHojaDeGastos({
          proyectoId: asignacion.proyectoId || undefined,
          centroCostoId: asignacion.centroCostoId || undefined,
          categoriaCosto: categoriaCosto as 'equipos' | 'servicios' | 'gastos',
          motivo: motivo.trim(),
          observaciones: observaciones.trim() || undefined,
          requiereAnticipo,
          montoAnticipo: requiereAnticipo ? parseFloat(montoAnticipo) || 0 : 0,
        })
        toast.success(`Requerimiento ${hoja.numero} creado`)
        router.push(`/gastos/mis-requerimientos/${hoja.id}`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al crear requerimiento')
      } finally { setSaving(false) }
      return
    }

    if (seleccionados.size === 0) { toast.error('Selecciona al menos un item del pedido'); return }

    try {
      setSaving(true)
      const items = Array.from(seleccionados.values()).map(s => ({
        pedidoEquipoItemId: s.item.id,
        pedidoId: s.item.pedidoEquipo.id,
        proyectoId: s.item.pedidoEquipo.proyectoId,
        codigo: s.item.codigo,
        descripcion: s.item.descripcion,
        unidad: s.item.unidad,
        cantidadSolicitada: s.cantidad,
        precioEstimado: s.precioEstimado,
      }))
      const hoja = await createHojaDeGastos({
        tipoProposito: 'compra_materiales',
        motivo: motivo.trim(),
        justificacionMateriales: justificacion.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        requiereAnticipo: requiereAnticipo !== false,
        montoAnticipo: parseFloat(montoAnticipo) || totalEstimado || 0,
        items,
      })
      toast.success(`Requerimiento de materiales ${hoja.numero} creado`)
      router.push(`/gastos/mis-requerimientos/${hoja.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear requerimiento')
    } finally { setSaving(false) }
  }

  const canSubmit = tipo === 'gastos_viaticos'
    ? (!!(asignacion.proyectoId || asignacion.centroCostoId) && !!motivo.trim())
    : (seleccionados.size > 0 && !!motivo.trim())

  const selArray = Array.from(seleccionados.values())

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/gastos/mis-requerimientos')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-600" />
          Nuevo Requerimiento de Dinero
        </h1>
      </div>

      {/* Selector de tipo */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setTipo('gastos_viaticos')}
          className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
            tipo === 'gastos_viaticos'
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <CreditCard className={`h-5 w-5 mb-1.5 ${tipo === 'gastos_viaticos' ? 'text-amber-600' : 'text-muted-foreground'}`} />
          <span className="font-semibold text-sm">Gastos / Viáticos</span>
          <span className="text-xs text-muted-foreground mt-0.5">Viáticos, servicios, gastos de campo</span>
        </button>
        <button
          type="button"
          onClick={() => setTipo('compra_materiales')}
          className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
            tipo === 'compra_materiales'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <Package className={`h-5 w-5 mb-1.5 ${tipo === 'compra_materiales' ? 'text-blue-600' : 'text-muted-foreground'}`} />
          <span className="font-semibold text-sm">Equipos y Materiales</span>
          <span className="text-xs text-muted-foreground mt-0.5">Compra de items de pedidos aprobados</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {tipo === 'gastos_viaticos' && (
              <>
                <div className="space-y-1.5">
                  <Label>Asignar a <span className="text-red-500">*</span></Label>
                  <SelectorAsignacion
                    value={asignacion}
                    onChange={setAsignacion}
                    disabled={saving}
                    placeholder="Seleccionar proyecto o centro de costo"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select value={categoriaCosto} onValueChange={setCategoriaCosto} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {tipo === 'compra_materiales' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span className="text-blue-800 dark:text-blue-300">
                  Se imputará automáticamente a <strong>CC GYS.LOG</strong>. Los items se asocian a sus respectivos proyectos.
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Motivo <span className="text-red-500">*</span></Label>
              <Input
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder={tipo === 'compra_materiales'
                  ? 'Ej: Compra de materiales para proyecto ABC'
                  : 'Ej: Gastos de movilidad proyecto XYZ'}
                disabled={saving}
              />
            </div>

            {tipo === 'compra_materiales' && (
              <div className="space-y-1.5">
                <Label>Justificación</Label>
                <Textarea
                  value={justificacion}
                  onChange={e => setJustificacion(e.target.value)}
                  placeholder="Descripción del por qué se requieren estos materiales (opcional)"
                  rows={2}
                  disabled={saving}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Notas adicionales (opcional)"
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="text-sm font-medium">Requiere anticipo de dinero</Label>
                <p className="text-xs text-muted-foreground">
                  {tipo === 'compra_materiales' ? 'Dinero para efectuar la compra' : 'Marcar si necesitas recibir dinero antes de los gastos'}
                </p>
              </div>
              <Switch checked={requiereAnticipo} onCheckedChange={setRequiereAnticipo} disabled={saving} />
            </div>

            {requiereAnticipo && (
              <div className="space-y-1.5">
                <Label>
                  Monto de anticipo (PEN)
                  {tipo === 'compra_materiales' && totalEstimado > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">(estimado: S/ {fmt(totalEstimado)})</span>
                  )}
                </Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={montoAnticipo}
                  onChange={e => setMontoAnticipo(e.target.value)}
                  placeholder={tipo === 'compra_materiales' ? fmt(totalEstimado) || '0.00' : '0.00'}
                  disabled={saving}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items confirmados */}
        {tipo === 'compra_materiales' && (
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Items a comprar
                {seleccionados.size > 0 && (
                  <Badge variant="secondary" className="text-xs">{seleccionados.size}</Badge>
                )}
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setShowModal(true)}
                disabled={saving}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Items
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {selArray.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                  <Package className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No has seleccionado ningún item aún.</p>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => setShowModal(true)}
                    disabled={saving || loadingItems}
                  >
                    {loadingItems ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Seleccionar Items de Pedidos
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selArray.map(({ item, cantidad, precioEstimado }) => (
                    <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          <span className="font-mono text-muted-foreground mr-1">{item.codigo}</span>
                          {item.descripcion}
                          <span className="text-muted-foreground ml-1">({item.unidad})</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.pedidoEquipo.proyecto.codigo} · {item.pedidoEquipo.codigo}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">Cant.</span>
                        <Input
                          type="number" step="0.01" min="0.01" max={item.cantidadDisponible}
                          value={cantidad}
                          onChange={e => updateCantidad(item.id, parseFloat(e.target.value) || 0)}
                          className="h-7 w-20 text-xs"
                          disabled={saving}
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">S/</span>
                        <Input
                          type="number" step="0.01" min="0"
                          value={precioEstimado ?? ''}
                          onChange={e => updatePrecio(item.id, e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-7 w-24 text-xs"
                          placeholder="0.00"
                          disabled={saving}
                        />
                      </div>
                      {precioEstimado != null && (
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400 shrink-0 w-20 text-right">
                          S/ {fmt(cantidad * precioEstimado)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded hover:bg-red-50 shrink-0"
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{selArray.length} item(s)</span>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground mr-2">Total estimado:</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">
                        S/ {fmt(totalEstimado)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || !canSubmit}
            className={tipo === 'compra_materiales' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {tipo === 'compra_materiales' ? 'Crear Req. de Materiales' : 'Crear Requerimiento'}
          </Button>
        </div>
      </form>

      <ModalSelectorItems
        open={showModal}
        onConfirm={handleConfirmarModal}
        onCancel={() => setShowModal(false)}
        proyectos={proyectos}
        loading={loadingItems}
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        yaConfirmados={new Set(seleccionados.keys())}
      />
    </div>
  )
}
