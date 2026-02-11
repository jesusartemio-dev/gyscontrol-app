'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  DollarSign,
  User,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  Package,
  Grid3X3,
  List,
  Search,
  Filter,
  Trash2,
  Pencil
} from 'lucide-react'
import { deleteCotizacion, updateCotizacion } from '@/lib/services/cotizacion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import CotizacionEditModal from './CotizacionEditModal'
import type { Cotizacion } from '@/types'

interface Props {
  cotizaciones: Cotizacion[]
  onDelete: (id: string) => void
  onUpdated: (actualizado: Cotizacion) => void
  loading?: boolean
}

// ✅ Utility function for status badge variants
const getStatusVariant = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'aprobado':
    case 'activo': 
      return 'default'
    case 'completado':
    case 'finalizado': 
      return 'secondary'
    case 'pausado':
    case 'pendiente': 
      return 'outline'
    case 'cancelado':
    case 'rechazado': 
      return 'destructive'
    default: 
      return 'outline'
  }
}

// ✅ Currency formatter - converts USD to display currency using tipoCambio
import { formatDisplayCurrency } from '@/lib/utils/currency'

// ✅ Date formatter
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// 🔁 Skeleton loader component
const CotizacionSkeleton = () => (
  <Card className="mb-4">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </CardContent>
  </Card>
)

// 🎨 Empty state component
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-12"
  >
    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
      <FileText className="h-12 w-12 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">
      No hay cotizaciones disponibles
    </h3>
    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
      Comienza creando tu primera cotización para gestionar tus proyectos comerciales.
    </p>
    <Button asChild>
      <Link href="/comercial/cotizaciones/nueva">
        <Package className="h-4 w-4 mr-2" />
        Crear Primera Cotización
      </Link>
    </Button>
  </motion.div>
)

type ViewMode = 'table' | 'cards'

