/**
 * 📦 LogisticaListasTable - Tabla minimalista de listas
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Eye, Package, Trash2 } from 'lucide-react'
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useDeleteWithValidation } from '@/hooks/useDeleteWithValidation'
import { DeleteWithValidationDialog } from '@/components/DeleteWithValidationDialog'
import type { ListaEquipo, EstadoListaEquipo, Proyecto } from '@/types'
import {
  calcularStatsCotizacionLista,
  getEstadoCotizacionText,
  getEstadoCotizacionVariant,
} from '@/lib/services/listaCotizacionStats'

type SortField = 'codigo' | 'nombre' | 'proyecto' | 'estado' | 'createdAt' | 'itemsCount'
type SortDirection = 'asc' | 'desc'

interface LogisticaListasTableProps {
  listas: ListaEquipo[]
  proyectos?: Proyecto[]
  loading?: boolean
  onRefresh?: () => void
  onDelete?: (id: string) => void
  className?: string
}

const ESTADOS_CONFIG: Record<EstadoListaEquipo, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  enviada: { label: 'Enviada', variant: 'default' },
  por_revisar: { label: 'Por Revisar', variant: 'outline' },
  por_cotizar: { label: 'Por Cotizar', variant: 'default' },
  por_validar: { label: 'Por Validar', variant: 'outline' },
  por_aprobar: { label: 'Por Aprobar', variant: 'outline' },
  aprobada: { label: 'Aprobada', variant: 'default' },
  rechazada: { label: 'Rechazada', variant: 'destructive' },
  completada: { label: 'Completada', variant: 'default' },
}

const ITEMS_PER_PAGE = 15

export default function LogisticaListasTable({ listas, loading = false, onDelete, className }: LogisticaListasTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const deleteValidation = useDeleteWithValidation({
    entity: 'listaEquipo',
    deleteEndpoint: (id) => `/api/lista-equipo/${id}`,
    onSuccess: () => {
      toast.success('Lista eliminada correctamente')
      onDelete?.('')
    },
    onError: (msg) => toast.error(msg),
  })

  // Sorting logic
  const sortedListas = useMemo(() => {
    if (!listas || !Array.isArray(listas)) return []

    return [...listas].sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortField) {
        case 'codigo':
          aValue = a.codigo
          bValue = b.codigo
          break
        case 'nombre':
          aValue = a.nombre
          bValue = b.nombre
          break
        case 'proyecto':
          aValue = a.proyecto?.nombre || ''
          bValue = b.proyecto?.nombre || ''
          break
        case 'estado':
          aValue = a.estado
          bValue = b.estado
          break
        case 'createdAt':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'itemsCount':
          aValue = a.listaEquipoItem?.length || 0
          bValue = b.listaEquipoItem?.length || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [listas, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedListas.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentListas = sortedListas.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
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

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (listas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-muted-foreground">No hay listas disponibles</p>
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
              onClick={() => handleSort('nombre')}
            >
              <span className="flex items-center gap-1">Nombre <SortIcon field="nombre" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[140px]"
              onClick={() => handleSort('proyecto')}
            >
              <span className="flex items-center gap-1">Proyecto <SortIcon field="proyecto" /></span>
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
            <TableHead className="text-xs w-[80px] text-center">Cotización</TableHead>
            <TableHead className="text-xs w-[70px] text-center">Selección</TableHead>
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
          {currentListas.map((lista) => {
            const estadoConfig = ESTADOS_CONFIG[lista.estado]
            const itemsCount = lista.listaEquipoItem?.length || 0
            const cotizacionStats = calcularStatsCotizacionLista(lista)

            return (
              <TableRow
                key={lista.id}
                className="hover:bg-gray-50/50 cursor-pointer"
                onClick={() => router.push(`/logistica/listas/${lista.id}`)}
              >
                <TableCell className="font-mono text-xs py-2">
                  {lista.codigo}
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs font-medium truncate block max-w-[200px]" title={lista.nombre}>
                    {lista.nombre}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs text-muted-foreground truncate block max-w-[130px]" title={lista.proyecto?.nombre}>
                    {lista.proyecto?.codigo || '-'}
                  </span>
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
                <TableCell className="py-2 text-center">
                  <Badge variant={getEstadoCotizacionVariant(cotizacionStats)} className="text-[10px] h-5 px-1.5">
                    {getEstadoCotizacionText(cotizacionStats)}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-center">
                  {(() => {
                    const items = lista.listaEquipoItem || []
                    const total = items.length
                    if (total === 0) return <span className="text-[10px] text-muted-foreground">—</span>
                    const conSeleccion = items.filter(i => !!i.cotizacionSeleccionadaId).length
                    const completo = conSeleccion === total
                    const costoTotal = items.reduce((sum: number, i: any) => sum + (i.costoElegido ?? 0), 0)
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-[10px] font-medium cursor-help ${
                            completo ? 'text-green-600' : conSeleccion > 0 ? 'text-amber-600' : 'text-muted-foreground'
                          }`}>
                            {conSeleccion}/{total}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div>
                            {completo
                              ? 'Seleccion completa'
                              : `${total - conSeleccion} item${total - conSeleccion > 1 ? 's' : ''} sin cotizacion seleccionada`
                            }
                          </div>
                          {costoTotal > 0 && (
                            <div className="font-medium mt-0.5">
                              Costo: ${costoTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })()}
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">
                  {formatDate(lista.createdAt)}
                </TableCell>
                <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/logistica/listas/${lista.id}`)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteValidation.requestDelete(lista.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
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
            {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedListas.length)} de {sortedListas.length}
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

      {/* Delete confirmation dialog with validation */}
      <DeleteWithValidationDialog
        open={deleteValidation.dialogOpen}
        onOpenChange={(open) => !open && deleteValidation.cancelDelete()}
        checking={deleteValidation.checking}
        deleting={deleteValidation.deleting}
        allowed={deleteValidation.canDeleteResult?.allowed ?? null}
        blockers={deleteValidation.canDeleteResult?.blockers ?? []}
        message={deleteValidation.canDeleteResult?.message ?? ''}
        onConfirm={deleteValidation.confirmDelete}
        onCancel={deleteValidation.cancelDelete}
        entityLabel="lista de equipos"
      />
    </div>
  )
}
