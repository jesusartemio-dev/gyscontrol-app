'use client'

import { useState } from 'react'
import { Building2, Phone, Mail, Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Cliente {
  id: string
  nombre: string
  ruc?: string
  correo?: string
  telefono?: string
  direccion?: string
  sector?: string
  estadoRelacion?: string
  calificacion?: number
  createdAt?: string
}

interface ClienteListViewProps {
  clientes: Cliente[]
  onEdit: (cliente: Cliente) => void
  onViewDetail: (cliente: Cliente) => void
  onDelete?: (cliente: Cliente) => void
  loading?: boolean
}

const getEstadoBadgeVariant = (estado?: string) => {
  switch (estado) {
    case 'cliente_activo': return 'default'
    case 'prospecto': return 'secondary'
    case 'cliente_inactivo': return 'outline'
    default: return 'outline'
  }
}

const getEstadoLabel = (estado?: string) => {
  switch (estado) {
    case 'cliente_activo': return 'Activo'
    case 'prospecto': return 'Prospecto'
    case 'cliente_inactivo': return 'Inactivo'
    default: return '—'
  }
}

const renderStars = (rating?: number) => {
  if (!rating) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-xs ${i < rating ? 'text-yellow-500' : 'text-gray-300'}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const ClienteListSkeleton = () => (
  <div className="divide-y">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-7" />
      </div>
    ))}
  </div>
)

export default function ClienteListView({
  clientes,
  onEdit,
  onViewDetail,
  onDelete,
  loading = false
}: ClienteListViewProps) {
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null)

  if (loading) {
    return <ClienteListSkeleton />
  }

  if (!clientes || clientes.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay clientes</h3>
        <p className="text-sm text-muted-foreground">
          No se encontraron clientes que coincidan con los filtros
        </p>
      </div>
    )
  }

  const handleDelete = () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget)
      setDeleteTarget(null)
    }
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 py-2 px-3"></th>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cliente
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contacto
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sector
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Estado
              </th>
              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Rating
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Creado
              </th>
              <th className="w-28 py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onViewDetail(cliente)}
              >
                <td className="py-2 px-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {cliente.nombre.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </td>

                <td className="py-2 px-3">
                  <div>
                    <div className="font-medium text-sm">{cliente.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {cliente.ruc || 'Sin RUC'}
                    </div>
                  </div>
                </td>

                <td className="py-2 px-3">
                  <div className="space-y-0.5">
                    {cliente.correo && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{cliente.correo}</span>
                      </div>
                    )}
                    {cliente.telefono && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{cliente.telefono}</span>
                      </div>
                    )}
                    {!cliente.correo && !cliente.telefono && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                <td className="py-2 px-3">
                  <span className="text-sm text-muted-foreground">
                    {cliente.sector || '—'}
                  </span>
                </td>

                <td className="py-2 px-3">
                  <Badge
                    variant={getEstadoBadgeVariant(cliente.estadoRelacion) as any}
                    className="text-xs"
                  >
                    {getEstadoLabel(cliente.estadoRelacion)}
                  </Badge>
                </td>

                <td className="py-2 px-3 text-center">
                  {renderStars(cliente.calificacion)}
                </td>

                <td className="py-2 px-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(cliente.createdAt)}
                  </span>
                </td>

                <td className="py-2 px-3">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => onViewDetail(cliente)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver detalles</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => onEdit(cliente)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                    {onDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(cliente)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el cliente "{deleteTarget?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
