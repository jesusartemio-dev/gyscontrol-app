'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  Truck,
  Clock,
  Trash2,
  MoreHorizontal,
  ChevronsRight,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DataPagination, usePagination } from '@/components/ui/data-pagination'
import type { PaginationMeta } from '@/types/payloads'
import { useSession } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'

interface Recepcion {
  id: string
  cantidadRecibida: number
  fechaRecepcion: string
  estado: string
  observaciones: string | null
  motivoRechazo: string | null
  confirmadoPor: { name: string } | null
  entregadoPor: { name: string } | null
  rechazadoPor: { name: string } | null
  fechaConfirmacion: string | null
  fechaEntregaProyecto: string | null
  fechaRechazo: string | null
  ordenCompraItem: {
    id: string
    codigo: string
    descripcion: string
    cantidad: number
    unidad: string
    ordenCompra: {
      id: string
      numero: string
      proyecto: { id: string; nombre: string; codigo: string } | null
    }
  } | null
  pedidoEquipoItem: {
    id: string
    codigo: string
    pedidoEquipo: { id: string; codigo: string }
  } | null
  requerimientoMaterialItem: {
    id: string
    codigo: string
    descripcion: string
    cantidadSolicitada: number
    unidad: string
    hojaDeGastos: { id: string; numero: string }
    proyecto: { id: string; nombre: string; codigo: string } | null
  } | null
}

type RecepcionFuente = 'oc' | 'req' | 'directo'

function getRecepcionInfo(r: Recepcion): {
  fuente: RecepcionFuente
  origenLabel: string
  origenHref: string | null
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  proyecto: { nombre: string } | null
} {
  if (r.requerimientoMaterialItem) {
    const req = r.requerimientoMaterialItem
    return {
      fuente: 'req',
      origenLabel: req.hojaDeGastos.numero,
      origenHref: `/gastos/mis-requerimientos/${req.hojaDeGastos.id}`,
      codigo: req.codigo,
      descripcion: req.descripcion,
      cantidad: req.cantidadSolicitada,
      unidad: req.unidad,
      proyecto: req.proyecto,
    }
  }
  if (r.ordenCompraItem) {
    const oc = r.ordenCompraItem
    return {
      fuente: 'oc',
      origenLabel: oc.ordenCompra.numero,
      origenHref: `/logistica/ordenes-compra/${oc.ordenCompra.id}`,
      codigo: oc.codigo,
      descripcion: oc.descripcion,
      cantidad: oc.cantidad,
      unidad: oc.unidad,
      proyecto: oc.ordenCompra.proyecto,
    }
  }
  return {
    fuente: 'directo',
    origenLabel: r.pedidoEquipoItem?.pedidoEquipo?.codigo || '—',
    origenHref: r.pedidoEquipoItem ? `/logistica/pedidos/${r.pedidoEquipoItem.pedidoEquipo.id}` : null,
    codigo: r.pedidoEquipoItem?.codigo || '—',
    descripcion: '—',
    cantidad: r.cantidadRecibida,
    unidad: '',
    proyecto: null,
  }
}

type TabEstado = 'all' | 'pendiente' | 'en_almacen' | 'entregado_proyecto' | 'rechazado'

const TABS: { key: TabEstado; label: string; icon: any; color: string }[] = [
  { key: 'all', label: 'Todas', icon: Package, color: 'text-gray-600' },
  { key: 'pendiente', label: 'Pendientes', icon: Clock, color: 'text-amber-600' },
  { key: 'en_almacen', label: 'En almacén', icon: Package, color: 'text-blue-600' },
  { key: 'entregado_proyecto', label: 'Entregadas', icon: Truck, color: 'text-green-600' },
  { key: 'rechazado', label: 'Rechazadas', icon: XCircle, color: 'text-red-600' },
]


const STEPPER_STEPS = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_almacen', label: 'Almacén' },
  { key: 'entregado_proyecto', label: 'Entregado' },
]

