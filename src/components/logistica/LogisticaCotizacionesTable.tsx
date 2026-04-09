/**
 * 📦 LogisticaCotizacionesTable - Tabla minimalista de cotizaciones
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Eye, Package, Trash2, Building2, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useDeleteWithValidation } from '@/hooks/useDeleteWithValidation'
import { DeleteWithValidationDialog } from '@/components/DeleteWithValidationDialog'
import type { CotizacionProveedor } from '@/types'

type SortField = 'codigo' | 'proveedor' | 'proyecto' | 'estado' | 'createdAt' | 'itemsCount' | 'totalCost'
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

const FLUJO_COTIZACION: Record<string, { siguiente?: string; label?: string }> = {
  pendiente: { siguiente: 'solicitado', label: 'Solicitado' },
  solicitado: { siguiente: 'cotizado', label: 'Cotizado' },
}

const ITEMS_PER_PAGE = 15

export default function LogisticaCotizacionesTable({ cotizaciones, loading = false, onRefresh, onDelete, className }: LogisticaCotizacionesTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const deleteValidation = useDeleteWithValidation({
    entity: 'cotizacionProveedor',
    onConfirmDelete: onDelete ? async (id) => { onDelete(id) } : undefined,
  })
  const [advancingId, setAdvancingId] = useState<string | null>(null)
  const [confirmAdvance, setConfirmAdvance] = useState<{
    cotId: string; estado: string; codigo: string; proveedor: string; siguiente: string; label: string
  } | null>(null)

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
        case 'totalCost': {
          const calcTotalUsd = (cot: CotizacionProveedor) => {
            const items = cot.items || (cot as any).cotizacionProveedorItem || []
            const nativo = items.reduce((s: number, i: any) => {
              const precio = i.precioUnitario || 0
              const cantidad = i.cantidad ?? i.cantidadOriginal ?? 0
              return s + (i.costoTotal || precio * cantidad)
            }, 0)
            return cot.moneda === 'PEN' && cot.tipoCambio && cot.tipoCambio > 0
              ? nativo / cot.tipoCambio
              : nativo
          }
          aValue = calcTotalUsd(a)
          bValue = calcTotalUsd(b)
          break
        }
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


  const handleRequestAdvance = (e: React.MouseEvent, cot: CotizacionProveedor) => {
    e.stopPropagation()
    const flujo = FLUJO_COTIZACION[cot.estado as string]
    if (!flujo?.siguiente) return
    setConfirmAdvance({
      cotId: cot.id,
      estado: cot.estado,
      codigo: cot.codigo || cot.id,
      proveedor: cot.proveedor?.nombre || 'Sin proveedor',
      siguiente: flujo.siguiente,
      label: flujo.label || flujo.siguiente,
    })
  }

  const handleConfirmAdvance = async () => {
    if (!confirmAdvance) return
    const { cotId, siguiente, label } = confirmAdvance

    setAdvancingId(cotId)
    setConfirmAdvance(null)
    try {
      const res = await fetch(`/api/logistica/cotizaciones-proveedor/${cotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: siguiente }),
      })
      if (res.ok) {
        toast.success(`Cotización avanzada a "${label}"`)
        onRefresh?.()
      } else {
        toast.error('Error al cambiar estado')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setAdvancingId(null)
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
            <TableHead className="text-xs w-[70px] text-center">
              <span className="flex items-center justify-center gap-1">Precios</span>
            </TableHead>
            <TableHead className="text-xs w-[70px] text-center">
              <span className="flex items-center justify-center gap-1">Selección</span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[110px] text-right"
              onClick={() => handleSort('totalCost')}
            >
              <span className="flex items-center justify-end gap-1">Total <SortIcon field="totalCost" /></span>
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
            const cotItems = cot.items || (cot as any).cotizacionProveedorItem || []
            const itemsCount = cotItems.length
            const conPrecio = cotItems.filter((i: any) => i.precioUnitario && i.precioUnitario > 0).length
            const totalCostNativo = cotItems.reduce((s: number, i: any) => {
              const precio = i.precioUnitario || 0
              const cantidad = i.cantidad ?? i.cantidadOriginal ?? 0
              return s + (i.costoTotal || precio * cantidad)
            }, 0)
            // Convertir a USD si la cotización está en soles
            const totalCost = cot.moneda === 'PEN' && cot.tipoCambio && cot.tipoCambio > 0
              ? totalCostNativo / cot.tipoCambio
              : totalCostNativo
            const preciosCompletos = itemsCount > 0 && conPrecio === itemsCount
            const flujo = FLUJO_COTIZACION[cot.estado as string]
            // pendiente → solicitado: cuando tiene items (se envió al proveedor)
            // solicitado → cotizado: cuando todos los precios están completos
            const listoParaAvanzar = !!flujo?.siguiente && (
              cot.estado === 'pendiente' ? itemsCount > 0 : preciosCompletos
            )

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
                <TableCell className="py-2 text-center">
                  {itemsCount === 0 ? (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`text-[10px] font-medium cursor-help ${
                          preciosCompletos ? 'text-green-600' : conPrecio > 0 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {conPrecio}/{itemsCount}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {preciosCompletos
                          ? 'Todos los precios completos'
                          : `${itemsCount - conPrecio} item${itemsCount - conPrecio > 1 ? 's' : ''} sin precio asignado`
                        }
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell className="py-2 text-center">
                  {(() => {
                    const seleccionados = cotItems.filter((i: any) => i.esSeleccionada).length
                    if (itemsCount === 0) return <span className="text-[10px] text-muted-foreground">—</span>
                    if (seleccionados === 0) return <span className="text-[10px] text-muted-foreground">0/{itemsCount}</span>
                    const completo = seleccionados === itemsCount
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 px-1.5 cursor-help ${
                              completo
                                ? 'border-green-300 bg-green-50 text-green-700'
                                : 'border-amber-300 bg-amber-50 text-amber-700'
                            }`}
                          >
                            {seleccionados}/{itemsCount}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {completo
                            ? 'Selección completa — todos los items asignados'
                            : `${seleccionados} de ${itemsCount} items seleccionados`
                          }
                        </TooltipContent>
                      </Tooltip>
                    )
                  })()}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <span className={`text-xs font-mono ${totalCost > 0 ? 'font-medium text-gray-900' : 'text-muted-foreground'}`}>
                    {totalCost > 0
                      ? `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'
                    }
                  </span>
                  {cot.moneda === 'PEN' && cot.tipoCambio && totalCost > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-[9px] text-amber-600 font-medium cursor-help mt-0.5">
                          S/ · TC {cot.tipoCambio.toFixed(3)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs max-w-[180px]">
                        Cotización en soles (S/{totalCostNativo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                        Total convertido a USD con TC {cot.tipoCambio}.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1">
                    <Badge variant={estadoConfig.variant} className="text-[10px] h-5 px-1.5">
                      {estadoConfig.label}
                    </Badge>
                    {listoParaAvanzar && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {cot.estado === 'pendiente'
                            ? `${itemsCount} items listos — marcar como solicitado`
                            : 'Precios completos — marcar como cotizado'
                          }
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">
                  {formatDate(cot.createdAt)}
                </TableCell>
                <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    {listoParaAvanzar && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleRequestAdvance(e, cot)}
                            disabled={advancingId === cot.id}
                            className="h-7 w-7 p-0"
                          >
                            {advancingId === cot.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-green-600" />
                            ) : (
                              <ArrowRight className="h-3.5 w-3.5 text-green-600" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          Avanzar a &quot;{FLUJO_COTIZACION[cot.estado as string]?.label}&quot;
                        </TooltipContent>
                      </Tooltip>
                    )}
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
                        onClick={() => deleteValidation.requestDelete(cot.id)}
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

      {/* Advance confirmation dialog */}
      <AlertDialog open={!!confirmAdvance} onOpenChange={(open) => !open && setConfirmAdvance(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Confirmar cambio de estado</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm space-y-2">
                <p>
                  Se avanzará la cotización <span className="font-medium">{confirmAdvance?.codigo}</span> de{' '}
                  <span className="font-medium">{confirmAdvance?.proveedor}</span> al estado{' '}
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 align-middle">
                    {confirmAdvance?.label}
                  </Badge>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdvance} className="h-8 text-xs bg-blue-600 hover:bg-blue-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        entityLabel="cotizacion"
      />
    </div>
  )
}
