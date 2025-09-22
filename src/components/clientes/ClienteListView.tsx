'use client'

import { motion } from 'framer-motion'
import { Building2, Phone, Mail, MapPin, Eye, Edit3, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

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
    case 'cliente_activo': return 'Cliente Activo'
    case 'prospecto': return 'Prospecto'
    case 'cliente_inactivo': return 'Inactivo'
    default: return 'Sin Estado'
  }
}

const renderStars = (rating?: number) => {
  if (!rating) return null
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
    >
      ★
    </span>
  ))
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const ClienteListSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
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
  if (loading) {
    return <ClienteListSkeleton />
  }

  if (!clientes || clientes.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay clientes para mostrar</h3>
        <p className="text-muted-foreground">
          No se encontraron clientes que coincidan con los filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Vista de tabla tradicional */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12"></TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Calificación</TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((cliente, index) => (
              <motion.tr
                key={cliente.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="hover:bg-muted/30 cursor-pointer group"
                onClick={() => onViewDetail(cliente)}
              >
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                      {cliente.nombre.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>

                <TableCell>
                  <div>
                    <div className="font-medium group-hover:text-blue-600 transition-colors">
                      {cliente.nombre}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {cliente.ruc || 'Sin RUC'}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    {cliente.correo && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-32">{cliente.correo}</span>
                      </div>
                    )}
                    {cliente.telefono && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{cliente.telefono}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm">{cliente.sector || 'No definido'}</span>
                </TableCell>

                <TableCell>
                  <Badge variant={getEstadoBadgeVariant(cliente.estadoRelacion) as any} className="text-xs">
                    {getEstadoLabel(cliente.estadoRelacion)}
                  </Badge>
                </TableCell>

                <TableCell>
                  {cliente.calificacion ? (
                    <div className="flex items-center gap-1">
                      {renderStars(cliente.calificacion)}
                      <span className="text-xs ml-1">({cliente.calificacion})</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin calificar</span>
                  )}
                </TableCell>

                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(cliente.createdAt)}
                  </span>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetail(cliente)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(cliente)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(cliente)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Información de resumen */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Mostrando {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
        </span>
        <span>
          Haga click en cualquier fila para ver los detalles
        </span>
      </div>
    </div>
  )
}