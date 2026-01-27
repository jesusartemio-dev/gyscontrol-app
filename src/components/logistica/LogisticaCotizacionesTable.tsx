/**
 * 📦 LogisticaCotizacionesTable - Tabla minimalista de cotizaciones
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Eye, Package, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { CotizacionProveedor } from '@/types'

type SortField = 'codigo' | 'proveedor' | 'proyecto' | 'estado' | 'createdAt' | 'itemsCount'
type SortDirection = 'asc' | 'desc'

interface LogisticaCotizacionesTableProps {
  cotizaciones: CotizacionProveedor[]
  loading?: boolean
  onRefresh?: () => void
  onDelete?: (id: string) => void
  className?: string
}

type EstadoCotizacion = 'pendiente' | 'solicitado' | 'cotizado' | 'rechazado' | 'seleccionado'

const ESTADOS_CONFIG: Record<EstadoCotizacion, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendiente: { label: 'Pendiente', variant: 'outline' },
  solicitado: { label: 'Solicitado', variant: 'secondary' },
  cotizado: { label: 'Cotizado', variant: 'default' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
  seleccionado: { label: 'Seleccionado', variant: 'default' },
}

const ITEMS_PER_PAGE = 15

export default function LogisticaCotizacionesTable({ cotizaciones, loading = false, onDelete, className }: LogisticaCotizacionesTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Sorting logic
  const sortedCotizaciones = useMemo(() => {
    if (!cotizaciones || !Array.isArray(cotizaciones)) return []

    return [...cotizaciones].sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortField) {
        case 'codigo':
          aValue = a.codigo || ''
          bValue = b.codigo || ''
          break
        case 'proveedor':
          aValue = a.proveedor?.nombre || ''
          bValue = b.proveedor?.nombre || ''
          break
        case 'proyecto':
          aValue = a.proyecto?.nombre || ''
          bValue = b.proyecto?.nombre || ''
          break
        case 'estado':
          aValue = a.estado || ''
          bValue = b.estado || ''
          break
        case 'createdAt':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'itemsCount':
          aValue = a.items?.length || 0
          bValue = b.items?.length || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [cotizaciones, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedCotizaciones.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentCotizaciones = sortedCotizaciones.slice(startIndex, startIndex + ITEMS_PER_PAGE)

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

  if (cotizaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-muted-foreground">No hay cotizaciones disponibles</p>
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
              onClick={() => handleSort('proveedor')}
            >
              <span className="flex items-center gap-1">Proveedor <SortIcon field="proveedor" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[140px]"
              onClick={() => handleSort('proyecto')}
            >
              <span className="flex items-center gap-1">Proyecto <SortIcon field="proyecto" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[60px] text-center"
              onClick={() => handleSort('itemsCount')}
            >
              <span className="flex items-center justify-center gap-1">Items <SortIcon field="itemsCount" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[90px]"
              onClick={() => handleSort('estado')}
            >
              <span className="flex items-center gap-1">Estado <SortIcon field="estado" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[80px]"
              onClick={() => handleSort('createdAt')}
            >
              <span className="flex items-center gap-1">Fecha <SortIcon field="createdAt" /></span>
            </TableHead>
            <TableHead className="text-xs w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentCotizaciones.map((cot) => {
            const estadoConfig = ESTADOS_CONFIG[cot.estado as EstadoCotizacion] || { label: cot.estado, variant: 'secondary' as const }
            const itemsCount = cot.items?.length || 0

            return (
              <TableRow
                key={cot.id}
                className="hover:bg-gray-50/50 cursor-pointer"
                onClick={() => router.push(`/logistica/cotizaciones/${cot.id}`)}
              >
                <TableCell className="font-mono text-xs py-2">
                  {cot.codigo}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    <span className="text-xs truncate max-w-[150px]" title={cot.proveedor?.nombre}>
                      {cot.proveedor?.nombre || 'Sin proveedor'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs text-muted-foreground truncate block max-w-[130px]" title={cot.proyecto?.nombre}>
                    {cot.proyecto?.codigo || '-'}
                  </span>
                </TableCell>
                <TableCell className="py-2 text-center">
                  <span className={`text-xs ${itemsCount > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                    {itemsCount}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={estadoConfig.variant} className="text-[10px] h-5 px-1.5">
                    {estadoConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">
                  {formatDate(cot.createdAt)}
                </TableCell>
                <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/logistica/cotizaciones/${cot.id}`)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(cot.id)}
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
            {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedCotizaciones.length)} de {sortedCotizaciones.length}
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
            <AlertDialogTitle className="text-base">Eliminar cotización</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta acción no se puede deshacer. La cotización y todos sus items serán eliminados permanentemente.
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
