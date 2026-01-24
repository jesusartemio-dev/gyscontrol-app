// ===================================================
// 📁 Archivo: LogisticaListasTable.tsx
// 📌 Descripción: Tabla profesional para mostrar listas de logística
// 🧠 Uso: Vista tabular con sorting, paginación y acciones
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Edit,
  MoreHorizontal,
  Calendar,
  Package,
  Building2,
  Hash,
  FileText,
  Trash2,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import type { ListaEquipo, EstadoListaEquipo, Proyecto } from '@/types'
import {
  calcularStatsCotizacionLista,
  getEstadoCotizacionText,
  getEstadoCotizacionVariant,
  type ListaCotizacionStats
} from '@/lib/services/listaCotizacionStats'

type SortField = 'codigo' | 'nombre' | 'proyecto' | 'estado' | 'createdAt' | 'itemsCount' | 'cotizacionesCount' | 'estadoCotizacion' | 'fechaNecesaria'
type SortDirection = 'asc' | 'desc'

interface LogisticaListasTableProps {
  listas: ListaEquipo[]
  proyectos?: Proyecto[]
  loading?: boolean
  onRefresh?: () => void
  className?: string
}

const ESTADOS_CONFIG: Record<EstadoListaEquipo, { label: string; color: string; bgColor: string }> = {
  borrador: { label: 'Borrador', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  enviada: { label: 'Enviada', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  por_revisar: { label: 'Por Revisar', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  por_cotizar: { label: 'Por Cotizar', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  por_validar: { label: 'Por Validar', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  por_aprobar: { label: 'Por Aprobar', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  aprobada: { label: 'Aprobada', color: 'text-green-700', bgColor: 'bg-green-100' },
  rechazada: { label: 'Rechazada', color: 'text-red-700', bgColor: 'bg-red-100' },
  completada: { label: 'Completada', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
}

const ITEMS_PER_PAGE = 10

export default function LogisticaListasTable({ listas, proyectos, loading = false, onRefresh, className }: LogisticaListasTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Sorting logic
  const sortedListas = useMemo(() => {
    if (!listas || !Array.isArray(listas)) {
      return []
    }
    
    const sorted = [...listas].sort((a, b) => {
      let aValue: any
      let bValue: any

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
        case 'cotizacionesCount':
          const aStats = calcularStatsCotizacionLista(a)
          const bStats = calcularStatsCotizacionLista(b)
          aValue = aStats.cotizacionesCount
          bValue = bStats.cotizacionesCount
          break
        case 'estadoCotizacion':
          const aStatsCot = calcularStatsCotizacionLista(a)
          const bStatsCot = calcularStatsCotizacionLista(b)
          aValue = aStatsCot.todosCotizados ? 2 : aStatsCot.itemsCotizados > 0 ? 1 : 0
          bValue = bStatsCot.todosCotizados ? 2 : bStatsCot.itemsCotizados > 0 ? 1 : 0
          break
        case 'fechaNecesaria':
          aValue = a.fechaNecesaria ? new Date(a.fechaNecesaria).getTime() : 0
          bValue = b.fechaNecesaria ? new Date(b.fechaNecesaria).getTime() : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [listas, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedListas.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentListas = sortedListas.slice(startIndex, endIndex)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  const handleViewDetails = (listaId: string) => {
    router.push(`/logistica/listas/${listaId}`)
  }

  const handleDelete = (listaId: string) => {
    // TODO: Implement delete functionality
    console.log('Delete lista:', listaId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  )

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (listas.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay listas disponibles</h3>
          <p className="text-gray-500 text-center max-w-md">
            No se encontraron listas que coincidan con los filtros aplicados.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Listas Técnicas ({listas.length})
          </CardTitle>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Actualizar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="codigo">
                  <Hash className="h-4 w-4" />
                  Código
                </SortableHeader>
                <SortableHeader field="nombre">
                  <FileText className="h-4 w-4" />
                  Nombre
                </SortableHeader>
                <SortableHeader field="proyecto">
                  <Building2 className="h-4 w-4" />
                  Proyecto
                </SortableHeader>
                <SortableHeader field="estado">
                  <Package className="h-4 w-4" />
                  Estado
                </SortableHeader>
                <SortableHeader field="itemsCount">
                  Ítems
                </SortableHeader>
                <SortableHeader field="cotizacionesCount">
                  <FileText className="h-4 w-4" />
                  Cotizaciones
                </SortableHeader>
                <SortableHeader field="estadoCotizacion">
                  Estado Ítems
                </SortableHeader>
                <SortableHeader field="fechaNecesaria">
                  <Clock className="h-4 w-4" />
                  Fecha Necesaria
                </SortableHeader>
                <SortableHeader field="createdAt">
                  <Calendar className="h-4 w-4" />
                  Fecha Creación
                </SortableHeader>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentListas.map((lista) => {
                const estadoConfig = ESTADOS_CONFIG[lista.estado]
                const itemsCount = lista.listaEquipoItem?.length || 0
                const cotizacionStats = calcularStatsCotizacionLista(lista)

                return (
                  <TableRow key={lista.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {lista.codigo}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="max-w-[200px] truncate" title={lista.nombre}>
                        {lista.nombre}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate" title={lista.proyecto?.nombre}>
                        {lista.proyecto?.nombre || 'Sin proyecto'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${estadoConfig.color} ${estadoConfig.bgColor} border-0`}
                      >
                        {estadoConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className={itemsCount > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          {itemsCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className={cotizacionStats.cotizacionesCount > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                          {cotizacionStats.cotizacionesCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getEstadoCotizacionVariant(cotizacionStats)}
                        className="text-xs"
                      >
                        {getEstadoCotizacionText(cotizacionStats)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {lista.fechaNecesaria ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(lista.fechaNecesaria)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(lista.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(lista.id)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lista.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1} a {Math.min(endIndex, sortedListas.length)} de {sortedListas.length} listas
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    return page === 1 || 
                           page === totalPages || 
                           Math.abs(page - currentPage) <= 1
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const prevPage = array[index - 1]
                    const showEllipsis = prevPage && page - prevPage > 1
                    
                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    )
                  })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
