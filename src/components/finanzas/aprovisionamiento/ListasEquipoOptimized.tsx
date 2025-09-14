// ===================================================
// 📁 Archivo: ListasEquipoOptimized.tsx
// 📌 Ubicación: src/components/finanzas/aprovisionamiento/
// 🔧 Descripción: Componente optimizado de listas de equipos
//    implementando Fase 1 del plan de optimización
// 🧠 Uso: Demuestra integración de cache, debounce y paginación
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Search, Filter, RefreshCw, Plus } from 'lucide-react'
import { useDebounceSearch } from '@/lib/hooks/useDebounceFilter'
import ListasEquipoService, { 
  type ListaEquipoOptimized, 
  type ListasEquipoFilters 
} from '@/lib/services/listasEquipoOptimized'
import { ProyectosCache } from '@/lib/services/cacheService'
import { toast } from 'sonner'

// ✅ Props del componente
export interface ListasEquipoOptimizedProps {
  proyectoId?: string
  onListaSelect?: (lista: ListaEquipoOptimized) => void
  showActions?: boolean
  compact?: boolean
}

// ✅ Estados de la lista
const ESTADOS_LISTA = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'por_revisar', label: 'Por Revisar' },
  { value: 'por_cotizar', label: 'Por Cotizar' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' }
] as const

/**
 * 🔧 Componente optimizado de listas de equipos
 */
export function ListasEquipoOptimized({
  proyectoId,
  onListaSelect,
  showActions = true,
  compact = false
}: ListasEquipoOptimizedProps) {
  // 📡 Estados locales para filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(compact ? 10 : 15)

  // 🔄 Debounce para búsqueda (300ms)
  const { debouncedSearch } = useDebounceSearch(searchTerm, 300)

  // 📡 Query client para invalidaciones
  const queryClient = useQueryClient()

  // 🔧 Construir filtros optimizados
  const filters = useMemo((): ListasEquipoFilters => ({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch,
    estado: selectedEstado !== 'todos' ? selectedEstado : undefined,
    proyectoId,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }), [currentPage, pageSize, debouncedSearch, selectedEstado, proyectoId])

  // 📡 Query optimizada con React Query + Cache
  const {
    data: listasData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['listas-equipo', filters],
    queryFn: () => ListasEquipoService.getListas(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    retry: 2
  })

  // 📡 Query para proyectos (para select)
  const { data: proyectos } = useQuery({
    queryKey: ['proyectos-activos'],
    queryFn: () => ProyectosCache.getProyectosActivos(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000 // 15 minutos
  })

  // 🔄 Handlers optimizados
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset página al buscar
  }, [])

  const handleEstadoChange = useCallback((value: string) => {
    setSelectedEstado(value)
    setCurrentPage(1) // Reset página al filtrar
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleRefresh = useCallback(async () => {
    try {
      // 🔄 Invalidar cache y refetch
      ListasEquipoService.invalidateCache()
      queryClient.invalidateQueries({ queryKey: ['listas-equipo'] })
      await refetch()
      toast.success('Listas actualizadas')
    } catch (error) {
      toast.error('Error al actualizar listas')
    }
  }, [queryClient, refetch])

  // 🔧 Función para obtener badge de estado
  const getEstadoBadge = useCallback((estado: string) => {
    const variants = {
      borrador: 'secondary',
      por_revisar: 'default',
      por_cotizar: 'outline',
      aprobado: 'default',
      rechazado: 'destructive'
    } as const

    return (
      <Badge variant={variants[estado as keyof typeof variants] || 'secondary'}>
        {ESTADOS_LISTA.find(e => e.value === estado)?.label || estado}
      </Badge>
    )
  }, [])

  // 🔧 Componente de loading skeleton
  const LoadingSkeleton = useMemo(() => (
    <div className="space-y-3">
      {Array.from({ length: pageSize }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  ), [pageSize])

  // 🚨 Error state
  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-destructive">Error al cargar listas: {error?.message}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-4' : undefined}>
        <div className="flex items-center justify-between">
          <CardTitle className={compact ? 'text-lg' : undefined}>
            Listas de Equipos
          </CardTitle>
          
          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Lista
              </Button>
            </div>
          )}
        </div>

        {/* 🔍 Filtros optimizados */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedEstado} onValueChange={handleEstadoChange}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_LISTA.map((estado) => (
                <SelectItem key={estado.value} value={estado.value}>
                  {estado.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* 📊 Tabla optimizada */}
        {isLoading ? (
          LoadingSkeleton
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Fecha</TableHead>
                  {showActions && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {listasData?.data.map((lista) => (
                  <TableRow 
                    key={lista.id}
                    className={onListaSelect ? 'cursor-pointer hover:bg-muted/50' : undefined}
                    onClick={() => onListaSelect?.(lista)}
                  >
                    <TableCell className="font-mono text-sm">
                      {lista.codigo}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lista.nombre}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{lista.proyecto.nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          {lista.proyecto.codigo}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getEstadoBadge(lista.estado)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {lista.itemsCount} items
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lista.createdAt).toLocaleDateString('es-PE')}
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Ver Detalles
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 📄 Paginación optimizada */}
            {listasData && listasData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((listasData.meta.page - 1) * listasData.meta.limit) + 1} a{' '}
                  {Math.min(listasData.meta.page * listasData.meta.limit, listasData.meta.total)} de{' '}
                  {listasData.meta.total} listas
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!listasData.meta.hasPrevPage || isFetching}
                  >
                    Anterior
                  </Button>
                  
                  <span className="text-sm px-3 py-1 bg-muted rounded">
                    {listasData.meta.page} de {listasData.meta.totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!listasData.meta.hasNextPage || isFetching}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {/* 📊 Estado vacío */}
            {listasData?.data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {debouncedSearch ? (
                  <p>No se encontraron listas que coincidan con "{debouncedSearch}"</p>
                ) : (
                  <p>No hay listas de equipos disponibles</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ListasEquipoOptimized