export default function CotizacionList({ cotizaciones, onDelete, onUpdated, loading = false }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString())
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null)
  const { toast } = useToast()

  // 📡 Handle edit with improved UX feedback
  const handleEdit = async (id: string, field: string, value: string) => {
    if (!value.trim()) return
    setError(null)
    setLoadingId(id)
    
    try {
      const actualizado = await updateCotizacion(id, { [field]: value })
      onUpdated(actualizado)
      toast({
        title: "Cotización actualizada",
        description: "Los cambios se han guardado correctamente.",
      })
    } catch (err) {
      console.error(err)
      const errorMessage = 'Error al actualizar la cotización.'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingId(null)
    }
  }

  // 📡 Handle delete with improved UX feedback
  const handleDelete = async (id: string) => {
    setError(null)
    setLoadingId(id)

    try {
      await deleteCotizacion(id)
      onDelete(id)
      toast({
        title: "Cotización eliminada",
        description: "La cotización se ha eliminado correctamente.",
      })
    } catch {
      const errorMessage = 'Error al eliminar la cotización.'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingId(null)
    }
  }

  // Get unique statuses for filter
  const statuses = useMemo(() => {
    const uniqueStatuses = [...new Set(cotizaciones.map(c => c.estado).filter(Boolean))]
    return uniqueStatuses.sort()
  }, [cotizaciones])

  // Get available years from cotizaciones
  const availableYears = useMemo(() => {
    const years = cotizaciones
      .map(c => {
        const dateStr = c.fecha || c.createdAt
        return dateStr ? new Date(dateStr).getFullYear() : null
      })
      .filter((y): y is number => y !== null)
    return [...new Set(years)].sort((a, b) => b - a)
  }, [cotizaciones])

  // Filter cotizaciones based on search and filters
  const filteredCotizaciones = useMemo(() => {
    return cotizaciones.filter(cotizacion => {
      const matchesSearch =
        cotizacion.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cotizacion.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cotizacion.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || cotizacion.estado === statusFilter

      const matchesYear = yearFilter === 'todos' || (() => {
        const dateStr = cotizacion.fecha || cotizacion.createdAt
        if (!dateStr) return true
        return new Date(dateStr).getFullYear().toString() === yearFilter
      })()

      return matchesSearch && matchesStatus && matchesYear
    })
  }, [cotizaciones, searchTerm, statusFilter, yearFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setYearFilter(new Date().getFullYear().toString())
  }

  // 🔁 Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CotizacionSkeleton key={i} />
        ))}
      </div>
    )
  }

  // 🎨 Empty state
  if (!cotizaciones || cotizaciones.length === 0) {
    return <EmptyState />
  }

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Filters Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, código o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4 mr-2" />
                Tabla
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Cards
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredCotizaciones.length} de {cotizaciones.length} cotizaciones
          </div>
        </CardContent>
      </Card>

      {/* 🚨 Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content based on view mode */}
      {viewMode === 'table' ? (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full table-fixed min-w-[850px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-[8%] px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="w-[25%] px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="w-[11%] px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="w-[9%] px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Comercial</th>
                <th className="w-[7%] px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="w-[10%] px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Venta</th>
                <th className="w-[10%] px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                <th className="w-[10%] px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Margen</th>
                <th className="w-[10%] px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCotizaciones.map((cotizacion) => {
                const margen = cotizacion.totalCliente - cotizacion.totalInterno
                const margenPct = cotizacion.totalCliente > 0
                  ? ((margen / cotizacion.totalCliente) * 100).toFixed(1)
                  : '0'
                return (
                  <tr
                    key={cotizacion.id}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    onClick={() => window.location.href = `/comercial/cotizaciones/${cotizacion.id}`}
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] font-medium text-gray-700 bg-gray-100 px-1 py-0.5 rounded">
                        {cotizacion.codigo || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default">
                            <div className="text-xs font-medium text-gray-900 line-clamp-3 leading-snug">
                              {cotizacion.nombre}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {cotizacion.fecha ? formatDate(cotizacion.fecha) : (cotizacion.createdAt ? formatDate(cotizacion.createdAt) : '')}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm">
                          <p className="font-medium">{cotizacion.nombre}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs text-gray-900 line-clamp-2 leading-snug cursor-default">
                            {cotizacion.cliente?.nombre ?? 'Sin cliente'}
                          </div>
                        </TooltipTrigger>
                        {cotizacion.cliente?.nombre && (
                          <TooltipContent side="top" className="max-w-xs">
                            <p>{cotizacion.cliente.nombre}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs text-gray-600 line-clamp-2 leading-snug cursor-default">
                            {(cotizacion as any).user?.name ?? '-'}
                          </div>
                        </TooltipTrigger>
                        {(cotizacion as any).user?.name && (
                          <TooltipContent side="top">
                            <p>{(cotizacion as any).user.name}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={getStatusVariant(cotizacion.estado ?? 'borrador')} className="text-[10px]">
                        {cotizacion.estado ?? 'borrador'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-xs font-medium text-gray-900">
                        {formatDisplayCurrency(cotizacion.totalCliente, cotizacion.moneda, cotizacion.tipoCambio)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-xs text-gray-600">
                        {formatDisplayCurrency(cotizacion.totalInterno, cotizacion.moneda, cotizacion.tipoCambio)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-semibold ${margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatDisplayCurrency(margen, cotizacion.moneda, cotizacion.tipoCambio)}
                        </span>
                        <span className={`text-[10px] ${margen >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {margenPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-0.5 justify-center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                              <Link href={`/comercial/cotizaciones/${cotizacion.id}`}>
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver</TooltipContent>
                        </Tooltip>
                        {cotizacion.estado !== 'aprobada' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setEditingCotizacion(cotizacion)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <DeleteAlertDialog
                              onConfirm={() => handleDelete(cotizacion.id)}
                              title="¿Eliminar cotización?"
                              description={`¿Estás seguro de eliminar la cotización "${cotizacion.nombre}"? Esta acción no se puede deshacer.`}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards View - Original implementation */
        <motion.div
          className="grid gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence>
            {filteredCotizaciones.map((cotizacion, index) => (
              <motion.div
                key={cotizacion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.1,
                  ease: [0.4, 0, 0.2, 1]
                }}
                whileHover={{ y: -2 }}
                className="group"
              >
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle
                          className={`text-lg font-semibold text-foreground transition-colors ${cotizacion.estado !== 'aprobada' ? 'cursor-text hover:text-blue-600' : ''}`}
                          contentEditable={cotizacion.estado !== 'aprobada'}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            if (cotizacion.estado === 'aprobada') return
                            const value = e.currentTarget.textContent?.trim() || ''
                            if (value && value !== cotizacion.nombre) {
                              handleEdit(cotizacion.id, 'nombre', value)
                            }
                          }}
                        >
                          {loadingId === cotizacion.id ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Guardando...
                            </span>
                          ) : (
                            cotizacion.nombre
                          )}
                        </CardTitle>
                        {/* 🏷️ Quote Code */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {cotizacion.codigo || 'Sin código'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{cotizacion.cliente?.nombre ?? 'Sin cliente asignado'}</span>
                        </div>
                        {(cotizacion as any).user?.name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-xs">Comercial:</span>
                            <span>{(cotizacion as any).user.name}</span>
                          </div>
                        )}
                        {(cotizacion.fecha || cotizacion.createdAt) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(cotizacion.fecha || cotizacion.createdAt)}</span>
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={getStatusVariant(cotizacion.estado ?? 'borrador') as "outline" | "default" | "secondary"}
                        className="ml-4"
                      >
                        {cotizacion.estado ?? 'borrador'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* 💰 Financial Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>Total Cliente</span>
                        </div>
                        <p className="font-semibold text-green-600">
                          {formatDisplayCurrency(cotizacion.totalCliente, cotizacion.moneda, cotizacion.tipoCambio)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>Total Interno</span>
                        </div>
                        <p className="font-semibold text-blue-600">
                          {formatDisplayCurrency(cotizacion.totalInterno, cotizacion.moneda, cotizacion.tipoCambio)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>Margen</span>
                        </div>
                        <p className="font-semibold text-purple-600">
                          {formatDisplayCurrency(cotizacion.totalCliente - cotizacion.totalInterno, cotizacion.moneda, cotizacion.tipoCambio)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>% Margen</span>
                        </div>
                        <p className="font-semibold text-orange-600">
                          {cotizacion.totalCliente > 0
                            ? (((cotizacion.totalCliente - cotizacion.totalInterno) / cotizacion.totalCliente) * 100).toFixed(1)
                            : '0'
                          }%
                        </p>
                      </div>
                    </div>

                    {/* 🎯 Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <Link href={`/comercial/cotizaciones/${cotizacion.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Link>
                      </Button>

                      {cotizacion.estado !== 'aprobada' && (
                        <DeleteAlertDialog
                          onConfirm={() => handleDelete(cotizacion.id)}
                          title="¿Eliminar cotización?"
                          description={`¿Estás seguro de eliminar la cotización "${cotizacion.nombre}"? Esta acción no se puede deshacer.`}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal de edición */}
      {editingCotizacion && (
        <CotizacionEditModal
          cotizacion={editingCotizacion}
          open={!!editingCotizacion}
          onOpenChange={(open) => !open && setEditingCotizacion(null)}
          onUpdated={(updated) => {
            onUpdated(updated)
            setEditingCotizacion(null)
          }}
        />
      )}
    </div>
    </TooltipProvider>
  )
}
