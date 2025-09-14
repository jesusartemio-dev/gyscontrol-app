// ===================================================
// 📁 Archivo: TareaList.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Componente para listar tareas con filtros y acciones
//    Funciones: Lista paginada, filtros, ordenamiento, acciones CRUD
//
// 🧠 Funcionalidades:
//    - Lista responsive con paginación
//    - Filtros por estado, prioridad, asignado
//    - Ordenamiento por columnas
//    - Acciones inline (editar, eliminar, cambiar estado)
//    - Estados de carga y error
//    - Drag & drop para reordenar
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  User as UserIcon,
  Calendar,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

import type { Tarea } from '@/types/modelos'
import type { PaginatedResponse } from '@/types/payloads'
import { getTareas, deleteTarea, cambiarEstadoTarea } from '@/lib/services/tareas'

// 🎨 Configuración de estilos por estado
const estadoConfig = {
  pendiente: {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Clock,
    label: 'Pendiente'
  },
  en_progreso: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: AlertCircle,
    label: 'En Progreso'
  },
  completada: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    label: 'Completada'
  },
  cancelada: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
    label: 'Cancelada'
  }
}

const prioridadConfig = {
  baja: { color: 'bg-gray-100 text-gray-800', label: 'Baja' },
  media: { color: 'bg-yellow-100 text-yellow-800', label: 'Media' },
  alta: { color: 'bg-orange-100 text-orange-800', label: 'Alta' },
  critica: { color: 'bg-red-100 text-red-800', label: 'Crítica' }
}

// 📋 Props del componente
interface TareaListProps {
  proyectoServicioId: string
  onTareaSelect?: (tarea: Tarea) => void
  onTareaCreate?: () => void
  onTareaEdit?: (tarea: Tarea) => void
  showActions?: boolean
  compact?: boolean
}

