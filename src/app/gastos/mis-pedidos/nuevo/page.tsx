'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Plus, Trash2, Pencil, ShoppingCart, Loader2, AlertTriangle, Package, ArrowRightLeft, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createPedidoInterno } from '@/lib/services/pedidoInterno'
import { getCentrosCosto } from '@/lib/services/centroCosto'
import type { CentroCosto } from '@/types'

interface ProyectoOpcion {
  id: string
  codigo: string
  nombre: string
}

type CategoriaCostoStr = 'equipos' | 'servicios' | 'gastos'

interface ItemLibre {
  codigo: string
  descripcion: string
  unidad: string
  cantidadPedida: number
  precioUnitario: number
  precioUnitarioMoneda: string
  marca: string | null
  catalogoEquipoId: string | null
  // Override de imputación (mutuamente excluyentes)
  proyectoIdOverride: string | null
  centroCostoIdOverride: string | null
  // Bucket contable (requerido cuando hay override)
  categoriaCostoOverride: CategoriaCostoStr | null
}

const ITEM_VACIO: ItemLibre = {
  codigo: '',
  descripcion: '',
  unidad: 'und',
  cantidadPedida: 1,
  precioUnitario: 0,
  precioUnitarioMoneda: 'PEN',
  marca: null,
  catalogoEquipoId: null,
  proyectoIdOverride: null,
  centroCostoIdOverride: null,
  categoriaCostoOverride: null,
}
const UNIDADES = ['und', 'par', 'm', 'm²', 'm³', 'kg', 'lt', 'caja', 'bolsa', 'rollo', 'juego', 'set']

const MONEDAS = [
  { value: 'PEN', label: 'S/' },
  { value: 'USD', label: 'US$' },
]

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

const normalizarUnidad = (raw: string | undefined): string => {
  if (!raw) return 'und'
  const lower = raw.toLowerCase().trim()
  return UNIDADES.find(u => u.toLowerCase() === lower) ?? 'und'
}

