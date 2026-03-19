'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Trash2, Loader2, Save, PackageSearch, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { createOrdenCompra, fetchItemsDisponibles, type ItemDisponible } from '@/lib/services/ordenCompra'
import { getProveedores } from '@/lib/services/proveedor'
import SelectorAsignacion, { type AsignacionValue } from '@/components/shared/SelectorAsignacion'
import type { Proveedor, OrdenCompraItemPayload } from '@/types'

const MONEDAS = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
]

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
  source: 'manual' | 'pedido'
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

function CodigoAutocomplete({ value, onSelect, onChange }: {
  value: string
  onSelect: (item: CatalogoResult) => void
  onChange: (val: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<CatalogoResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQuery(value) }, [value])

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    fetch(`/api/catalogo-equipo/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then((data: CatalogoResult[]) => { setResults(data); setOpen(data.length > 0) })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    onChange(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 300)
  }

  const handleSelect = (item: CatalogoResult) => {
    setQuery(item.codigo)
    setOpen(false)
    onSelect(item)
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Buscar código..."
        className="h-8 text-xs"
      />
      {open && (
        <div className="absolute z-50 top-9 left-0 w-[350px] bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
          {loading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
          {results.map(item => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0"
              onMouseDown={() => handleSelect(item)}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium">{item.codigo}</span>
                {item.marca && <span className="text-[10px] text-muted-foreground">({item.marca})</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{item.descripcion}</div>
              <div className="text-[10px] text-muted-foreground">
                {item.unidad.nombre} &middot; {item.precioLogistica ? `S/ ${item.precioLogistica.toFixed(2)}` : item.precioReal ? `S/ ${item.precioReal.toFixed(2)}` : '-'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NuevaOrdenCompraPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [proveedorId, setProveedorId] = useState('')
  const [asignacion, setAsignacion] = useState<AsignacionValue>({ proyectoId: null, centroCostoId: null })
  const [categoriaCosto, setCategoriaCosto] = useState('equipos')
  const [condicionPago, setCondicionPago] = useState('contado')
  const [diasCredito, setDiasCredito] = useState<number | ''>('')
  const [moneda, setMoneda] = useState('PEN')
  const [lugarEntrega, setLugarEntrega] = useState('')
  const [contactoEntrega, setContactoEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<ItemForm[]>([])

  // Dialog state
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [pedidoItemsDisp, setPedidoItemsDisp] = useState<ItemDisponible[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const hasAsignacion = !!(asignacion.proyectoId || asignacion.centroCostoId)
  const isProyecto = !!asignacion.proyectoId

  useEffect(() => {
    getProveedores()
      .then(setProveedores)
      .catch(() => toast.error('Error al cargar proveedores'))
      .finally(() => setLoadingData(false))
  }, [])

  const updateItem = (index: number, field: keyof ItemForm, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const fillFromCatalogo = (index: number, catalogo: CatalogoResult) => {
    setItems(prev => prev.map((item, i) => i === index ? {
      ...item,
      codigo: catalogo.codigo,
      descripcion: catalogo.descripcion,
      unidad: catalogo.unidad.nombre,
      precioUnitario: catalogo.precioLogistica || catalogo.precioReal || catalogo.precioInterno || 0,
    } : item))
  }

  const addManualItem = () => setItems(prev => [...prev, { ...emptyItem }])

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0)
  const igv = moneda === 'USD' ? 0 : subtotal * 0.18
  const total = subtotal + igv

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

  // Load pedido items when opening the selector
  const openSelector = useCallback(async () => {
    if (!asignacion.proyectoId) return
    setSelectorOpen(true)
    setSelectedIds(new Set())
    setLoadingItems(true)
    try {
      const data = await fetchItemsDisponibles(asignacion.proyectoId, proveedorId || undefined)
      // Filter out items already in the form
      const existingIds = new Set(items.filter(i => i.pedidoEquipoItemId).map(i => i.pedidoEquipoItemId))
      setPedidoItemsDisp(data.items.filter(i => !existingIds.has(i.id)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar items')
    } finally {
      setLoadingItems(false)
    }
  }, [asignacion.proyectoId, proveedorId, items])

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
    const newItems: ItemForm[] = toAdd.map(i => ({
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

    setItems(prev => [...prev, ...newItems])
    setSelectorOpen(false)
    toast.success(`${newItems.length} item(s) agregados desde pedidos`)
  }

  const handleSubmit = async () => {
    if (!proveedorId) return toast.error('Selecciona un proveedor')
    if (!hasAsignacion) return toast.error('Selecciona un proyecto o centro de costo')
    const validItems = items.filter(i => i.codigo && i.descripcion && i.cantidad > 0 && i.precioUnitario > 0)
    if (validItems.length === 0) return toast.error('Agrega al menos un item válido')

    try {
      setSaving(true)
      const payload = {
        proveedorId,
        proyectoId: asignacion.proyectoId || undefined,
        centroCostoId: asignacion.centroCostoId || undefined,
        categoriaCosto: categoriaCosto as 'equipos' | 'servicios' | 'gastos',
        condicionPago,
        diasCredito: condicionPago === 'credito' && diasCredito ? Number(diasCredito) : undefined,
        moneda,
        lugarEntrega: lugarEntrega || undefined,
        contactoEntrega: contactoEntrega || undefined,
        observaciones: observaciones || undefined,
        items: validItems.map((item): OrdenCompraItemPayload => ({
          codigo: item.codigo,
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
            <CardTitle className="text-sm font-medium">Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={proveedorId} onValueChange={setProveedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} {p.ruc ? `(${p.ruc})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Select value={categoriaCosto} onValueChange={setCategoriaCosto}>
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
              <Select value={condicionPago} onValueChange={(v) => { setCondicionPago(v); if (v === 'contado') setDiasCredito('') }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contado">Contado</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {condicionPago === 'credito' && (
              <div>
                <Label className="text-xs">Días de crédito</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-9"
                  placeholder="Ej: 30"
                  value={diasCredito}
                  onChange={(e) => setDiasCredito(e.target.value ? Number(e.target.value) : '')}
                />
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
              <Label className="text-xs">Contacto de Entrega</Label>
              <Input value={contactoEntrega} onChange={e => setContactoEntrega(e.target.value)} placeholder="Nombre / teléfono" className="h-9" />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas adicionales..." rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Items ({items.length})</CardTitle>
          <div className="flex gap-2">
            {isProyecto && (
              <Button variant="outline" size="sm" onClick={openSelector}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Desde Pedidos
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addManualItem}>
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
                {isProyecto
                  ? 'Agrega items desde pedidos existentes o manualmente'
                  : hasAsignacion
                    ? 'Agrega items manualmente'
                    : 'Selecciona un proyecto o centro de costo primero'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Origen</TableHead>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[80px]">Unidad</TableHead>
                  <TableHead className="w-[80px] text-right">Cant.</TableHead>
                  <TableHead className="w-[120px] text-right">P. Unit.</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const isLinked = item.source === 'pedido'
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={isLinked ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                          {isLinked ? 'Pedido' : 'Manual'}
                        </Badge>
                        {item.sourceLabel && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[70px]" title={item.sourceLabel}>
                            {item.sourceLabel}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isLinked ? (
                          <span className="text-xs font-mono">{item.codigo}</span>
                        ) : (
                          <CodigoAutocomplete
                            value={item.codigo}
                            onChange={val => updateItem(index, 'codigo', val)}
                            onSelect={cat => fillFromCatalogo(index, cat)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isLinked ? (
                          <span className="text-xs">{item.descripcion}</span>
                        ) : (
                          <Input value={item.descripcion} onChange={e => updateItem(index, 'descripcion', e.target.value)} placeholder="Descripción del item" className="h-8 text-xs" />
                        )}
                      </TableCell>
                      <TableCell>
                        {isLinked ? (
                          <span className="text-xs">{item.unidad}</span>
                        ) : (
                          <Input value={item.unidad} onChange={e => updateItem(index, 'unidad', e.target.value)} className="h-8 text-xs" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.cantidad}
                          onChange={e => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right"
                          min={0}
                          step={1}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.precioUnitario}
                          onChange={e => updateItem(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right"
                          min={0}
                          step={0.01}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCurrency(item.cantidad * item.precioUnitario)}
                      </TableCell>
                      <TableCell>
                        <button onClick={() => removeItem(index)} className="p-1 rounded hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
          {moneda !== 'USD' && (
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">IGV (18%):</span>
              <span className="font-mono">{formatCurrency(igv)}</span>
            </div>
          )}
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

      {/* Pedido Item Selector Dialog */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Agregar items desde pedidos</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loadingItems ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pedidoItemsDisp.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No hay items de pedidos disponibles para este proyecto
                {proveedorId && <span className="block text-xs mt-1">Filtrado por proveedor seleccionado. Cambia el proveedor para ver más items.</span>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[60px]">Unid.</TableHead>
                    <TableHead className="w-[60px] text-right">Cant.</TableHead>
                    <TableHead className="w-[90px] text-right">P.Unit.</TableHead>
                    <TableHead className="w-[120px]">Proveedor</TableHead>
                    <TableHead className="w-[100px]">Pedido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidoItemsDisp.map(item => (
                    <TableRow
                      key={item.id}
                      className={selectedIds.has(item.id) ? 'bg-orange-50' : 'cursor-pointer hover:bg-muted/50'}
                      onClick={() => toggleSelect(item.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                      <TableCell className="text-xs">{item.descripcion}</TableCell>
                      <TableCell className="text-xs">{item.unidad}</TableCell>
                      <TableCell className="text-xs text-right">{item.cantidad}</TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {item.precioUnitario > 0 ? item.precioUnitario.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]" title={item.proveedorNombre || ''}>
                        {item.proveedorNombre || <span className="text-muted-foreground italic">Sin proveedor</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.pedidoCodigo}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="mt-2">
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
    </div>
  )
}