function RecepcionMiniStepper({ estado }: { estado: string }) {
  if (estado === 'rechazado') {
    return (
      <div className="flex items-center gap-1">
        <XCircle className="h-3.5 w-3.5 text-red-500" />
        <span className="text-[10px] font-medium text-red-600">Rechazado</span>
      </div>
    )
  }

  const currentIdx = STEPPER_STEPS.findIndex(s => s.key === estado)

  return (
    <div className="flex items-center gap-0.5">
      {STEPPER_STEPS.map((step, i) => {
        const isCompleted = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={step.key} className="flex items-center gap-0.5">
            {i > 0 && (
              <div className={cn('w-3 h-[1.5px]', isCompleted || isCurrent ? 'bg-emerald-400' : 'bg-gray-200')} />
            )}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-3.5 h-3.5 rounded-full flex items-center justify-center',
                isCompleted ? 'bg-emerald-500' : isCurrent ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-gray-200'
              )}>
                {isCompleted ? (
                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                ) : isCurrent ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                )}
              </div>
              <span className={cn(
                'text-[8px] mt-0.5 leading-tight',
                isCurrent ? 'font-semibold text-emerald-700' : isCompleted ? 'text-emerald-600' : 'text-gray-400'
              )}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function RecepcionesPage() {
  const { data: session } = useSession()
  const role = session?.user?.role || ''

  const [recepciones, setRecepciones] = useState<Recepcion[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: 1, limit: 20, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false,
  })
  const [activeTab, setActiveTab] = useState<TabEstado>('pendiente')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { page, limit, handlePageChange, handleLimitChange, reset: resetPagination } = usePagination(1, 20)

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    type: 'confirmar_almacen' | 'confirmar_proyecto' | 'rechazar' | 'retroceder' | 'retroceder_entrega' | 'revertir' | 'eliminar'
    recepcion: Recepcion
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMotivo, setActionMotivo] = useState('')
  const [cantidadReal, setCantidadReal] = useState<string>('')

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState<{ tipo: 'almacen' | 'proyecto'; ids: string[]; label: string } | null>(null)
  // cantidades editables por item en el bulk almacén: id → cantidadReal string
  const [bulkCantidades, setBulkCantidades] = useState<Record<string, string>>({})

  const canBulkSelect = (r: Recepcion) =>
    (r.estado === 'pendiente' || r.estado === 'en_almacen') &&
    ['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)

  const selectableOnPage = recepciones.filter(canBulkSelect)
  const allPageSelected = selectableOnPage.length > 0 && selectableOnPage.every(r => selectedIds.has(r.id))
  const somePageSelected = selectableOnPage.some(r => selectedIds.has(r.id))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); selectableOnPage.forEach(r => n.delete(r.id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); selectableOnPage.forEach(r => n.add(r.id)); return n })
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const executeBulkAction = async () => {
    if (!bulkConfirm) return
    setBulkLoading(true)
    let ok = 0, fail = 0
    const paso = bulkConfirm.tipo === 'almacen' ? 'almacen' : 'proyecto'
    for (const id of bulkConfirm.ids) {
      try {
        const cantidadRealVal = bulkConfirm.tipo === 'almacen' ? parseFloat(bulkCantidades[id] || '') : NaN
        const body: any = { paso }
        if (!isNaN(cantidadRealVal) && cantidadRealVal > 0) body.cantidadReal = cantidadRealVal
        const res = await fetch(`/api/recepcion-pendiente/${id}/confirmar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }
    setBulkLoading(false)
    setBulkConfirm(null)
    setBulkCantidades({})
    setSelectedIds(new Set())
    if (ok > 0) toast.success(`${ok} recepción(es) confirmadas`)
    if (fail > 0) toast.error(`${fail} no pudieron procesarse`)
    fetchData()
  }

  const initBulkCantidades = (ids: string[], tipo: 'almacen' | 'proyecto') => {
    if (tipo !== 'almacen') return
    const init: Record<string, string> = {}
    for (const id of ids) {
      const r = recepciones.find(x => x.id === id)
      if (r) init[id] = String(r.cantidadRecibida)
    }
    setBulkCantidades(init)
  }

  const openBulkFromSelection = (tipo: 'almacen' | 'proyecto') => {
    const estadoFiltro = tipo === 'almacen' ? 'pendiente' : 'en_almacen'
    const ids = recepciones
      .filter(r => selectedIds.has(r.id) && r.estado === estadoFiltro)
      .map(r => r.id)
    if (ids.length === 0) { toast.error('Ningún item seleccionado tiene el estado correcto'); return }
    const label = tipo === 'almacen' ? 'Confirmar llegada a almacén' : 'Entregar a proyecto'
    initBulkCantidades(ids, tipo)
    setBulkConfirm({ tipo, ids, label })
  }

  const openBulkAll = (tipo: 'almacen' | 'proyecto') => {
    const estadoFiltro = tipo === 'almacen' ? 'pendiente' : 'en_almacen'
    const ids = recepciones.filter(r => r.estado === estadoFiltro).map(r => r.id)
    if (ids.length === 0) return
    const label = tipo === 'almacen' ? 'Confirmar todos en almacén' : 'Entregar todos al proyecto'
    initBulkCantidades(ids, tipo)
    setBulkConfirm({ tipo, ids, label })
  }

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      resetPagination()
    }, 400)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [search, resetPagination])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', limit.toString())
      if (activeTab !== 'all') params.set('estado', activeTab)
      if (debouncedSearch) params.set('search', debouncedSearch)

      const res = await fetch(`/api/logistica/recepciones?${params.toString()}`)
      const result = await res.json()

      if (result.ok) {
        setRecepciones(result.data)
        setCounts(result.counts || {})
        setPaginationMeta({
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNextPage: result.pagination.hasNext,
          hasPrevPage: result.pagination.hasPrev,
        })
      }
    } catch {
      toast.error('Error al cargar recepciones')
    } finally {
      setLoading(false)
    }
  }, [page, limit, activeTab, debouncedSearch])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTabChange = (tab: TabEstado) => {
    setActiveTab(tab)
    resetPagination()
    setSelectedIds(new Set())
  }

  const executeAction = async () => {
    if (!actionDialog) return
    const { type, recepcion } = actionDialog
    setActionLoading(true)

    try {
      let url = ''
      let body: any = {}

      switch (type) {
        case 'confirmar_almacen': {
          url = `/api/recepcion-pendiente/${recepcion.id}/confirmar`
          const qty = parseFloat(cantidadReal)
          body = { paso: 'almacen', ...(cantidadReal && !isNaN(qty) ? { cantidadReal: qty } : {}) }
          break
        }
        case 'confirmar_proyecto':
          url = `/api/recepcion-pendiente/${recepcion.id}/confirmar`
          body = { paso: 'proyecto' }
          break
        case 'rechazar':
          if (actionMotivo.trim().length < 5) {
            toast.error('El motivo debe tener al menos 5 caracteres')
            setActionLoading(false)
            return
          }
          url = `/api/recepcion-pendiente/${recepcion.id}/rechazar`
          body = { observaciones: actionMotivo.trim() }
          break
        case 'retroceder':
          url = `/api/recepcion-pendiente/${recepcion.id}/retroceder`
          body = { targetEstado: 'pendiente', observaciones: actionMotivo.trim() || undefined }
          break
        case 'retroceder_entrega':
          url = `/api/recepcion-pendiente/${recepcion.id}/retroceder`
          body = { targetEstado: 'en_almacen', observaciones: actionMotivo.trim() || undefined }
          break
        case 'revertir':
          url = `/api/recepcion-pendiente/${recepcion.id}/revertir`
          body = { observaciones: actionMotivo.trim() || undefined }
          break
        case 'eliminar':
          url = `/api/recepcion-pendiente/${recepcion.id}`
          break
      }

      const res = await fetch(url, {
        method: type === 'eliminar' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(type !== 'eliminar' ? { body: JSON.stringify(body) } : {}),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al ejecutar acción')
      }

      toast.success(
        type === 'confirmar_almacen' ? 'Recepción confirmada en almacén' :
        type === 'confirmar_proyecto' ? 'Entrega a proyecto confirmada' :
        type === 'rechazar' ? 'Recepción rechazada' :
        type === 'retroceder' ? 'Retroceso a pendiente completado' :
        type === 'retroceder_entrega' ? 'Entrega a proyecto revertida' :
        type === 'eliminar' ? 'Recepción eliminada' :
        'Rechazo revertido'
      )
      setActionDialog(null)
      setActionMotivo('')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al ejecutar acción')
    } finally {
      setActionLoading(false)
    }
  }

  const totalPendientes = (counts['pendiente'] || 0) + (counts['en_almacen'] || 0)

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Recepciones</h1>
          <p className="text-sm text-muted-foreground">
            {totalPendientes > 0 ? `${totalPendientes} recepción(es) pendientes de gestión` : 'Todas las recepciones al día'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b overflow-x-auto">
        {TABS.map(tab => {
          const count = tab.key === 'all'
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : counts[tab.key] || 0
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + bulk button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por OC, REQ, código de ítem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {activeTab === 'pendiente' && (counts['pendiente'] || 0) > 0 &&
          ['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role) && (
          <Button size="sm" variant="outline" className="h-9 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => openBulkAll('almacen')} disabled={bulkLoading}>
            <ChevronsRight className="h-4 w-4" />
            Pasar todos a Almacén ({counts['pendiente']})
          </Button>
        )}
        {activeTab === 'en_almacen' && (counts['en_almacen'] || 0) > 0 &&
          ['admin', 'gerente', 'logistico', 'coordinador_logistico', 'gestor', 'coordinador'].includes(role) && (
          <Button size="sm" variant="outline" className="h-9 gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => openBulkAll('proyecto')} disabled={bulkLoading}>
            <ChevronsRight className="h-4 w-4" />
            Entregar todos al proyecto ({counts['en_almacen']})
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recepciones.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-30" />
              <span className="text-sm">No hay recepciones en este estado</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                      className={somePageSelected && !allPageSelected ? 'opacity-50' : ''}
                    />
                  </TableHead>
                  <TableHead className="w-[130px]">Origen</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Ítem</TableHead>
                  <TableHead className="text-right w-[120px]">Cantidad</TableHead>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead className="w-[160px]">Estado</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recepciones.map(r => {
                  const info = getRecepcionInfo(r)
                  const fuenteStyles: Record<RecepcionFuente, string> = {
                    oc: 'bg-blue-50 text-blue-700 border-blue-200',
                    req: 'bg-purple-50 text-purple-700 border-purple-200',
                    directo: 'bg-gray-50 text-gray-600 border-gray-200',
                  }
                  const fuenteLabel: Record<RecepcionFuente, string> = {
                    oc: 'OC', req: 'REQ', directo: 'Directo',
                  }
                  return (
                    <TableRow key={r.id} className={selectedIds.has(r.id) ? 'bg-blue-50/50' : ''}>
                      <TableCell className="pl-4">
                        {canBulkSelect(r) ? (
                          <Checkbox
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={() => toggleSelect(r.id)}
                            aria-label="Seleccionar"
                          />
                        ) : <span className="w-4 h-4 block" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex w-fit items-center text-[9px] font-semibold px-1.5 py-0.5 rounded border ${fuenteStyles[info.fuente]}`}>
                            {fuenteLabel[info.fuente]}
                          </span>
                          {info.origenHref ? (
                            <Link href={info.origenHref} className="font-mono text-[11px] text-blue-600 hover:underline">
                              {info.origenLabel}
                            </Link>
                          ) : (
                            <span className="font-mono text-[11px] text-muted-foreground">{info.origenLabel}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {info.proyecto?.nombre || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{info.codigo}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {info.descripcion}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {r.cantidadRecibida} / {info.cantidad} {info.unidad}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatFecha(r.fechaRecepcion)}
                      </TableCell>
                      <TableCell>
                        <RecepcionMiniStepper estado={r.estado} />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const items: { label: string; icon: React.ReactNode; onClick: () => void; className?: string; separator?: boolean }[] = []

                          if (r.estado === 'pendiente') {
                            if (['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role)) {
                              items.push({
                                label: 'Confirmar almacén',
                                icon: <CheckCircle className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'confirmar_almacen', recepcion: r }),
                                className: 'text-blue-600',
                              })
                              items.push({
                                label: 'Rechazar',
                                icon: <XCircle className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'rechazar', recepcion: r }),
                                className: 'text-red-600',
                              })
                            }
                            if (role === 'admin') {
                              items.push({
                                label: 'Eliminar',
                                icon: <Trash2 className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'eliminar', recepcion: r }),
                                className: 'text-red-600',
                                separator: true,
                              })
                            }
                          }

                          if (r.estado === 'en_almacen') {
                            if (['admin', 'gerente', 'logistico', 'coordinador_logistico', 'gestor', 'coordinador'].includes(role)) {
                              items.push({
                                label: 'Entregar a proyecto',
                                icon: <Truck className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'confirmar_proyecto', recepcion: r }),
                                className: 'text-green-600',
                              })
                            }
                            if (['admin', 'gerente', 'logistico', 'coordinador_logistico', 'gestor'].includes(role)) {
                              items.push({
                                label: 'Rechazar',
                                icon: <XCircle className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'rechazar', recepcion: r }),
                                className: 'text-red-600',
                              })
                            }
                            if (['admin', 'gerente'].includes(role)) {
                              items.push({
                                label: 'Retroceder a pendiente',
                                icon: <RotateCcw className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'retroceder', recepcion: r }),
                                className: 'text-orange-600',
                              })
                            }
                            if (role === 'admin') {
                              items.push({
                                label: 'Eliminar',
                                icon: <Trash2 className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'eliminar', recepcion: r }),
                                className: 'text-red-600',
                                separator: true,
                              })
                            }
                          }

                          if (r.estado === 'rechazado') {
                            if (['admin', 'gerente'].includes(role)) {
                              items.push({
                                label: 'Revertir (reactivar)',
                                icon: <RotateCcw className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'revertir', recepcion: r }),
                                className: 'text-amber-600',
                              })
                            }
                            if (role === 'admin') {
                              items.push({
                                label: 'Eliminar',
                                icon: <Trash2 className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'eliminar', recepcion: r }),
                                className: 'text-red-600',
                                separator: true,
                              })
                            }
                          }

                          if (r.estado === 'entregado_proyecto') {
                            if (['admin', 'gerente'].includes(role)) {
                              items.push({
                                label: 'Retroceder a almacén',
                                icon: <RotateCcw className="h-3.5 w-3.5" />,
                                onClick: () => setActionDialog({ type: 'retroceder_entrega', recepcion: r }),
                                className: 'text-orange-600',
                              })
                            }
                          }

                          if (items.length === 0) {
                            return <span className="text-[10px] text-muted-foreground">—</span>
                          }

                          return (
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {items.map((item, i) => (
                                  <div key={i}>
                                    {item.separator && <DropdownMenuSeparator />}
                                    <DropdownMenuItem
                                      onClick={item.onClick}
                                      className={cn('text-xs gap-2 cursor-pointer', item.className)}
                                    >
                                      {item.icon}
                                      {item.label}
                                    </DropdownMenuItem>
                                  </div>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        })()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paginationMeta.total > 0 && (
        <DataPagination
          pagination={paginationMeta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          limitOptions={[20, 50, 100]}
          showLimitSelector
          showItemsInfo
          size="sm"
          itemsLabel="recepciones"
        />
      )}

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-gray-700">
          <span className="text-sm font-medium mr-1">{selectedIds.size} seleccionado(s)</span>
          {recepciones.some(r => selectedIds.has(r.id) && r.estado === 'pendiente') &&
            ['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(role) && (
            <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              onClick={() => openBulkFromSelection('almacen')} disabled={bulkLoading}>
              <CheckCircle className="h-3.5 w-3.5" />
              Confirmar almacén
            </Button>
          )}
          {recepciones.some(r => selectedIds.has(r.id) && r.estado === 'en_almacen') &&
            ['admin', 'gerente', 'logistico', 'coordinador_logistico', 'gestor', 'coordinador'].includes(role) && (
            <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={() => openBulkFromSelection('proyecto')} disabled={bulkLoading}>
              <Truck className="h-3.5 w-3.5" />
              Entregar al proyecto
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Bulk confirmation dialog */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-2xl border w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
            <div className="px-5 pt-5 pb-3 border-b shrink-0">
              <h2 className="text-base font-semibold">{bulkConfirm.label}</h2>
              {bulkConfirm.tipo === 'almacen' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ajusta las cantidades si algún item llegó parcialmente.
                </p>
              )}
              {bulkConfirm.tipo === 'proyecto' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Se marcarán {bulkConfirm.ids.length} recepción(es) como entregadas al proyecto.
                </p>
              )}
            </div>

            {bulkConfirm.tipo === 'almacen' && (
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                {bulkConfirm.ids.map(id => {
                  const r = recepciones.find(x => x.id === id)
                  if (!r) return null
                  const info = getRecepcionInfo(r)
                  const cantInput = bulkCantidades[id] ?? String(r.cantidadRecibida)
                  const cantVal = parseFloat(cantInput)
                  const isParcial = !isNaN(cantVal) && cantVal < r.cantidadRecibida
                  return (
                    <div key={id} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-muted-foreground">{info.codigo}</div>
                        <div className="text-sm font-medium truncate">{info.descripcion}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={r.cantidadRecibida}
                          value={cantInput}
                          onChange={e => setBulkCantidades(prev => ({ ...prev, [id]: e.target.value }))}
                          className="h-7 w-20 text-xs text-right"
                        />
                        <span className="text-xs text-muted-foreground">/ {r.cantidadRecibida} {info.unidad}</span>
                        {isParcial && <span className="text-[10px] text-amber-600 font-medium">parcial</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="px-5 py-3 border-t shrink-0 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setBulkConfirm(null); setBulkCantidades({}) }} disabled={bulkLoading}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={executeBulkAction}
                disabled={bulkLoading}
                className={bulkConfirm.tipo === 'almacen' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Confirmar {bulkConfirm.ids.length} item(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog */}
      <AlertDialog open={!!actionDialog} onOpenChange={(open) => { if (!open) { setActionDialog(null); setActionMotivo(''); setCantidadReal('') } }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.type === 'confirmar_almacen' && 'Confirmar llegada a almacén'}
              {actionDialog?.type === 'confirmar_proyecto' && 'Confirmar entrega a proyecto'}
              {actionDialog?.type === 'rechazar' && 'Rechazar recepción'}
              {actionDialog?.type === 'retroceder' && 'Retroceder a pendiente'}
              {actionDialog?.type === 'retroceder_entrega' && 'Retroceder a almacén'}
              {actionDialog?.type === 'revertir' && 'Revertir rechazo'}
              {actionDialog?.type === 'eliminar' && 'Eliminar recepción'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {actionDialog?.recepcion && (() => {
                  const info = getRecepcionInfo(actionDialog.recepcion)
                  const fuenteLabel: Record<RecepcionFuente, string> = { oc: 'OC', req: 'REQ', directo: 'Pedido' }
                  return (
                    <span>
                      {actionDialog.recepcion.cantidadRecibida} x {info.codigo}
                      {' '}— {fuenteLabel[info.fuente]} {info.origenLabel}
                    </span>
                  )
                })()}
                {actionDialog?.type === 'eliminar' && (
                  <span className="block mt-2 text-red-600 font-medium">
                    Esta acción revertirá las cantidades registradas. No se puede deshacer.
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {actionDialog?.type === 'confirmar_almacen' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Cantidad recibida
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  (dejar vacío = {actionDialog.recepcion.cantidadRecibida} solicitado)
                </span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={actionDialog.recepcion.cantidadRecibida}
                placeholder={String(actionDialog.recepcion.cantidadRecibida)}
                value={cantidadReal}
                onChange={e => setCantidadReal(e.target.value)}
                className="h-8 text-sm"
              />
              {cantidadReal && parseFloat(cantidadReal) < actionDialog.recepcion.cantidadRecibida && (
                <p className="text-xs text-amber-600">
                  Recepción parcial: el resto ({actionDialog.recepcion.cantidadRecibida - parseFloat(cantidadReal)} unid.) seguirá pendiente para el próximo intento.
                </p>
              )}
            </div>
          )}

          {(actionDialog?.type === 'rechazar' || actionDialog?.type === 'retroceder' || actionDialog?.type === 'retroceder_entrega' || actionDialog?.type === 'revertir') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {actionDialog.type === 'rechazar' ? 'Motivo del rechazo *' : 'Observaciones (opcional)'}
              </label>
              <Textarea
                placeholder={actionDialog.type === 'rechazar' ? 'Describe la razón del rechazo...' : 'Motivo del retroceso...'}
                value={actionMotivo}
                onChange={(e) => setActionMotivo(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); executeAction() }}
              disabled={actionLoading || (actionDialog?.type === 'rechazar' && actionMotivo.trim().length < 5)}
              className={cn(
                (actionDialog?.type === 'rechazar' || actionDialog?.type === 'eliminar') ? 'bg-red-600 hover:bg-red-700' :
                (actionDialog?.type === 'retroceder' || actionDialog?.type === 'retroceder_entrega') ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                actionDialog?.type === 'confirmar_almacen' ? 'Confirmar' :
                actionDialog?.type === 'confirmar_proyecto' ? 'Confirmar entrega' :
                actionDialog?.type === 'rechazar' ? 'Rechazar' :
                actionDialog?.type === 'retroceder' ? 'Retroceder' :
                actionDialog?.type === 'retroceder_entrega' ? 'Retroceder a almacén' :
                actionDialog?.type === 'eliminar' ? 'Eliminar' :
                'Revertir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