const formatCurrency = (amount: number, moneda: string = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

export default function NuevoPedidoInternoPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [proyectos, setProyectos] = useState<ProyectoOpcion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCentros, setLoadingCentros] = useState(true)

  // Form
  const [centroCostoId, setCentroCostoId] = useState('')
  const [nombre, setNombre] = useState('')
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'critica'>('media')
  const [esUrgente, setEsUrgente] = useState(false)
  const [items, setItems] = useState<ItemLibre[]>([])

  // Modal de ítem
  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<ItemLibre>({ ...ITEM_VACIO })
  const descripcionRef = useRef<HTMLInputElement>(null)

  // Búsqueda en catálogo de equipos (typeahead dentro del modal)
  const [catalogoQuery, setCatalogoQuery] = useState('')
  const [catalogoResults, setCatalogoResults] = useState<CatalogoResult[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(false)
  const catalogoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscarCatalogo = async (q: string) => {
    if (q.trim().length < 2) {
      setCatalogoResults([])
      return
    }
    setCatalogoLoading(true)
    try {
      const res = await fetch(`/api/catalogo-equipo/search?q=${encodeURIComponent(q.trim())}&limit=15`)
      if (res.ok) {
        const data: CatalogoResult[] = await res.json()
        setCatalogoResults(data)
      } else {
        setCatalogoResults([])
      }
    } catch {
      setCatalogoResults([])
    } finally {
      setCatalogoLoading(false)
    }
  }

  const handleCatalogoQuery = (val: string) => {
    setCatalogoQuery(val)
    if (catalogoTimerRef.current) clearTimeout(catalogoTimerRef.current)
    catalogoTimerRef.current = setTimeout(() => buscarCatalogo(val), 300)
  }

  const elegirDelCatalogo = (item: CatalogoResult) => {
    const precioRef = item.precioLogistica ?? item.precioReal ?? item.precioInterno ?? 0
    setDraft(d => ({
      ...d,
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidad: normalizarUnidad(item.unidad?.nombre),
      marca: item.marca || null,
      catalogoEquipoId: item.id,
      precioUnitario: d.precioUnitario > 0 ? d.precioUnitario : precioRef,
    }))
    setCatalogoQuery('')
    setCatalogoResults([])
  }

  useEffect(() => {
    getCentrosCosto({ activo: true })
      .then(setCentros)
      .catch(() => toast.error('Error al cargar centros de costo'))
      .finally(() => setLoadingCentros(false))

    // Cargar proyectos activos (lightweight) para el selector de override
    fetch('/api/proyectos?fields=id,codigo,nombre&estadosActivos=true')
      .then(r => r.ok ? r.json() : [])
      .then((data: ProyectoOpcion[]) => setProyectos(data))
      .catch(() => {/* silencioso — el override es opcional */})
  }, [])

  const openAddModal = () => {
    setDraft({ ...ITEM_VACIO })
    setEditIndex(null)
    setCatalogoQuery('')
    setCatalogoResults([])
    setModalOpen(true)
    setTimeout(() => descripcionRef.current?.focus(), 100)
  }

  const openEditModal = (index: number) => {
    setDraft({ ...items[index] })
    setEditIndex(index)
    setCatalogoQuery('')
    setCatalogoResults([])
    setModalOpen(true)
    setTimeout(() => descripcionRef.current?.focus(), 100)
  }

  const handleSaveItem = () => {
    if (!draft.descripcion.trim()) return toast.error('La descripción es obligatoria')
    if (draft.cantidadPedida <= 0) return toast.error('La cantidad debe ser mayor a 0')
    // La categoría es obligatoria solo cuando el override es a un proyecto
    // (los centros de costo no tienen sub-buckets Equipos/Servicios/Gastos).
    if (draft.proyectoIdOverride && !draft.categoriaCostoOverride) {
      return toast.error('Selecciona la categoría de costo (Equipos/Servicios/Gastos) para el proyecto destino')
    }

    if (editIndex !== null) {
      setItems(prev => prev.map((item, i) => i === editIndex ? { ...draft } : item))
    } else {
      setItems(prev => [...prev, { ...draft }])
    }
    setModalOpen(false)
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const totalPresupuesto = items.reduce((sum, item) => sum + item.cantidadPedida * item.precioUnitario, 0)

  // Totales agrupados por moneda — un pedido puede mezclar PEN y USD por ítem.
  const totalesPorMoneda = items.reduce<Record<string, number>>((acc, item) => {
    const monto = item.cantidadPedida * item.precioUnitario
    if (!monto) return acc
    const m = item.precioUnitarioMoneda || 'PEN'
    acc[m] = (acc[m] ?? 0) + monto
    return acc
  }, {})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!centroCostoId) return toast.error('Selecciona un centro de costo')
    if (!fechaNecesaria) return toast.error('Indica la fecha necesaria')
    if (items.length === 0) return toast.error('Agrega al menos un ítem')

    try {
      setLoading(true)
      const pedido = await createPedidoInterno({
        centroCostoId,
        responsableId: session!.user!.id,
        nombre: nombre.trim() || null,
        observacion: observacion.trim() || '',
        fechaNecesaria,
        prioridad,
        esUrgente,
        itemsLibres: items.map((item, i) => ({
          codigo: item.codigo.trim() || `ITEM-${String(i + 1).padStart(3, '0')}`,
          descripcion: item.descripcion.trim(),
          unidad: item.unidad,
          cantidadPedida: item.cantidadPedida,
          precioUnitario: item.precioUnitario || undefined,
          precioUnitarioMoneda: item.precioUnitario ? item.precioUnitarioMoneda : null,
          marca: item.marca,
          catalogoEquipoId: item.catalogoEquipoId,
          proyectoId: item.proyectoIdOverride,
          centroCostoId: item.centroCostoIdOverride,
          categoriaCosto: item.categoriaCostoOverride,
        })),
      })
      toast.success(`Pedido ${pedido.codigo} creado`)
      router.push(`/gastos/mis-pedidos/${pedido.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Nuevo Pedido Interno
          </h1>
          <p className="text-xs text-muted-foreground">Pedido a un centro de costo (EPPs, oficina, etc.)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datos generales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="centroCosto">Centro de costo *</Label>
                {loadingCentros ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                  </div>
                ) : (
                  <Select value={centroCostoId} onValueChange={setCentroCostoId}>
                    <SelectTrigger id="centroCosto">
                      <SelectValue placeholder="Seleccionar centro de costo" />
                    </SelectTrigger>
                    <SelectContent>
                      {centros.map(cc => (
                        <SelectItem key={cc.id} value={cc.id}>
                          <span className="font-medium">{cc.nombre}</span>
                          <span className="text-xs text-muted-foreground ml-1 capitalize">({cc.tipo})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre del pedido</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: EPPs mensual, Materiales de oficina..."
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fechaNecesaria">Fecha necesaria *</Label>
                <Input
                  id="fechaNecesaria"
                  type="date"
                  value={fechaNecesaria}
                  onChange={e => setFechaNecesaria(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select value={prioridad} onValueChange={(v) => setPrioridad(v as typeof prioridad)}>
                  <SelectTrigger id="prioridad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacion">Observaciones / Justificación</Label>
              <Textarea
                id="observacion"
                placeholder="¿Para qué se necesita este pedido?"
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={esUrgente}
                onChange={e => setEsUrgente(e.target.checked)}
                className="rounded"
              />
              <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Marcar como urgente
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Tabla de ítems */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ítems del pedido
                {items.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
                )}
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={openAddModal} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Agregar ítem
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Package className="h-8 w-8 opacity-30" />
                <p className="text-sm">Sin ítems. Haz clic en &quot;Agregar ítem&quot; para comenzar.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-center">#</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead className="text-right">P. Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium leading-tight">{item.descripcion}</p>
                            {item.codigo && (
                              <p className="text-[10px] text-muted-foreground font-mono">{item.codigo}</p>
                            )}
                            {(item.proyectoIdOverride || item.centroCostoIdOverride) && (() => {
                              const label = item.proyectoIdOverride
                                ? proyectos.find(p => p.id === item.proyectoIdOverride)?.codigo
                                : centros.find(c => c.id === item.centroCostoIdOverride)?.nombre
                              return (
                                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <ArrowRightLeft className="h-2.5 w-2.5" />
                                  {label ?? 'Override'}
                                </span>
                              )
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{item.cantidadPedida}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.unidad}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.precioUnitario > 0 ? formatCurrency(item.precioUnitario, item.precioUnitarioMoneda) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          {item.precioUnitario > 0
                            ? formatCurrency(item.cantidadPedida * item.precioUnitario, item.precioUnitarioMoneda)
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(index)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-blue-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {Object.keys(totalesPorMoneda).length > 0 && (
                  <div className="flex justify-end px-4 py-3 border-t">
                    <span className="text-sm font-semibold flex items-center gap-3">
                      <span>Total estimado:</span>
                      {Object.entries(totalesPorMoneda).map(([moneda, monto]) => (
                        <span key={moneda} className="text-blue-700">
                          {formatCurrency(monto, moneda)}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || items.length === 0} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
            Crear Pedido
          </Button>
        </div>
      </form>

      {/* Modal agregar/editar ítem */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? 'Editar ítem' : 'Agregar ítem'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 🔍 Buscar en catálogo (solo al crear) */}
            {editIndex === null && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Buscar en catálogo <span className="text-[10px]">(opcional)</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={catalogoQuery}
                    onChange={e => handleCatalogoQuery(e.target.value)}
                    placeholder="Código o descripción (mín. 2 caracteres)"
                    className="pl-8"
                  />
                  {catalogoLoading && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {catalogoQuery.trim().length >= 2 && !catalogoLoading && (
                  <div className="border rounded-md max-h-44 overflow-auto bg-background shadow-sm">
                    {catalogoResults.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Sin resultados — puedes escribirlo manualmente abajo
                      </div>
                    ) : (
                      catalogoResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => elegirDelCatalogo(c)}
                          className="w-full text-left px-3 py-1.5 hover:bg-muted/60 border-b last:border-b-0 text-xs"
                        >
                          <div className="font-medium truncate">{c.descripcion}</div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                            <span>{c.codigo}</span>
                            {c.marca && <span>· {c.marca}</span>}
                            <span>· {c.unidad?.nombre}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {draft.catalogoEquipoId && (
                  <p className="text-[10px] text-emerald-700">
                    ✓ Item del catálogo cargado{draft.marca ? ` · ${draft.marca}` : ''}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="draft-descripcion">Descripción *</Label>
              <Input
                id="draft-descripcion"
                ref={descripcionRef}
                placeholder="Ej: Casco de seguridad, Papel bond A4..."
                value={draft.descripcion}
                onChange={e => setDraft(d => ({ ...d, descripcion: e.target.value, catalogoEquipoId: null }))}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="draft-codigo">Código (opcional)</Label>
                <Input
                  id="draft-codigo"
                  placeholder="Ej: EPP-001"
                  value={draft.codigo}
                  onChange={e => setDraft(d => ({ ...d, codigo: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="draft-unidad">Unidad</Label>
                <Select value={draft.unidad} onValueChange={v => setDraft(d => ({ ...d, unidad: v }))}>
                  <SelectTrigger id="draft-unidad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="draft-cantidad">Cantidad *</Label>
                <Input
                  id="draft-cantidad"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.cantidadPedida}
                  onChange={e => setDraft(d => ({ ...d, cantidadPedida: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="draft-precio">
                  Precio estimado <span className="text-[10px] text-muted-foreground">(opcional)</span>
                </Label>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <Select
                    value={draft.precioUnitarioMoneda}
                    onValueChange={v => setDraft(d => ({ ...d, precioUnitarioMoneda: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONEDAS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="draft-precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.precioUnitario || ''}
                    placeholder="0.00"
                    onChange={e => setDraft(d => ({ ...d, precioUnitario: parseFloat(e.target.value) || 0 }))}
                    onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                  />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground -mt-2">
              Si no conoces el precio, déjalo en 0; logística lo completa al cotizar.
            </p>

            {draft.cantidadPedida > 0 && draft.precioUnitario > 0 && (
              <p className="text-sm text-right text-muted-foreground">
                Subtotal:{' '}
                <span className="font-semibold text-gray-800">
                  {formatCurrency(draft.cantidadPedida * draft.precioUnitario, draft.precioUnitarioMoneda)}
                </span>
              </p>
            )}

            {/* Override de imputación: permite que el costo vaya a un proyecto/centro
                distinto del centro de costo del pedido (caso típico: EPPs por proyecto). */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span className="font-medium">Asignar a otro proyecto / centro de costo</span>
                <span className="text-[10px]">(opcional)</span>
              </div>
              <Select
                value={
                  draft.proyectoIdOverride
                    ? `proyecto:${draft.proyectoIdOverride}`
                    : draft.centroCostoIdOverride
                    ? `centro:${draft.centroCostoIdOverride}`
                    : '__heredar__'
                }
                onValueChange={v => {
                  if (v === '__heredar__') {
                    setDraft(d => ({ ...d, proyectoIdOverride: null, centroCostoIdOverride: null, categoriaCostoOverride: null }))
                  } else if (v.startsWith('proyecto:')) {
                    setDraft(d => ({
                      ...d,
                      proyectoIdOverride: v.slice(9),
                      centroCostoIdOverride: null,
                      categoriaCostoOverride: d.categoriaCostoOverride ?? 'gastos',
                    }))
                  } else if (v.startsWith('centro:')) {
                    // Los centros de costo no tienen tabs Equipos/Servicios/Gastos:
                    // la categoría no aplica, la limpiamos.
                    setDraft(d => ({
                      ...d,
                      proyectoIdOverride: null,
                      centroCostoIdOverride: v.slice(7),
                      categoriaCostoOverride: null,
                    }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Heredar del pedido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__heredar__">
                    <span className="text-muted-foreground">Heredar del pedido (por defecto)</span>
                  </SelectItem>
                  {proyectos.length > 0 && (
                    <div className="px-2 py-1 text-[10px] font-semibold text-blue-700 uppercase">Proyectos</div>
                  )}
                  {proyectos.map(p => (
                    <SelectItem key={`p-${p.id}`} value={`proyecto:${p.id}`}>
                      <span className="font-medium">{p.codigo}</span>
                      <span className="text-xs text-muted-foreground ml-1">— {p.nombre}</span>
                    </SelectItem>
                  ))}
                  {centros.length > 0 && (
                    <div className="px-2 py-1 text-[10px] font-semibold text-emerald-700 uppercase">Centros de costo</div>
                  )}
                  {centros
                    .filter(cc => cc.id !== centroCostoId)
                    .map(cc => (
                      <SelectItem key={`c-${cc.id}`} value={`centro:${cc.id}`}>
                        <span className="font-medium">{cc.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-1 capitalize">({cc.tipo})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {draft.proyectoIdOverride && (
                <>
                  <div className="space-y-1.5 mt-2">
                    <Label className="text-xs">Categoría de costo *</Label>
                    <Select
                      value={draft.categoriaCostoOverride ?? ''}
                      onValueChange={v => setDraft(d => ({ ...d, categoriaCostoOverride: v as CategoriaCostoStr }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gastos">Gastos (viáticos, EPPs, capacitaciones)</SelectItem>
                        <SelectItem value="equipos">Equipos</SelectItem>
                        <SelectItem value="servicios">Servicios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Se imputará en la pestaña "{draft.categoriaCostoOverride ?? '…'}" del proyecto destino.
                  </p>
                </>
              )}
              {draft.centroCostoIdOverride && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  El ítem se imputará al centro de costo seleccionado (gasto operativo).
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} className="bg-blue-600 hover:bg-blue-700">
              {editIndex !== null ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
