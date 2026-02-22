/**
 * 📦 LogisticaPedidosTable - Tabla minimalista de pedidos
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Eye, Package, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
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
import type { PedidoEquipo } from '@/types'

type EstadoPedidoEquipo = 'borrador' | 'enviado' | 'atendido' | 'parcial' | 'entregado' | 'cancelado'
import { formatCurrency } from '@/lib/utils'

type SortField = 'codigo' | 'responsable' | 'fechaPedido' | 'estado' | 'itemsCount' | 'progreso' | 'monto'
type SortDirection = 'asc' | 'desc'

interface LogisticaPedidosTableProps {
  pedidos: PedidoEquipo[]
  loading?: boolean
  onRefresh?: () => void
  onDelete?: (id: string) => void
  className?: string
}

const ESTADOS_CONFIG: Record<EstadoPedidoEquipo, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  enviado: { label: 'Enviado', variant: 'default' },
  atendido: { label: 'Atendido', variant: 'default' },
  parcial: { label: 'Parcial', variant: 'outline' },
  entregado: { label: 'Entregado', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
}

const ITEMS_PER_PAGE = 15

// Helper to calculate progress percentage for a pedido
const calcularProgreso = (pedido: PedidoEquipo): number => {
  if (!pedido.items || pedido.items.length === 0) return 0
  const totalPedido = pedido.items.reduce((sum, item) => sum + (item.cantidadPedida || 0), 0)
  const totalAtendido = pedido.items.reduce((sum, item) => sum + (item.cantidadAtendida || 0), 0)
  return totalPedido > 0 ? (totalAtendido / totalPedido) * 100 : 0
}

export default function LogisticaPedidosTable({ pedidos, loading = false, onDelete, className }: LogisticaPedidosTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('fechaPedido')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Sorting logic
  const sortedPedidos = useMemo(() => {
    if (!pedidos || !Array.isArray(pedidos)) return []

    return [...pedidos].sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortField) {
        case 'codigo':
          aValue = a.codigo || ''
          bValue = b.codigo || ''
          break
        case 'responsable':
          aValue = a.responsable?.name || ''
          bValue = b.responsable?.name || ''
          break
        case 'estado':
          aValue = a.estado || ''
          bValue = b.estado || ''
          break
        case 'fechaPedido':
          aValue = new Date(a.fechaPedido)
          bValue = new Date(b.fechaPedido)
          break
        case 'itemsCount':
          aValue = a.items?.length || 0
          bValue = b.items?.length || 0
          break
        case 'progreso':
          aValue = calcularProgreso(a)
          bValue = calcularProgreso(b)
          break
        case 'monto':
          aValue = a.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0
          bValue = b.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [pedidos, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedPedidos.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentPedidos = sortedPedidos.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const handleDeleteConfirm = () => {
    if (deleteId && onDelete) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-muted-foreground">No hay pedidos disponibles</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[100px]"
              onClick={() => handleSort('codigo')}
            >
              <span className="flex items-center gap-1">Código <SortIcon field="codigo" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort('responsable')}
            >
              <span className="flex items-center gap-1">Responsable <SortIcon field="responsable" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[80px]"
              onClick={() => handleSort('fechaPedido')}
            >
              <span className="flex items-center gap-1">Fecha <SortIcon field="fechaPedido" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[90px]"
              onClick={() => handleSort('estado')}
            >
              <span className="flex items-center gap-1">Estado <SortIcon field="estado" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[60px] text-center"
              onClick={() => handleSort('itemsCount')}
            >
              <span className="flex items-center justify-center gap-1">Items <SortIcon field="itemsCount" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[100px] text-center"
              onClick={() => handleSort('progreso')}
            >
              <span className="flex items-center justify-center gap-1">Progreso <SortIcon field="progreso" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[100px] text-right"
              onClick={() => handleSort('monto')}
            >
              <span className="flex items-center justify-end gap-1">Monto <SortIcon field="monto" /></span>
            </TableHead>
            <TableHead className="text-xs w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentPedidos.map((pedido) => {
            const estadoConfig = ESTADOS_CONFIG[pedido.estado as EstadoPedidoEquipo] || { label: pedido.estado, variant: 'secondary' as const }
            const itemsCount = pedido.items?.length || 0
            const progreso = calcularProgreso(pedido)
            const monto = pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0

            return (
              <TableRow
                key={pedido.id}
                className="hover:bg-gray-50/50 cursor-pointer"
                onClick={() => router.push(`/logistica/pedidos/${pedido.id}`)}
              >
                <TableCell className="font-mono text-xs py-2">
                  <div className="flex items-center gap-1.5">
                    {pedido.codigo}
                    {(pedido as any).esUrgente && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1 font-semibold">URGENTE</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs truncate max-w-[150px]" title={pedido.responsable?.name ?? undefined}>
                      {pedido.responsable?.name || 'Sin asignar'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">
                  {formatDate(pedido.fechaPedido)}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={estadoConfig.variant} className="text-[10px] h-5 px-1.5">
                    {estadoConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-center">
                  <span className={`text-xs ${itemsCount > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                    {itemsCount}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1.5">
                    <Progress
                      value={progreso}
                      className="h-1.5 w-14 flex-shrink-0"
                    />
                    <span className={`text-[10px] font-medium ${
                      progreso >= 100 ? 'text-green-600' :
                      progreso > 0 ? 'text-amber-600' :
                      'text-gray-400'
                    }`}>
                      {progreso.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {formatCurrency(monto)}
                </TableCell>
                <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/logistica/pedidos/${pedido.id}`)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(pedido.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Pagination compacta */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <span className="text-[11px] text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedPedidos.length)} de {sortedPedidos.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs"
            >
              Ant
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2 text-xs"
            >
              Sig
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Eliminar pedido</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta acción no se puede deshacer. El pedido y todos sus items serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="h-8 text-xs bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