// 🔍 Filtros de búsqueda
interface FiltrosTarea {
  search: string
  estado: string
  prioridad: string
  asignadoId: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

const TareaList: React.FC<TareaListProps> = ({
  proyectoServicioId,
  onTareaSelect,
  onTareaCreate,
  onTareaEdit,
  showActions = true,
  compact = false
}) => {
  // 🔄 Estados del componente
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: compact ? 5 : 10,
    total: 0,
    totalPages: 0
  })
  
  const [filtros, setFiltros] = useState<FiltrosTarea>({
    search: '',
    estado: '',
    prioridad: '',
    asignadoId: '',
    sortBy: 'orden',
    sortOrder: 'asc'
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const { toast } = useToast()

  // 📡 Cargar tareas
  const cargarTareas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        proyectoServicioId,
        ...filtros,
        // Filtrar parámetros vacíos
        ...(filtros.search && { search: filtros.search }),
        ...(filtros.estado && { estado: filtros.estado }),
        ...(filtros.prioridad && { prioridad: filtros.prioridad }),
        ...(filtros.asignadoId && { asignadoId: filtros.asignadoId })
      }
      
      const response: PaginatedResponse<Tarea> = await getTareas(params)
      
      setTareas(response.data || [])
      setPagination(prev => ({
        ...prev,
        total: response.meta.total,
        totalPages: response.meta.totalPages
      }))
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar tareas'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [proyectoServicioId, pagination.page, pagination.limit, filtros, toast])

  // 🔄 Efectos
  useEffect(() => {
    cargarTareas()
  }, [cargarTareas])

  // 🔄 Manejar cambio de filtros
  const handleFiltroChange = (key: keyof FiltrosTarea, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset a primera página
  }

  // 🔄 Manejar cambio de página
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // 🔄 Manejar ordenamiento
  const handleSort = (column: string) => {
    const newOrder = filtros.sortBy === column && filtros.sortOrder === 'asc' ? 'desc' : 'asc'
    setFiltros(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: newOrder
    }))
  }

  // 🔄 Cambiar estado de tarea
  const handleCambiarEstado = async (tareaId: string, nuevoEstado: string) => {
    try {
      await cambiarEstadoTarea(tareaId, nuevoEstado)
      toast({
        title: 'Estado actualizado',
        description: 'El estado de la tarea se ha actualizado correctamente'
      })
      cargarTareas() // Recargar lista
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar estado'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  // 🗑️ Eliminar tarea
  const handleEliminar = async (tareaId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
      return
    }
    
    try {
      await deleteTarea(tareaId)
      toast({
        title: 'Tarea eliminada',
        description: 'La tarea se ha eliminado correctamente'
      })
      cargarTareas() // Recargar lista
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar tarea'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  // 🎨 Renderizar badge de estado
  const renderEstadoBadge = (estado: string) => {
    const config = estadoConfig[estado as keyof typeof estadoConfig]
    if (!config) return null
    
    const IconComponent = config.icon
    
    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // 🎨 Renderizar badge de prioridad
  const renderPrioridadBadge = (prioridad: string) => {
    const config = prioridadConfig[prioridad as keyof typeof prioridadConfig]
    if (!config) return null
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    )
  }

  // 🎨 Renderizar skeleton de carga
  const renderSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: pagination.limit }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-4" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  )

  // 🎨 Renderizar estado vacío
  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No hay tareas
      </h3>
      <p className="text-gray-500 mb-4">
        {filtros.search || filtros.estado || filtros.prioridad
          ? 'No se encontraron tareas con los filtros aplicados'
          : 'Aún no se han creado tareas para este proyecto'}
      </p>
      {onTareaCreate && (
        <Button onClick={onTareaCreate} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Crear primera tarea
        </Button>
      )}
    </div>
  )

  // 🎨 Renderizar error
  if (error && !loading) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error al cargar tareas
        </h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={cargarTareas} variant="outline">
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 🔍 Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar tareas..."
              value={filtros.search}
              onChange={(e) => handleFiltroChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          
          {onTareaCreate && (
            <Button onClick={onTareaCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Tarea
            </Button>
          )}
        </div>
      </div>

      {/* 🔍 Panel de filtros expandible */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg"
          >
            <Select
              value={filtros.estado}
              onValueChange={(value) => handleFiltroChange('estado', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filtros.prioridad}
              onValueChange={(value) => handleFiltroChange('prioridad', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filtros.sortBy}
              onValueChange={(value) => handleFiltroChange('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orden">Orden</SelectItem>
                <SelectItem value="nombre">Nombre</SelectItem>
                <SelectItem value="estado">Estado</SelectItem>
                <SelectItem value="prioridad">Prioridad</SelectItem>
                <SelectItem value="fechaInicio">Fecha Inicio</SelectItem>
                <SelectItem value="fechaFin">Fecha Fin</SelectItem>
                <SelectItem value="progreso">Progreso</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📋 Tabla de tareas */}
      {loading ? (
        renderSkeleton()
      ) : tareas.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('nombre')}
                    className="flex items-center gap-1 p-0 h-auto font-medium"
                  >
                    Nombre
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prioridad</TableHead>
                {!compact && (
                  <>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Asignado</TableHead>
                    <TableHead>Fechas</TableHead>
                  </>
                )}
                {showActions && <TableHead className="w-12">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {tareas.map((tarea, index) => (
                  <motion.tr
                    key={tarea.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onTareaSelect?.(tarea)}
                  >
                    <TableCell className="font-mono text-sm text-gray-500">
                      {/* Order not available in Tarea interface */}
                      -
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tarea.nombre}</div>
                        {tarea.descripcion && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {tarea.descripcion}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderEstadoBadge(tarea.estado)}
                    </TableCell>
                    <TableCell>
                      {renderPrioridadBadge(tarea.prioridad)}
                    </TableCell>
                    {!compact && (
                      <>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={tarea.porcentajeCompletado} className="h-2" />
                            <div className="text-xs text-gray-500">
                              {tarea.porcentajeCompletado}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tarea.responsable ? (
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                {tarea.responsable.name || tarea.responsable.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Sin asignar
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            {tarea.fechaInicio && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                {new Date(tarea.fechaInicio).toLocaleDateString()}
                              </div>
                            )}
                            {tarea.fechaFin && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                {new Date(tarea.fechaFin).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}
                    {showActions && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onTareaEdit && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onTareaEdit(tarea)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            {tarea.estado !== 'completada' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCambiarEstado(tarea.id, 'completada')
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar completada
                              </DropdownMenuItem>
                            )}
                            
                            {tarea.estado !== 'en_progreso' && tarea.estado !== 'completada' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCambiarEstado(tarea.id, 'en_progreso')
                                }}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Iniciar
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEliminar(tarea.id)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}

      {/* 📄 Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} tareas
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TareaList