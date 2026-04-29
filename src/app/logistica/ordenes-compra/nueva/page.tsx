'use client'

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Trash2, Loader2, Save, PackageSearch, FileText, Search, Pencil, Info, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createOrdenCompra, fetchItemsDisponibles, type ItemDisponible } from '@/lib/services/ordenCompra'
import { getProveedores } from '@/lib/services/proveedor'
import { CONDICIONES_PAGO, FORMAS_PAGO, DIAS_CREDITO_PRESETS } from '@/lib/utils/formaPago'
import SelectorAsignacion, { type AsignacionValue } from '@/components/shared/SelectorAsignacion'
import type { Proveedor, OrdenCompraItemPayload } from '@/types'

const MONEDAS = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
]

// Constantes y helpers en src/lib/utils/formaPago.ts

const CATEGORIAS = [
  { value: 'equipos', label: 'Equipos' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'gastos', label: 'Gastos' },
]

interface ItemForm {
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
  source: 'manual' | 'pedido' | 'catalogo'
  pedidoEquipoItemId?: string
  listaEquipoItemId?: string
  sourceLabel?: string
}

const emptyItem: ItemForm = {
  codigo: '', descripcion: '', unidad: 'UND', cantidad: 1, precioUnitario: 0, source: 'manual',
}

interface CatalogoResult {
  id: string
  codigo: string
  descripcion: string
  marca: string
  precioLogistica: number | null
  precioReal: number | null
  precioInterno: number
  unidad: { nombre: string }
}

function NuevaOrdenCompraContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [proveedorId, setProveedorId] = useState('')
  const [asignacion, setAsignacion] = useState<AsignacionValue>({ proyectoId: null, centroCostoId: null })
  const [categoriaCosto, setCategoriaCosto] = useState('equipos')
  const [condicionPago, setCondicionPago] = useState('contado')
  const [formaPago, setFormaPago] = useState('')
  const [diasCredito, setDiasCredito] = useState('')
  const [diasCreditoCustom, setDiasCreditoCustom] = useState('')
  const [moneda, setMoneda] = useState('PEN')
  const [lugarEntrega, setLugarEntrega] = useState('')
  const [tiempoEntrega, setTiempoEntrega] = useState('')
  const [contactoEntrega, setContactoEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [requiereRecepcion, setRequiereRecepcion] = useState(true)
  const [items, setItems] = useState<ItemForm[]>([])

  // Pedido dialog state
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [pedidoItemsDisp, setPedidoItemsDisp] = useState<ItemDisponible[]>([])
  const [mostrarTodosLosItems, setMostrarTodosLosItems] = useState(false)
  // Cantidad editable por ítem (cantidad a comprar puede ser menor que la disponible)
  const [cantidadesAcomprar, setCantidadesAcomprar] = useState<Record<string, number>>({})
  // Pedidos colapsados (codigoPedido → boolean)
  const [pedidosColapsados, setPedidosColapsados] = useState<Record<string, boolean>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Catalogo dialog state
  const [catalogoOpen, setCatalogoOpen] = useState(false)
  const [catalogoQuery, setCatalogoQuery] = useState('')
  const [catalogoResults, setCatalogoResults] = useState<CatalogoResult[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(false)
  const [catalogoSelectedIds, setCatalogoSelectedIds] = useState<Set<string>>(new Set())
  const [catalogoCantidades, setCatalogoCantidades] = useState<Record<string, number>>({})

  // Manual item modal state
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualEditIndex, setManualEditIndex] = useState<number | null>(null)
  const [manualForm, setManualForm] = useState({ codigo: '', descripcion: '', unidad: 'UND', cantidad: 1, precioUnitario: 0 })

  const hasAsignacion = !!(asignacion.proyectoId || asignacion.centroCostoId)

  useEffect(() => {
    getProveedores()
      .then(setProveedores)
      .catch(() => toast.error('Error al cargar proveedores'))
      .finally(() => setLoadingData(false))
  }, [])

  // Leer query params: proyectoId | centroCostoId + pedidoItems (IDs separados por coma)
  useEffect(() => {
    const proyectoIdParam = searchParams.get('proyectoId') || null
    const centroCostoIdParam = searchParams.get('centroCostoId') || null
    const pedidoItemsParam = searchParams.get('pedidoItems')

    if (proyectoIdParam) {
      setAsignacion({ proyectoId: proyectoIdParam, centroCostoId: null })
    } else if (centroCostoIdParam) {
      setAsignacion({ proyectoId: null, centroCostoId: centroCostoIdParam })
    }

    const tieneAsignacion = !!(proyectoIdParam || centroCostoIdParam)
    if (pedidoItemsParam && tieneAsignacion) {
      const ids = pedidoItemsParam.split(',').filter(Boolean)
      if (ids.length > 0) {
        // Cargar items del pedido y pre-seleccionarlos
        setLoadingItems(true)
        fetchItemsDisponibles({ proyectoId: proyectoIdParam, centroCostoId: centroCostoIdParam })
          .then(data => {
            const preselected = data.items.filter(i => ids.includes(i.id))
            const newItems: ItemForm[] = preselected.map(i => ({
              codigo: i.codigo,
              descripcion: i.descripcion,
              unidad: i.unidad,
              cantidad: i.cantidad,
              precioUnitario: i.precioUnitario,
              source: 'pedido' as const,
              pedidoEquipoItemId: i.id,
              listaEquipoItemId: i.listaEquipoItemId,
              sourceLabel: i.pedidoCodigo,
            }))
            if (newItems.length > 0) {
              setItems(newItems)
              toast.success(`${newItems.length} item(s) cargados desde el pedido`)
            } else {
              toast.warning('Los items seleccionados ya fueron entregados o no están disponibles para OC. Use "Revertir entrega" primero si desea regularizar.')
            }
          })
          .catch(() => toast.error('Error al cargar items del pedido'))
          .finally(() => setLoadingItems(false))
      }
    }
  }, [searchParams])

  const openManualAdd = () => {
    setManualEditIndex(null)
    setManualForm({ codigo: '', descripcion: '', unidad: 'UND', cantidad: 1, precioUnitario: 0 })
    setManualModalOpen(true)
  }

  const openManualEdit = (index: number) => {
    const item = items[index]
    setManualEditIndex(index)
    setManualForm({ codigo: item.codigo, descripcion: item.descripcion, unidad: item.unidad, cantidad: item.cantidad, precioUnitario: item.precioUnitario })
    setManualModalOpen(true)
  }

  const saveManualItem = () => {
    if (!manualForm.descripcion.trim()) return toast.error('La descripción es obligatoria')
    if (manualForm.cantidad <= 0) return toast.error('La cantidad debe ser mayor a 0')
    if (manualForm.precioUnitario <= 0) return toast.error('El precio debe ser mayor a 0')

    if (manualEditIndex !== null) {
      setItems(prev => prev.map((item, i) => i === manualEditIndex ? { ...item, ...manualForm } : item))
    } else {
      setItems(prev => [...prev, { ...manualForm, source: 'manual' as const }])
    }
    setManualModalOpen(false)
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const needsDias = condicionPago === 'credito'
  const getDiasCreditoNum = (): number | null => {
    if (condicionPago !== 'credito') return null
    const diasStr = diasCredito === 'otro' ? diasCreditoCustom : diasCredito
    const n = parseInt(diasStr)
    return isNaN(n) ? null : n
  }

  const subtotal = items.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0)
  const igv = subtotal * 0.18
  const total = subtotal + igv

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

  // ── Pedido selector ──────────────────────────────────────
  const cargarItemsDisponibles = useCallback(async (mostrarTodos: boolean) => {
    if (!asignacion.proyectoId && !asignacion.centroCostoId) return
    setLoadingItems(true)
    try {
      const data = await fetchItemsDisponibles(asignacion, proveedorId || undefined, { mostrarTodos })
      const existingIds = new Set(items.filter(i => i.pedidoEquipoItemId).map(i => i.pedidoEquipoItemId))
      setPedidoItemsDisp(data.items.filter(i => !existingIds.has(i.id)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar items')
    } finally {
      setLoadingItems(false)
    }
  }, [asignacion, proveedorId, items])

  const openSelector = useCallback(async () => {
    if (!asignacion.proyectoId && !asignacion.centroCostoId) return
    setSelectorOpen(true)
    setSelectedIds(new Set())
    await cargarItemsDisponibles(mostrarTodosLosItems)
  }, [asignacion, cargarItemsDisponibles, mostrarTodosLosItems])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addSelectedItems = () => {
    const toAdd = pedidoItemsDisp.filter(i => selectedIds.has(i.id))

    // Validación de moneda: detectar las monedas únicas de los items con precio
    const monedasItems = new Set(
      toAdd
        .filter(i => i.precioUnitario > 0 && i.precioMoneda)
        .map(i => i.precioMoneda as string)
    )

    if (monedasItems.size > 1) {
      toast.error(`No se pueden mezclar items en distintas monedas (${Array.from(monedasItems).join(', ')}). Crea una OC por cada moneda.`)
      return
    }

    // Si los items tienen una moneda única y es distinta a la actual de la OC, alertar y auto-cambiar
    const monedaItems = monedasItems.size === 1 ? Array.from(monedasItems)[0] : null
    if (monedaItems && monedaItems !== moneda) {
      const yaHayItemsEnOC = items.length > 0
      if (yaHayItemsEnOC) {
        toast.error(`Estos items están en ${monedaItems} pero la OC actual está en ${moneda}. Vacía la OC o crea otra para mezclar monedas.`)
        return
      }
      // OC vacía → cambiar la moneda automáticamente
      setMoneda(monedaItems)
      toast.info(`Moneda de la OC cambiada a ${monedaItems} para coincidir con los items.`)
    }

    const newItems: ItemForm[] = toAdd.map(i => {
      const cantidadEditada = cantidadesAcomprar[i.id]
      const cantidadFinal = cantidadEditada && cantidadEditada > 0 && cantidadEditada <= i.cantidad
        ? cantidadEditada
        : i.cantidad
      return {
        codigo: i.codigo,
        descripcion: i.descripcion,
        unidad: i.unidad,
        cantidad: cantidadFinal,
        precioUnitario: i.precioUnitario,
        source: 'pedido' as const,
        pedidoEquipoItemId: i.id,
        listaEquipoItemId: i.listaEquipoItemId,
        sourceLabel: i.pedidoCodigo,
      }
    })

    setItems(prev => [...prev, ...newItems])
    setSelectorOpen(false)
    setCantidadesAcomprar({})
    toast.success(`${newItems.length} item(s) agregados desde pedidos`)
  }

  // Agrupar items por pedido para visualización
  const itemsPorPedido = useMemo(() => {
    const grupos = new Map<string, ItemDisponible[]>()
    for (const item of pedidoItemsDisp) {
      const lista = grupos.get(item.pedidoCodigo) || []
      lista.push(item)
      grupos.set(item.pedidoCodigo, lista)
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [pedidoItemsDisp])

  const togglePedidoColapsado = (pedidoCodigo: string) => {
    setPedidosColapsados(prev => ({ ...prev, [pedidoCodigo]: !prev[pedidoCodigo] }))
  }

  const seleccionarTodosDePedido = (pedidoCodigo: string, items: ItemDisponible[]) => {
    const todosSeleccionados = items.every(i => selectedIds.has(i.id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (todosSeleccionados) {
        items.forEach(i => next.delete(i.id))
      } else {
        items.forEach(i => next.add(i.id))
      }
      return next
    })
  }

  // ── Catálogo selector ────────────────────────────────────
  const openCatalogo = () => {
    setCatalogoOpen(true)
    setCatalogoQuery('')
    setCatalogoResults([])
    setCatalogoSelectedIds(new Set())
    setCatalogoCantidades({})
  }

  const searchCatalogo = useCallback(async (q: string) => {
    if (q.length < 2) { setCatalogoResults([]); return }
    setCatalogoLoading(true)
    try {
      const res = await fetch(`/api/catalogo-equipo/search?q=${encodeURIComponent(q)}&limit=30`)
      const data: CatalogoResult[] = await res.json()
      setCatalogoResults(data)
    } catch {
      setCatalogoResults([])
    } finally {
      setCatalogoLoading(false)
    }
  }, [])

  const catalogoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCatalogoSearch = (val: string) => {
    setCatalogoQuery(val)
    if (catalogoTimerRef.current) clearTimeout(catalogoTimerRef.current)
    catalogoTimerRef.current = setTimeout(() => searchCatalogo(val), 300)
  }

  const toggleCatalogoSelect = (id: string) => {
    setCatalogoSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (!catalogoCantidades[id]) {
          setCatalogoCantidades(prev => ({ ...prev, [id]: 1 }))
        }
      }
      return next
    })
  }

  const updateCatalogoCantidad = (id: string, cant: number) => {
    setCatalogoCantidades(prev => ({ ...prev, [id]: cant }))
  }

  const addCatalogoItems = () => {
    const toAdd = catalogoResults.filter(i => catalogoSelectedIds.has(i.id))
    const newItems: ItemForm[] = toAdd.map(item => ({
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidad: item.unidad.nombre,
      cantidad: catalogoCantidades[item.id] || 1,
      precioUnitario: item.precioLogistica || item.precioReal || item.precioInterno || 0,
      source: 'catalogo' as const,
      sourceLabel: 'Catálogo',
    }))

    setItems(prev => [...prev, ...newItems])
    setCatalogoOpen(false)
    toast.success(`${newItems.length} item(s) agregados desde catálogo`)
  }

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!proveedorId) return toast.error('Selecciona un proveedor')
    if (!hasAsignacion) return toast.error('Selecciona un proyecto o centro de costo')
    if (items.length === 0) return toast.error('Agrega al menos un item')

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const n = i + 1
      if (!item.descripcion.trim()) return toast.error(`Item ${n}: falta la descripción`)
      if (item.cantidad <= 0) return toast.error(`Item ${n}: la cantidad debe ser mayor a 0`)
      if (item.precioUnitario <= 0) return toast.error(`Item ${n}: el precio unitario debe ser mayor a 0`)
    }

    const validItems = items.filter(i => i.descripcion.trim() && i.cantidad > 0 && i.precioUnitario > 0)

    try {
      setSaving(true)
      const payload = {
        proveedorId,
        proyectoId: asignacion.proyectoId || undefined,
        centroCostoId: asignacion.centroCostoId || undefined,
        categoriaCosto: categoriaCosto as 'equipos' | 'servicios' | 'gastos',
        requiereRecepcion,
        condicionPago,
        formaPago: formaPago || undefined,
        diasCredito: getDiasCreditoNum() ?? undefined,
        moneda,
        lugarEntrega: lugarEntrega || undefined,
        tiempoEntrega: tiempoEntrega || undefined,
        contactoEntrega: contactoEntrega || undefined,
        observaciones: observaciones || undefined,
        items: validItems.map((item): OrdenCompraItemPayload => ({
          codigo: item.codigo || undefined,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          pedidoEquipoItemId: item.pedidoEquipoItemId,
          listaEquipoItemId: item.listaEquipoItemId,
        })),
      }
      const created = await createOrdenCompra(payload)
      toast.success(`OC ${created.numero} creada exitosamente`)
      router.push(`/logistica/ordenes-compra/${created.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear OC')
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Nueva Orden de Compra</h1>
          <p className="text-sm text-muted-foreground">Crear OC para proveedor</p>
        </div>
      </div>

      {/* Proveedor & Asignar a */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Proveedor <span className="text-red-500">*</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Combobox
              value={proveedorId}
              onValueChange={setProveedorId}
              placeholder="Seleccionar proveedor"
              searchPlaceholder="Buscar por nombre o RUC..."
              emptyMessage="Sin resultados"
              options={proveedores.map(p => ({
                value: p.id,
                label: `${p.nombre}${p.ruc ? ` (${p.ruc})` : ''}`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Asignar a <span className="text-red-500">*</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SelectorAsignacion
              value={asignacion}
              onChange={(val) => { setAsignacion(val); setItems([]) }}
              placeholder="Seleccionar proyecto o centro de costo"
            />
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={categoriaCosto} onValueChange={(v) => { setCategoriaCosto(v); setRequiereRecepcion(v === 'equipos') }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Condiciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Condición de Pago</Label>
              <Select value={condicionPago} onValueChange={(v) => { setCondicionPago(v); if (v !== 'credito') { setDiasCredito(''); setDiasCreditoCustom('') } }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDICIONES_PAGO.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Forma de Pago</Label>
              <Select value={formaPago || '__none__'} onValueChange={(v) => setFormaPago(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__"><span className="text-muted-foreground">— Ninguna —</span></SelectItem>
                  {FORMAS_PAGO.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsDias && (
              <div>
                <Label className="text-xs">Días de Crédito</Label>
                <Select value={diasCredito} onValueChange={(v) => { setDiasCredito(v); if (v !== 'otro') setDiasCreditoCustom('') }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_CREDITO_PRESETS.map(d => (
                      <SelectItem key={d} value={String(d)}>{d} días</SelectItem>
                    ))}
                    <SelectItem value="otro">Otro...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {needsDias && diasCredito === 'otro' && (
              <div>
                <Label className="text-xs">Días (personalizado)</Label>
                <Input type="number" min={1} value={diasCreditoCustom} onChange={e => setDiasCreditoCustom(e.target.value)} placeholder="Ej: 90" className="h-9" />
              </div>
            )}
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONEDAS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Lugar de Entrega</Label>
              <Input value={lugarEntrega} onChange={e => setLugarEntrega(e.target.value)} placeholder="Dirección" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Tiempo de Entrega</Label>
              <Input value={tiempoEntrega} onChange={e => setTiempoEntrega(e.target.value)} placeholder="Ej: 7 días, inmediato, stock" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Contacto de Entrega</Label>
              <Input value={contactoEntrega} onChange={e => setContactoEntrega(e.target.value)} placeholder="Nombre / teléfono" className="h-9" />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas adicionales..." rows={2} />
          </div>
          <div className="mt-3 flex items-start gap-3 p-3 rounded-md border bg-muted/30">
            <Switch
              id="requiereRecepcion"
              checked={requiereRecepcion}
              onCheckedChange={setRequiereRecepcion}
            />
            <div className="space-y-0.5">
              <Label htmlFor="requiereRecepcion" className="text-sm font-medium cursor-pointer">
                Requiere recepción física
              </Label>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {requiereRecepcion
                  ? 'Se registrará la recepción de materiales o entregables antes de completar la OC.'
                  : 'Para servicios sin entregable físico (transporte, alquiler, etc.). La OC se completa directamente al confirmar.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Items ({items.length})</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openSelector}
              disabled={!hasAsignacion}
              title={!hasAsignacion ? 'Selecciona un proyecto o centro de costo primero' : undefined}
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Desde Pedidos
            </Button>
            <Button variant="outline" size="sm" onClick={openCatalogo}>
              <Search className="h-3.5 w-3.5 mr-1" /> Desde Catálogo
            </Button>
            <Button variant="outline" size="sm" onClick={openManualAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Item Manual
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PackageSearch className="h-8 w-8 mb-2" />
              <p className="text-sm">No hay items agregados</p>
              <p className="text-xs mt-1">
                {hasAsignacion
                  ? 'Agrega items desde pedidos, catálogo o manualmente'
                  : 'Selecciona un proyecto o centro de costo primero'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Origen</TableHead>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Descripción <span className="text-red-500">*</span></TableHead>
                  <TableHead className="w-[80px]">Unidad</TableHead>
                  <TableHead className="w-[80px] text-right">Cant. <span className="text-red-500">*</span></TableHead>
                  <TableHead className="w-[120px] text-right">P. Unit. <span className="text-red-500">*</span></TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge
                        variant={item.source === 'pedido' ? 'default' : item.source === 'catalogo' ? 'secondary' : 'outline'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {item.source === 'pedido' ? 'Pedido' : item.source === 'catalogo' ? 'Catálogo' : 'Manual'}
                      </Badge>
                      {item.sourceLabel && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[70px]" title={item.sourceLabel}>
                          {item.sourceLabel}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{item.codigo || '—'}</TableCell>
                    <TableCell className="text-xs">{item.descripcion}</TableCell>
                    <TableCell className="text-xs">{item.unidad}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{item.cantidad}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(item.precioUnitario)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(item.cantidad * item.precioUnitario)}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <button onClick={() => openManualEdit(index)} className="p-1 rounded hover:bg-blue-50" title="Editar">
                          <Pencil className="h-3.5 w-3.5 text-blue-500" />
                        </button>
                        <button onClick={() => removeItem(index)} className="p-1 rounded hover:bg-red-50" title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Totals & Submit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div className="text-sm space-y-1">
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">IGV (18%):</span>
            <span className="font-mono">{formatCurrency(igv)}</span>
          </div>
          <div className="flex justify-between gap-8 font-bold text-base">
            <span>Total:</span>
            <span className="font-mono">{formatCurrency(total)}</span>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving || items.length === 0} className="bg-orange-600 hover:bg-orange-700">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Crear Orden de Compra
        </Button>
      </div>

      {/* ── Pedido Item Selector Dialog ─────────────────────── */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="!max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Agregar items desde pedidos</DialogTitle>
          </DialogHeader>

          {/* Toggle: mostrar items de otros proveedores */}
          {proveedorId && (
            <div className="flex items-start gap-2 px-6 py-2.5 border-b bg-amber-50/40">
              <Checkbox
                id="mostrar-todos-items"
                checked={mostrarTodosLosItems}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  setMostrarTodosLosItems(next)
                  cargarItemsDisponibles(next)
                }}
                className="mt-0.5"
              />
              <label htmlFor="mostrar-todos-items" className="text-xs cursor-pointer leading-tight">
                <strong>Mostrar items de otros proveedores y sin asignar</strong>
                <br />
                <span className="text-muted-foreground">
                  Si lo activas, podrás incluir items que estaban asignados a otros proveedores. Al guardar la OC, esos items se reasignarán al proveedor seleccionado.
                </span>
              </label>
            </div>
          )}

          <div className="flex-1 overflow-auto px-6 py-3">
            {loadingItems ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pedidoItemsDisp.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-2">
                  No hay items disponibles para este proveedor
                </p>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto mb-4">
                  No encontramos items asignados al proveedor seleccionado en los pedidos activos del proyecto.
                </p>
                {proveedorId && !mostrarTodosLosItems && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto text-left">
                    <p className="text-xs font-medium text-blue-900 mb-1.5 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      ¿Querés comprarle a este proveedor items asignados a otro?
                    </p>
                    <p className="text-xs text-blue-800 mb-2">
                      Activá la opción <strong>"Mostrar items de otros proveedores y sin asignar"</strong> de arriba para verlos. Al guardar la OC se reasignarán automáticamente.
                    </p>
                  </div>
                )}
                {mostrarTodosLosItems && (
                  <div className="text-xs text-muted-foreground max-w-md mx-auto space-y-1">
                    <p>Otras razones posibles:</p>
                    <ul className="list-disc list-inside text-left">
                      <li>Todos los items del proyecto ya tienen OC generada.</li>
                      <li>El proyecto no tiene pedidos en estado aprobado / atendido / parcial.</li>
                      <li>Los pedidos siguen en borrador o enviado (necesitan estar aprobados).</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {itemsPorPedido.map(([pedidoCodigo, itemsPedido]) => {
                  const colapsado = !!pedidosColapsados[pedidoCodigo]
                  const todosSeleccionados = itemsPedido.every(i => selectedIds.has(i.id))
                  const algunosSeleccionados = itemsPedido.some(i => selectedIds.has(i.id))
                  return (
                    <div key={pedidoCodigo} className="border rounded-lg overflow-hidden">
                      {/* Header del pedido (colapsable) */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                        <button
                          type="button"
                          onClick={() => togglePedidoColapsado(pedidoCodigo)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {colapsado ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <Checkbox
                          checked={todosSeleccionados ? true : algunosSeleccionados ? 'indeterminate' : false}
                          onCheckedChange={() => seleccionarTodosDePedido(pedidoCodigo, itemsPedido)}
                        />
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="font-mono font-semibold text-sm">{pedidoCodigo}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {itemsPedido.length} item{itemsPedido.length === 1 ? '' : 's'}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {itemsPedido.filter(i => selectedIds.has(i.id)).length} seleccionado(s)
                        </span>
                      </div>

                      {/* Items */}
                      {!colapsado && (
                        <div className="divide-y">
                          {itemsPedido.map(item => {
                            const seleccionado = selectedIds.has(item.id)
                            const cantidadActual = cantidadesAcomprar[item.id] ?? item.cantidad
                            // Determinar si el item se reasignará (proveedor actual != proveedor de la OC)
                            const seReasignara = !!proveedorId && !!item.proveedorId && item.proveedorId !== proveedorId
                            return (
                              <div
                                key={item.id}
                                className={`flex items-start gap-3 px-3 py-2.5 ${seleccionado ? 'bg-orange-50' : 'hover:bg-muted/30'}`}
                              >
                                <Checkbox
                                  checked={seleccionado}
                                  onCheckedChange={() => toggleSelect(item.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-start">
                                  <div className="col-span-12 sm:col-span-3">
                                    <p className="font-mono text-xs font-medium truncate" title={item.codigo}>
                                      {item.codigo}
                                    </p>
                                    {item.proveedorNombre ? (
                                      seReasignara ? (
                                        <p className="inline-flex items-center gap-1 text-[10px] text-orange-700 truncate" title={`Se reasignará de "${item.proveedorNombre}" al proveedor de esta OC`}>
                                          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                                          <span className="truncate">⚠ Reasignar de: {item.proveedorNombre}</span>
                                        </p>
                                      ) : (
                                        <p className="text-[10px] text-muted-foreground truncate" title={item.proveedorNombre}>
                                          {item.proveedorNombre}
                                        </p>
                                      )
                                    ) : (
                                      <p className="inline-flex items-center gap-1 text-[10px] text-amber-700 italic">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        Sin proveedor — se asignará a esta OC
                                      </p>
                                    )}
                                  </div>
                                  <div className="col-span-12 sm:col-span-5">
                                    <p className="text-xs leading-snug" title={item.descripcion}>{item.descripcion}</p>
                                  </div>
                                  <div className="col-span-3 sm:col-span-1 text-xs text-muted-foreground">
                                    {item.unidad}
                                  </div>
                                  <div className="col-span-5 sm:col-span-2">
                                    <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min={0.01}
                                        max={item.cantidad}
                                        step="any"
                                        value={cantidadActual}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value)
                                          setCantidadesAcomprar(prev => ({ ...prev, [item.id]: isNaN(val) ? 0 : val }))
                                          if (!seleccionado && val > 0) toggleSelect(item.id)
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-7 text-xs w-20"
                                      />
                                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        / {item.cantidad}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="col-span-4 sm:col-span-1 text-right">
                                    <Label className="text-[10px] text-muted-foreground">P.Unit.</Label>
                                    <p className={`text-xs font-mono ${item.precioMoneda && item.precioMoneda !== moneda ? 'text-amber-700 font-semibold' : ''}`}>
                                      {item.precioUnitario > 0 ? (
                                        <>
                                          {item.precioMoneda && (
                                            <span className="text-[9px] mr-0.5">{item.precioMoneda === 'USD' ? '$' : 'S/'}</span>
                                          )}
                                          {item.precioUnitario.toFixed(2)}
                                        </>
                                      ) : '—'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setSelectorOpen(false)}>Cancelar</Button>
            <Button
              onClick={addSelectedItems}
              disabled={selectedIds.size === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Agregar {selectedIds.size} item(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Catálogo Selector Dialog ────────────────────────── */}
      <Dialog open={catalogoOpen} onOpenChange={setCatalogoOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Buscar en catálogo de equipos</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={catalogoQuery}
              onChange={e => handleCatalogoSearch(e.target.value)}
              placeholder="Buscar por código o descripción... (mín. 2 caracteres)"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            {catalogoLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : catalogoQuery.length < 2 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Escribe al menos 2 caracteres para buscar
              </div>
            ) : catalogoResults.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No se encontraron items para &quot;{catalogoQuery}&quot;
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[140px]">Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[80px]">Marca</TableHead>
                    <TableHead className="w-[60px]">Unid.</TableHead>
                    <TableHead className="w-[100px] text-right">Precio</TableHead>
                    <TableHead className="w-[80px] text-right">Cant.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogoResults.map(item => {
                    const isSelected = catalogoSelectedIds.has(item.id)
                    const precio = item.precioLogistica || item.precioReal || item.precioInterno || 0
                    return (
                      <TableRow
                        key={item.id}
                        className={isSelected ? 'bg-blue-50' : 'cursor-pointer hover:bg-muted/50'}
                        onClick={() => toggleCatalogoSelect(item.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCatalogoSelect(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                        <TableCell className="text-xs">{item.descripcion}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.marca || '-'}</TableCell>
                        <TableCell className="text-xs">{item.unidad.nombre}</TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {precio > 0 ? `S/ ${precio.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          {isSelected && (
                            <Input
                              type="number"
                              min={1}
                              value={catalogoCantidades[item.id] || 1}
                              onChange={e => updateCatalogoCantidad(item.id, parseInt(e.target.value) || 1)}
                              className="h-7 w-16 text-xs text-right"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {catalogoSelectedIds.size > 0 && (
            <div className="text-xs text-muted-foreground">
              {catalogoSelectedIds.size} item(s) seleccionado(s)
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setCatalogoOpen(false)}>Cancelar</Button>
            <Button
              onClick={addCatalogoItems}
              disabled={catalogoSelectedIds.size === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Agregar {catalogoSelectedIds.size} item(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual Item Modal (Add / Edit) ──────────────────── */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{manualEditIndex !== null ? 'Editar Item' : 'Agregar Item Manual'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Código</Label>
              <Input value={manualForm.codigo} onChange={e => setManualForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Código (opcional)" />
            </div>
            <div>
              <Label className="text-xs">Descripción <span className="text-red-500">*</span></Label>
              <Input value={manualForm.descripcion} onChange={e => setManualForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del item" autoFocus />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Unidad</Label>
                <Input value={manualForm.unidad} onChange={e => setManualForm(p => ({ ...p, unidad: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Cantidad <span className="text-red-500">*</span></Label>
                <Input type="number" min={1} value={manualForm.cantidad} onChange={e => setManualForm(p => ({ ...p, cantidad: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">P. Unit. <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} step={0.01} value={manualForm.precioUnitario} onChange={e => setManualForm(p => ({ ...p, precioUnitario: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveManualItem} className="bg-orange-600 hover:bg-orange-700">
              {manualEditIndex !== null ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function NuevaOrdenCompraPage() {
  return (
    <Suspense>
      <NuevaOrdenCompraContent />
    </Suspense>
  )
}
