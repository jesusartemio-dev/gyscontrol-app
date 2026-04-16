/**
 * 📦 LogisticaProveedoresTable - Tabla minimalista de proveedores
 */

'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Building2, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react'
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
import { deleteProveedor } from '@/lib/services/proveedor'
import { toast } from 'sonner'
import type { Proveedor } from '@/types'

type SortField = 'nombre' | 'ruc' | 'telefono' | 'correo'
type SortDirection = 'asc' | 'desc'

interface LogisticaProveedoresTableProps {
  proveedores: Proveedor[]
  loading?: boolean
  onEdit?: (proveedor: Proveedor) => void
  onDelete?: (id: string) => void
  className?: string
}

const ITEMS_PER_PAGE = 15

export default function LogisticaProveedoresTable({
  proveedores,
  loading = false,
  onEdit,
  onDelete,
  className
}: LogisticaProveedoresTableProps) {
  const [sortField, setSortField] = useState<SortField>('nombre')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    proveedor: Proveedor | null
    isDeleting: boolean
  }>({ open: false, proveedor: null, isDeleting: false })
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean
    error: string
    bloqueantes: string[]
  }>({ open: false, error: '', bloqueantes: [] })

  // Sorting logic
  const sortedProveedores = useMemo(() => {
    if (!proveedores || !Array.isArray(proveedores)) return []

    return [...proveedores].sort((a, b) => {
      let aValue: string = ''
      let bValue: string = ''

      switch (sortField) {
        case 'nombre':
          aValue = a.nombre || ''
          bValue = b.nombre || ''
          break
        case 'ruc':
          aValue = a.ruc || ''
          bValue = b.ruc || ''
          break
        case 'telefono':
          aValue = a.telefono || ''
          bValue = b.telefono || ''
          break
        case 'correo':
          aValue = a.correo || ''
          bValue = b.correo || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [proveedores, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedProveedores.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentProveedores = sortedProveedores.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const handleDeleteClick = (proveedor: Proveedor) => {
    const c = (proveedor as any)._count
    const totalUso = c
      ? (c.cotizacionProveedor + c.listaEquipoItem + c.ordenesCompra + c.cuentasPorPagar + c.pedidoEquipoItems)
      : 0

    if (totalUso > 0) {
      const bloqueantes: string[] = []
      if (c.cotizacionProveedor > 0) bloqueantes.push(`${c.cotizacionProveedor} cotización${c.cotizacionProveedor > 1 ? 'es' : ''}`)
      if (c.ordenesCompra > 0) bloqueantes.push(`${c.ordenesCompra} orden${c.ordenesCompra > 1 ? 'es' : ''} de compra`)
      if (c.cuentasPorPagar > 0) bloqueantes.push(`${c.cuentasPorPagar} cuenta${c.cuentasPorPagar > 1 ? 's' : ''} por pagar`)
      if (c.listaEquipoItem > 0) bloqueantes.push(`${c.listaEquipoItem} ítem${c.listaEquipoItem > 1 ? 's' : ''} en listas de equipo`)
      if (c.pedidoEquipoItems > 0) bloqueantes.push(`${c.pedidoEquipoItems} ítem${c.pedidoEquipoItems > 1 ? 's' : ''} en pedidos de equipo`)
      setErrorDialog({ open: true, error: 'No se puede eliminar este proveedor porque está siendo usado en:', bloqueantes })
      return
    }

    setDeleteDialog({ open: true, proveedor, isDeleting: false })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.proveedor) return

    setDeleteDialog(prev => ({ ...prev, isDeleting: true }))

    const result = await deleteProveedor(deleteDialog.proveedor.id)
    setDeleteDialog({ open: false, proveedor: null, isDeleting: false })

    if (result.ok) {
      toast.success('Proveedor eliminado')
      onDelete?.(deleteDialog.proveedor.id)
    } else {
      setErrorDialog({ open: true, error: result.error, bloqueantes: result.bloqueantes || [] })
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

  if (proveedores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-muted-foreground">No hay proveedores disponibles</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort('nombre')}
            >
              <span className="flex items-center gap-1">Nombre <SortIcon field="nombre" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[120px]"
              onClick={() => handleSort('ruc')}
            >
              <span className="flex items-center gap-1">RUC <SortIcon field="ruc" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[120px]"
              onClick={() => handleSort('telefono')}
            >
              <span className="flex items-center gap-1">Teléfono <SortIcon field="telefono" /></span>
            </TableHead>
            <TableHead
              className="text-xs cursor-pointer hover:bg-gray-50 w-[180px]"
              onClick={() => handleSort('correo')}
            >
              <span className="flex items-center gap-1">Correo <SortIcon field="correo" /></span>
            </TableHead>
            <TableHead className="text-xs w-[150px]">Dirección</TableHead>
            <TableHead className="text-xs w-[160px]">En uso</TableHead>
            <TableHead className="text-xs w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentProveedores.map((proveedor) => (
            <TableRow key={proveedor.id} className="hover:bg-gray-50/50">
              <TableCell className="py-2">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-medium truncate max-w-[200px]" title={proveedor.nombre}>
                    {proveedor.nombre}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2">
                {proveedor.ruc ? (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                    {proveedor.ruc}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="py-2">
                {proveedor.telefono ? (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-xs">{proveedor.telefono}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="py-2">
                {proveedor.correo ? (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <a
                      href={`mailto:${proveedor.correo}`}
                      className="text-xs text-blue-600 hover:underline truncate max-w-[150px]"
                      title={proveedor.correo}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {proveedor.correo}
                    </a>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="py-2">
                {proveedor.direccion ? (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate max-w-[130px]" title={proveedor.direccion}>
                      {proveedor.direccion}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="py-2">
                {(() => {
                  const c = (proveedor as any)._count
                  if (!c) return <span className="text-[10px] text-muted-foreground">-</span>
                  const badges = [
                    { key: 'cotizacionProveedor', label: 'Cot.', count: c.cotizacionProveedor, color: 'bg-blue-100 text-blue-700' },
                    { key: 'ordenesCompra', label: 'OC', count: c.ordenesCompra, color: 'bg-orange-100 text-orange-700' },
                    { key: 'cuentasPorPagar', label: 'CxP', count: c.cuentasPorPagar, color: 'bg-red-100 text-red-700' },
                    { key: 'listaEquipoItem', label: 'Lista', count: c.listaEquipoItem, color: 'bg-purple-100 text-purple-700' },
                    { key: 'pedidoEquipoItems', label: 'Pedido', count: c.pedidoEquipoItems, color: 'bg-green-100 text-green-700' },
                  ].filter(b => b.count > 0)
                  if (badges.length === 0) return <span className="text-[10px] text-muted-foreground">Sin uso</span>
                  return (
                    <div className="flex flex-wrap gap-1">
                      {badges.map(b => (
                        <span key={b.key} title={`${b.count} ${b.label}`}
                          className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${b.color}`}>
                          {b.label} <span className="font-bold">{b.count}</span>
                        </span>
                      ))}
                    </div>
                  )
                })()}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-0.5">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(proveedor)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(proveedor)}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination compacta */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <span className="text-[11px] text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedProveedores.length)} de {sortedProveedores.length}
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
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !deleteDialog.isDeleting && setDeleteDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Eliminar proveedor</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {deleteDialog.proveedor && (
                <span>
                  ¿Eliminar <strong>{deleteDialog.proveedor.nombre}</strong>? Esta acción no se puede deshacer.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs" disabled={deleteDialog.isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-8 text-xs bg-red-600 hover:bg-red-700"
              disabled={deleteDialog.isDeleting}
            >
              {deleteDialog.isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error dialog — proveedor en uso */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-red-600">No se puede eliminar</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm space-y-2">
                <p>{errorDialog.error}</p>
                {errorDialog.bloqueantes.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {errorDialog.bloqueantes.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Para eliminarlo, primero desvincula o elimina esos registros.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="h-8 text-xs">Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
