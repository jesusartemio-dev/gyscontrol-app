'use client'

import React, { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowLeft, Loader2, Building2, Calendar, User, AlertTriangle, Package, Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { getPedidoInternoById, deletePedidoInterno, type PedidoInterno, type PedidoInternoItem } from '@/lib/services/pedidoInterno'
import { getCentrosCosto } from '@/lib/services/centroCosto'
import type { CentroCosto } from '@/types'
import PedidoEstadoFlujoBanner from '@/components/equipos/PedidoEstadoFlujoBanner'

const UNIDADES = ['und', 'par', 'm', 'm²', 'm³', 'kg', 'lt', 'caja', 'bolsa', 'rollo', 'juego', 'set']

interface ProyectoOpcion {
  id: string
  codigo: string
  nombre: string
}

type CategoriaCostoStr = 'equipos' | 'servicios' | 'gastos'

interface ItemDraft {
  codigo: string
  descripcion: string
  unidad: string
  cantidadPedida: number
  precioUnitario: number
  proyectoIdOverride: string | null
  centroCostoIdOverride: string | null
  categoriaCostoOverride: CategoriaCostoStr | null
}

const ITEM_VACIO: ItemDraft = {
  codigo: '',
  descripcion: '',
  unidad: 'und',
  cantidadPedida: 1,
  precioUnitario: 0,
  proyectoIdOverride: null,
  centroCostoIdOverride: null,
  categoriaCostoOverride: null,
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

const estadoColor: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  en_proceso: 'bg-amber-100 text-amber-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

const prioridadColor: Record<string, string> = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-blue-100 text-blue-600',
  alta: 'bg-orange-100 text-orange-600',
  critica: 'bg-red-100 text-red-600',
}

export default function DetallePedidoInternoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [pedido, setPedido] = useState<PedidoInterno | null>(null)
  const [loading, setLoading] = useState(true)
  const [openDelete, setOpenDelete] = useState(false)

  // Modal de ítem
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PedidoInternoItem | null>(null)
  const [draft, setDraft] = useState<ItemDraft>({ ...ITEM_VACIO })
  const [savingItem, setSavingItem] = useState(false)
  const descripcionRef = useRef<HTMLInputElement>(null)

  // Eliminar ítem
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<PedidoInternoItem | null>(null)

  // Catálogos para override de imputación por ítem
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [proyectos, setProyectos] = useState<ProyectoOpcion[]>([])

  useEffect(() => {
    getPedidoInternoById(id)
      .then(setPedido)
      .catch(() => toast.error('Error al cargar el pedido'))
      .finally(() => setLoading(false))

    // Cargar catálogos en paralelo (para el selector de override)
    getCentrosCosto({ activo: true }).then(setCentros).catch(() => {/* silencioso */})
    fetch('/api/proyectos?fields=id,codigo,nombre&estadosActivos=true')
      .then(r => r.ok ? r.json() : [])
      .then((data: ProyectoOpcion[]) => setProyectos(data))
      .catch(() => {/* silencioso */})
  }, [id])

  const handleEstadoUpdated = (nuevoEstado: string) => {
    setPedido(prev => prev ? { ...prev, estado: nuevoEstado } : prev)
  }

  // ─── CRUD ítems ────────────────────────────────────────────────

  const openAddModal = () => {
    setDraft({ ...ITEM_VACIO })
    setEditingItem(null)
    setModalOpen(true)
    setTimeout(() => descripcionRef.current?.focus(), 100)
  }

  const openEditModal = (item: PedidoInternoItem) => {
    setDraft({
      codigo: item.codigo ?? '',
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidadPedida: item.cantidadPedida,
      precioUnitario: item.precioUnitario ?? 0,
      proyectoIdOverride: item.proyectoId ?? null,
      centroCostoIdOverride: item.centroCostoId ?? null,
      categoriaCostoOverride: (item.categoriaCosto as CategoriaCostoStr | null | undefined) ?? null,
    })
    setEditingItem(item)
    setModalOpen(true)
    setTimeout(() => descripcionRef.current?.focus(), 100)
  }

  const handleSaveItem = async () => {
    if (!draft.descripcion.trim()) return toast.error('La descripción es obligatoria')
    if (draft.cantidadPedida <= 0) return toast.error('La cantidad debe ser mayor a 0')
    if (!pedido) return
    const tieneOverride = !!(draft.proyectoIdOverride || draft.centroCostoIdOverride)
    if (tieneOverride && !draft.categoriaCostoOverride) {
      return toast.error('Selecciona la categoría de costo para el destino asignado')
    }

    try {
      setSavingItem(true)

      if (editingItem) {
        // Editar
        const res = await fetch(`/api/pedido-equipo-item/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: draft.codigo || null,
            descripcion: draft.descripcion.trim(),
            unidad: draft.unidad,
            cantidadPedida: draft.cantidadPedida,
            precioUnitario: draft.precioUnitario || null,
            costoTotal: draft.precioUnitario ? draft.cantidadPedida * draft.precioUnitario : null,
            proyectoId: draft.proyectoIdOverride,
            centroCostoId: draft.centroCostoIdOverride,
            categoriaCosto: draft.categoriaCostoOverride,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Error al actualizar ítem')
        }
        const updated = await res.json()
        setPedido(prev => prev ? {
          ...prev,
          pedidoEquipoItem: prev.pedidoEquipoItem.map(i =>
            i.id === editingItem.id ? {
              ...i,
              codigo: updated.codigo,
              descripcion: updated.descripcion,
              unidad: updated.unidad,
              cantidadPedida: updated.cantidadPedida,
              precioUnitario: updated.precioUnitario,
              costoTotal: updated.costoTotal,
              proyectoId: updated.proyectoId ?? null,
              centroCostoId: updated.centroCostoId ?? null,
              categoriaCosto: updated.categoriaCosto ?? null,
            } : i
          )
        } : prev)
        toast.success('Ítem actualizado')
      } else {
        // Crear
        const res = await fetch('/api/pedido-equipo-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pedidoId: pedido.id,
            codigo: draft.codigo || `ITEM-${Date.now()}`,
            descripcion: draft.descripcion.trim(),
            unidad: draft.unidad,
            cantidadPedida: draft.cantidadPedida,
            precioUnitario: draft.precioUnitario || null,
            costoTotal: draft.precioUnitario ? draft.cantidadPedida * draft.precioUnitario : null,
            proyectoId: draft.proyectoIdOverride,
            centroCostoId: draft.centroCostoIdOverride,
            categoriaCosto: draft.categoriaCostoOverride,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Error al agregar ítem')
        }
        const created = await res.json()
        setPedido(prev => prev ? {
          ...prev,
          pedidoEquipoItem: [...prev.pedidoEquipoItem, {
            id: created.id,
            codigo: created.codigo,
            descripcion: created.descripcion,
            unidad: created.unidad,
            cantidadPedida: created.cantidadPedida,
            precioUnitario: created.precioUnitario,
            costoTotal: created.costoTotal,
            estado: created.estado,
            proyectoId: created.proyectoId ?? null,
            centroCostoId: created.centroCostoId ?? null,
            categoriaCosto: created.categoriaCosto ?? null,
          }]
        } : prev)
        toast.success('Ítem agregado')
      }

      setModalOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar ítem')
    } finally {
      setSavingItem(false)
    }
  }

  const handleDeleteItem = async (item: PedidoInternoItem) => {
    try {
      setDeletingItemId(item.id)
      const res = await fetch(`/api/pedido-equipo-item/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al eliminar ítem')
      }
      setPedido(prev => prev ? {
        ...prev,
        pedidoEquipoItem: prev.pedidoEquipoItem.filter(i => i.id !== item.id)
      } : prev)
      toast.success('Ítem eliminado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar ítem')
    } finally {
      setDeletingItemId(null)
      setConfirmDeleteItem(null)
    }
  }

  // ─── Eliminar pedido ──────────────────────────────────────────

  const handleDelete = async () => {
    if (!pedido) return
    try {
      await deletePedidoInterno(pedido.id)
      toast.success('Pedido eliminado')
      router.push('/gastos/mis-pedidos')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="container mx-auto p-6 text-center text-muted-foreground">
        Pedido no encontrado.
        <Button variant="link" onClick={() => router.push('/gastos/mis-pedidos')}>Volver</Button>
      </div>
    )
  }

  const esBorrador = pedido.estado === 'borrador'

  const totalPresupuesto = pedido.pedidoEquipoItem?.reduce(
    (sum, item) => sum + (item.costoTotal ?? 0), 0
  ) ?? 0

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/gastos/mis-pedidos')} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold font-mono">{pedido.codigo}</h1>
            {pedido.esUrgente && (
              <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgente
              </Badge>
            )}
            <Badge className={`border-0 text-xs ${estadoColor[pedido.estado] ?? 'bg-gray-100 text-gray-700'}`}>
              {pedido.estado}
            </Badge>
            {pedido.prioridad && (
              <Badge className={`border-0 text-xs capitalize ${prioridadColor[pedido.prioridad] ?? ''}`}>
                {pedido.prioridad}
              </Badge>
            )}
          </div>
          {pedido.nombre && (
            <p className="text-sm text-muted-foreground">{pedido.nombre}</p>
          )}
        </div>
        {esBorrador && (
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-600 hover:bg-red-50 h-8"
            onClick={() => setOpenDelete(true)}
          >
            Eliminar
          </Button>
        )}
      </div>

      {/* Estado flujo */}
      <PedidoEstadoFlujoBanner
        estado={pedido.estado}
        pedidoId={pedido.id}
        contexto="proyectos"
        onUpdated={handleEstadoUpdated}
      />

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Centro de costo</p>
              <p className="font-medium truncate">{pedido.centroCosto?.nombre ?? '—'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{pedido.centroCosto?.tipo}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha necesaria</p>
              <p className="font-medium">{formatDate(pedido.fechaNecesaria)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Solicitante</p>
              <p className="font-medium truncate">{pedido.user?.name ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Observacion */}
      {pedido.observacion && (
        <Card>
          <CardContent className="p-3 text-sm text-muted-foreground">
            <span className="font-medium text-gray-700">Observación: </span>
            {pedido.observacion}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ítems del pedido ({pedido.pedidoEquipoItem?.length ?? 0})
            </CardTitle>
            {esBorrador && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openAddModal}>
                <Plus className="h-3.5 w-3.5" />
                Agregar ítem
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(pedido.pedidoEquipoItem?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Package className="h-8 w-8 opacity-30" />
              <p className="text-sm">Sin ítems</p>
              {esBorrador && (
                <Button size="sm" variant="outline" className="mt-1 text-xs gap-1" onClick={openAddModal}>
                  <Plus className="h-3.5 w-3.5" />
                  Agregar ítem
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center w-16">Cant.</TableHead>
                  <TableHead className="w-16">Unidad</TableHead>
                  <TableHead className="text-right w-24">P. Unit.</TableHead>
                  <TableHead className="text-right w-24">Total</TableHead>
                  {esBorrador && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.pedidoEquipoItem?.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{item.descripcion}</p>
                      {item.codigo && <p className="text-[10px] text-muted-foreground font-mono">{item.codigo}</p>}
                      {(item.proyectoId || item.centroCostoId) && (() => {
                        const label = item.proyectoId
                          ? proyectos.find(p => p.id === item.proyectoId)?.codigo
                          : centros.find(c => c.id === item.centroCostoId)?.nombre
                        return (
                          <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <ArrowRightLeft className="h-2.5 w-2.5" />
                            {label ?? 'Override'}
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-center text-sm">{item.cantidadPedida}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.unidad}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.precioUnitario ? formatCurrency(item.precioUnitario) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {item.costoTotal ? formatCurrency(item.costoTotal) : '—'}
                    </TableCell>
                    {esBorrador && (
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmDeleteItem(item)}
                            disabled={deletingItemId === item.id}
                          >
                            {deletingItemId === item.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPresupuesto > 0 && (
            <div className="flex justify-end px-4 py-3 border-t">
              <span className="text-sm font-semibold">
                Total: <span className="text-blue-700">{formatCurrency(totalPresupuesto)}</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <p className="text-[11px] text-muted-foreground text-right">
        Creado el {formatDate(pedido.createdAt)}
      </p>

      {/* Modal agregar/editar ítem */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingItem ? 'Editar ítem' : 'Agregar ítem'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Descripción <span className="text-red-500">*</span></Label>
              <Input
                ref={descripcionRef}
                value={draft.descripcion}
                onChange={e => setDraft(d => ({ ...d, descripcion: e.target.value }))}
                placeholder="Ej: Casco de seguridad tipo I"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código (opcional)</Label>
              <Input
                value={draft.codigo}
                onChange={e => setDraft(d => ({ ...d, codigo: e.target.value }))}
                placeholder="Ej: EPP-001"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Unidad</Label>
                <Select value={draft.unidad} onValueChange={v => setDraft(d => ({ ...d, unidad: v }))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.cantidadPedida}
                  onChange={e => setDraft(d => ({ ...d, cantidadPedida: Number(e.target.value) }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Precio estimado (S/)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={draft.precioUnitario || ''}
                onChange={e => setDraft(d => ({ ...d, precioUnitario: Number(e.target.value) }))}
                placeholder="0.00"
                className="h-8 text-sm"
              />
            </div>
            {draft.precioUnitario > 0 && draft.cantidadPedida > 0 && (
              <p className="text-xs text-right text-muted-foreground">
                Total estimado: <span className="font-semibold text-foreground">{formatCurrency(draft.cantidadPedida * draft.precioUnitario)}</span>
              </p>
            )}

            {/* Override de imputación por ítem */}
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
                    setDraft(d => ({
                      ...d,
                      proyectoIdOverride: null,
                      centroCostoIdOverride: v.slice(7),
                      categoriaCostoOverride: d.categoriaCostoOverride ?? 'gastos',
                    }))
                  }
                }}
              >
                <SelectTrigger className="h-8 text-sm">
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
                    .filter(cc => cc.id !== pedido?.centroCostoId)
                    .map(cc => (
                      <SelectItem key={`c-${cc.id}`} value={`centro:${cc.id}`}>
                        <span className="font-medium">{cc.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-1 capitalize">({cc.tipo})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {(draft.proyectoIdOverride || draft.centroCostoIdOverride) && (
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
                        <SelectItem value="gastos">Gastos (EPPs, capacitaciones, suministros)</SelectItem>
                        <SelectItem value="equipos">Equipos</SelectItem>
                        <SelectItem value="servicios">Servicios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Se imputará en "{draft.categoriaCostoOverride ?? '…'}" del destino seleccionado.
                  </p>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 mt-1">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)} disabled={savingItem}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveItem} disabled={savingItem}>
              {savingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {editingItem ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar ítem */}
      <AlertDialog open={!!confirmDeleteItem} onOpenChange={open => !open && setConfirmDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ítem</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar &quot;{confirmDeleteItem?.descripcion}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteItem && handleDeleteItem(confirmDeleteItem)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar pedido */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el pedido &quot;{pedido.codigo}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
