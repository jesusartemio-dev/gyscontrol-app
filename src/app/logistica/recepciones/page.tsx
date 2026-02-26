'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'
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
  }
  pedidoEquipoItem: {
    id: string
    codigo: string
    pedidoEquipo: { id: string; codigo: string }
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

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  en_almacen: { label: 'En almacén', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  entregado_proyecto: { label: 'Entregado', className: 'bg-green-100 text-green-700 border-green-200' },
  rechazado: { label: 'Rechazado', className: 'bg-red-100 text-red-700 border-red-200' },
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
    type: 'confirmar_almacen' | 'confirmar_proyecto' | 'rechazar' | 'retroceder' | 'revertir'
    recepcion: Recepcion
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMotivo, setActionMotivo] = useState('')

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
  }

  const executeAction = async () => {
    if (!actionDialog) return
    const { type, recepcion } = actionDialog
    setActionLoading(true)

    try {
      let url = ''
      let body: any = {}

      switch (type) {
        case 'confirmar_almacen':
          url = `/api/recepcion-pendiente/${recepcion.id}/confirmar`
          body = { paso: 'almacen' }
          break
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
          body = { observaciones: actionMotivo.trim() || undefined }
          break
        case 'revertir':
          url = `/api/recepcion-pendiente/${recepcion.id}/revertir`
          body = { observaciones: actionMotivo.trim() || undefined }
          break
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al ejecutar acción')
      }

      toast.success(
        type === 'confirmar_almacen' ? 'Recepción confirmada en almacén' :
        type === 'confirmar_proyecto' ? 'Entrega a proyecto confirmada' :
        type === 'rechazar' ? 'Recepción rechazada' :
        type === 'retroceder' ? 'Retroceso completado' :
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

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por OC, código de ítem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
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
                  <TableHead className="w-[100px]">OC</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Ítem</TableHead>
                  <TableHead className="text-right w-[120px]">Cantidad</TableHead>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead className="w-[110px]">Estado</TableHead>
                  <TableHead className="w-[200px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recepciones.map(r => {
                  const badge = ESTADO_BADGE[r.estado] || { label: r.estado, className: '' }
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        {r.ordenCompraItem.ordenCompra.numero}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.ordenCompraItem.ordenCompra.proyecto?.nombre || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{r.ordenCompraItem.codigo}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {r.ordenCompraItem.descripcion}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {r.cantidadRecibida} / {r.ordenCompraItem.cantidad} {r.ordenCompraItem.unidad}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatFecha(r.fechaRecepcion)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', badge.className)}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Pendiente: confirmar almacén, rechazar */}
                          {r.estado === 'pendiente' && ['admin', 'gerente', 'logistico'].includes(role) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => setActionDialog({ type: 'confirmar_almacen', recepcion: r })}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Almacén
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setActionDialog({ type: 'rechazar', recepcion: r })}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Rechazar
                              </Button>
                            </>
                          )}

                          {/* En almacén: confirmar proyecto, retroceder, rechazar */}
                          {r.estado === 'en_almacen' && (
                            <>
                              {['admin', 'gerente', 'gestor', 'coordinador'].includes(role) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => setActionDialog({ type: 'confirmar_proyecto', recepcion: r })}
                                >
                                  <Truck className="h-3 w-3 mr-1" />
                                  Entregar
                                </Button>
                              )}
                              {['admin', 'gerente'].includes(role) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                                  onClick={() => setActionDialog({ type: 'retroceder', recepcion: r })}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Retroceder
                                </Button>
                              )}
                              {['admin', 'gerente', 'logistico', 'gestor'].includes(role) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => setActionDialog({ type: 'rechazar', recepcion: r })}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rechazar
                                </Button>
                              )}
                            </>
                          )}

                          {/* Rechazado: revertir */}
                          {r.estado === 'rechazado' && ['admin', 'gerente'].includes(role) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => setActionDialog({ type: 'revertir', recepcion: r })}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Revertir
                            </Button>
                          )}

                          {/* Entregado: info */}
                          {r.estado === 'entregado_proyecto' && (
                            <span className="text-[10px] text-muted-foreground">
                              {r.entregadoPor?.name ? `por ${r.entregadoPor.name}` : ''}
                            </span>
                          )}
                        </div>
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

      {/* Action Dialog */}
      <AlertDialog open={!!actionDialog} onOpenChange={(open) => { if (!open) { setActionDialog(null); setActionMotivo('') } }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.type === 'confirmar_almacen' && 'Confirmar llegada a almacén'}
              {actionDialog?.type === 'confirmar_proyecto' && 'Confirmar entrega a proyecto'}
              {actionDialog?.type === 'rechazar' && 'Rechazar recepción'}
              {actionDialog?.type === 'retroceder' && 'Retroceder a pendiente'}
              {actionDialog?.type === 'revertir' && 'Revertir rechazo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog?.recepcion && (
                <>
                  {actionDialog.recepcion.cantidadRecibida} x {actionDialog.recepcion.ordenCompraItem.codigo}
                  {' '}de OC {actionDialog.recepcion.ordenCompraItem.ordenCompra.numero}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {(actionDialog?.type === 'rechazar' || actionDialog?.type === 'retroceder' || actionDialog?.type === 'revertir') && (
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
                actionDialog?.type === 'rechazar' ? 'bg-red-600 hover:bg-red-700' :
                actionDialog?.type === 'retroceder' ? 'bg-orange-600 hover:bg-orange-700' :
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
                'Revertir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
