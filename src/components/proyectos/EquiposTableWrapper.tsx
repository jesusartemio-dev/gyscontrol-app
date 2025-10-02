/**
 * 🎯 Wrapper de Tabla de Equipos
 * 
 * Componente que envuelve la tabla de equipos con funcionalidades:
 * - Visualización de equipos con información del proyecto
 * - Acciones de gestión (editar, eliminar, cambiar estado)
 * - Paginación integrada
 * - Estados de carga y error
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Package, 
  Edit, 
  Trash2, 
  Settings, 
  Eye,
  MapPin,
  Calendar,
  Tag
} from 'lucide-react'

// 🎨 UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

// 🔧 Types
import type { ProyectoEquipoCotizadoItem, Proyecto } from '@/types'

interface EquiposTableWrapperProps {
  data: (ProyectoEquipoCotizadoItem & { proyecto?: Proyecto })[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 🎨 Función para obtener el color del badge según el estado
function getEstadoBadgeVariant(estado: string) {
  switch (estado) {
    case 'disponible':
      return 'default'
    case 'en_uso':
      return 'secondary'
    case 'mantenimiento':
      return 'destructive'
    case 'fuera_servicio':
      return 'outline'
    default:
      return 'outline'
  }
}

// 🎨 Función para obtener el texto del estado
function getEstadoText(estado: string) {
  switch (estado) {
    case 'disponible':
      return 'Disponible'
    case 'en_uso':
      return 'En Uso'
    case 'mantenimiento':
      return 'Mantenimiento'
    case 'fuera_servicio':
      return 'Fuera de Servicio'
    default:
      return estado
  }
}

export function EquiposTableWrapper({ data, pagination }: EquiposTableWrapperProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  // 🔧 Manejar acciones
  const handleEdit = (equipoId: string) => {
    router.push(`/proyectos/equipos/${equipoId}/editar`)
  }

  const handleView = (equipoId: string) => {
    router.push(`/proyectos/equipos/${equipoId}`)
  }

  const handleChangeStatus = async (equipoId: string, nuevoEstado: string) => {
    try {
      setLoading(equipoId)
      
      const response = await fetch(`/api/proyecto-equipo-item/${equipoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar estado del equipo')
      }

      toast.success('Estado del equipo actualizado correctamente')
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar el estado del equipo')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (equipoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este equipo?')) {
      return
    }

    try {
      setLoading(equipoId)
      
      const response = await fetch(`/api/proyecto-equipo-item/${equipoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar equipo')
      }

      toast.success('Equipo eliminado correctamente')
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar el equipo')
    } finally {
      setLoading(null)
    }
  }

  // 🔧 Generar enlaces de paginación
  const generatePaginationLinks = () => {
    const links = []
    const currentPage = pagination.page
    const totalPages = pagination.totalPages
    
    // Página anterior
    if (currentPage > 1) {
      links.push(
        <PaginationItem key="prev">
          <PaginationPrevious href={`?page=${currentPage - 1}`} size="default" />
        </PaginationItem>
      )
    }
    
    // Páginas numeradas
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      links.push(
        <PaginationItem key={i}>
          <PaginationLink href={`?page=${i}`} isActive={i === currentPage} size="default">
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }
    
    // Página siguiente
    if (currentPage < totalPages) {
      links.push(
        <PaginationItem key="next">
          <PaginationNext href={`?page=${currentPage + 1}`} size="default" />
        </PaginationItem>
      )
    }
    
    return links
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Equipos
          </CardTitle>
          <CardDescription>
            Lista de equipos de proyectos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay equipos</h3>
            <p className="text-muted-foreground mb-4">
              No se encontraron equipos con los filtros aplicados.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Equipos ({pagination.total})
        </CardTitle>
        <CardDescription>
          Lista de equipos de proyectos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((equipo) => (
                <TableRow key={equipo.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{equipo.descripcion}</div>
                      {equipo.codigo && (
                        <div className="text-sm text-muted-foreground">
                          {equipo.codigo}
                        </div>
                      )}
                      {equipo.marca && (
                        <div className="text-sm text-muted-foreground">
                          Marca: {equipo.marca}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {equipo.proyecto && (
                      <div className="space-y-1">
                        <div className="font-medium">{equipo.proyecto.nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          {equipo.proyecto.codigo}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {equipo.categoria && (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Tag className="h-3 w-3" />
                        {equipo.categoria}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getEstadoBadgeVariant(equipo.estado || 'disponible')}>
                      {getEstadoText(equipo.estado || 'disponible')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Package className="h-3 w-3" />
                      {equipo.unidad}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(equipo.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0"
                          disabled={loading === equipo.id}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleView(equipo.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(equipo.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleChangeStatus(equipo.id, 'en_lista')}
                          disabled={equipo.estado === 'en_lista'}
                        >
                          Marcar como En Lista
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleChangeStatus(equipo.id, 'reemplazado')}
                          disabled={equipo.estado === 'reemplazado'}
                        >
                          Marcar como Reemplazado
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleChangeStatus(equipo.id, 'descartado')}
                          disabled={equipo.estado === 'descartado'}
                        >
                          Marcar como Descartado
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(equipo.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* 📄 Paginación */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
              {pagination.total} equipos
            </div>
            <Pagination>
              <PaginationContent>
                {generatePaginationLinks()}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
