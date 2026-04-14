'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Search, X, Loader2, ShoppingCart, ChevronRight, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { getMisPedidosInternos, deletePedidoInterno, type PedidoInterno } from '@/lib/services/pedidoInterno'

const ESTADOS = [
  { value: 'all', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const PRIORIDADES = [
  { value: 'all', label: 'Todas' },
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

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

export default function MisPedidosPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [pedidos, setPedidos] = useState<PedidoInterno[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterPrioridad, setFilterPrioridad] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PedidoInterno | null>(null)

  useEffect(() => { loadData() }, [session?.user?.id])

  const loadData = async () => {
    if (!session?.user?.id) return
    try {
      setLoading(true)
      const data = await getMisPedidosInternos({ responsableId: session.user.id })
      setPedidos(data)
    } catch {
      toast.error('Error al cargar pedidos internos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePedidoInterno(deleteTarget.id)
      toast.success(`Pedido ${deleteTarget.codigo} eliminado`)
      setDeleteTarget(null)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const filtered = useMemo(() => {
    let result = pedidos
    if (filterEstado !== 'all') result = result.filter(p => p.estado === filterEstado)
    if (filterPrioridad !== 'all') result = result.filter(p => p.prioridad === filterPrioridad)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p =>
        p.codigo.toLowerCase().includes(term) ||
        (p.nombre?.toLowerCase() ?? '').includes(term) ||
        p.centroCosto?.nombre?.toLowerCase().includes(term) ||
        (p.observacion?.toLowerCase() ?? '').includes(term)
      )
    }
    return result
  }, [pedidos, filterEstado, filterPrioridad, searchTerm])

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Mis Pedidos Internos
          </h1>
          <p className="text-sm text-muted-foreground">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} a centros de costo
          </p>
        </div>
        <Button onClick={() => router.push('/gastos/mis-pedidos/nuevo')} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre, centro de costo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map(e => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            {PRIORIDADES.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {pedidos.length === 0
                ? 'No hay pedidos internos aún. Crea el primero.'
                : 'No se encontraron resultados.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre / Descripción</TableHead>
                  <TableHead>Centro de Costo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead className="text-right">Presupuesto</TableHead>
                  <TableHead>Fecha necesaria</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(pedido => (
                  <TableRow
                    key={pedido.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/gastos/mis-pedidos/${pedido.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {pedido.esUrgente && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        {pedido.codigo}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {pedido.nombre || pedido.observacion || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pedido.centroCosto?.nombre ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border-0 ${estadoColor[pedido.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                        {pedido.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pedido.prioridad && (
                        <Badge className={`text-xs border-0 capitalize ${prioridadColor[pedido.prioridad] ?? ''}`}>
                          {pedido.prioridad}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {pedido.presupuestoTotal > 0 ? formatCurrency(pedido.presupuestoTotal) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(pedido.fechaNecesaria)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {pedido.estado === 'borrador' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(pedido) }}
                            className="p-1 rounded hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Pedido Interno</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el pedido &quot;{deleteTarget?.codigo}&quot;? Esta acción no se puede deshacer.
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
