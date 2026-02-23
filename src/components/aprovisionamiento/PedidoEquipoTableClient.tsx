/**
 * 🛒 PedidoEquipoTableClient Component
 * 
 * Tabla avanzada para gestión de pedidos de equipos con funcionalidades
 * de seguimiento, validación de coherencia y gestión de proveedores.
 * 
 * Features:
 * - Tabla responsive con seguimiento de estados
 * - Indicadores de coherencia con listas
 * - Gestión de fechas de entrega
 * - Seguimiento de proveedores
 * - Alertas de retrasos y inconsistencias
 * - Acciones de seguimiento y validación
 * - Ordenamiento y paginación
 * - Selección múltiple para acciones en lote
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  AlertCircle,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Package,
  Target,
  Trash2,
  Truck,
  User,
  Users,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// 📝 Types
import type { EstadoPedido } from '@/types/modelos'

// 📋 Props interface
interface PedidoEquipoTableClientProps {
  data: Array<{
    id: string
    codigo: string
    descripcion?: string
    estado: EstadoPedido
    fechaCreacion: Date
    fechaNecesaria?: Date
    fechaEntregaEstimada?: Date
    fechaEntregaReal?: Date
    montoTotal?: number
    observaciones?: string
    urgente?: boolean
    coherencia?: {
      esCoherente: boolean
      itemsCoherentes: number
      preciosCoherentes: number
      totalItems: number
      alertas: {
        cantidadesExcedidas: boolean
        preciosDesviados: boolean
        itemsFaltantes: boolean
        sinLista?: boolean
      }
    }
    proyecto?: {
      id: string
      nombre: string
      codigo: string
    }
    proveedor?: {
      id: string
      nombre: string
      ruc?: string
      contacto?: string
    }
    lista?: {
      id: string
      nombre: string
    }
    responsable?: {
      id: string
      nombre: string
      email: string
    }
    items?: Array<{
      id: string
      cantidad: number
      cantidadRecibida?: number
      precioUnitario?: number
      subtotal?: number
    }>
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  sorting?: {
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
  loading?: boolean
  allowEdit?: boolean
  allowBulkActions?: boolean
  showCoherenceIndicators?: boolean
  onPedidoClick?: (pedido: any) => void
  onPedidoEdit?: (pedido: any) => void
  onPedidoUpdate?: (id: string, updates: any) => Promise<void>
  onBulkAction?: (action: string, selectedIds: string[]) => Promise<void>
  onExport?: (format: 'pdf' | 'excel') => void
}

// 🎯 Estados de pedido con colores
const ESTADOS_CONFIG = {
  borrador: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: FileText,
    description: 'Pedido en preparación'
  },
  enviado: {
    label: 'Enviado',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Truck,
    description: 'Pedido enviado al proveedor'
  },
  atendido: {
    label: 'Atendido',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    description: 'Pedido confirmado por proveedor'
  },
  parcial: {
    label: 'Parcial',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Package,
    description: 'Entrega parcial recibida'
  },
  entregado: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    description: 'Pedido completamente entregado'
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    description: 'Pedido cancelado'
  }
} as const

// 🔧 Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount)
}

const getCoherenceColor = (coherencia?: any) => {
  if (!coherencia) return 'bg-gray-100 text-gray-800'
  if (coherencia.esCoherente) return 'bg-green-100 text-green-800'
  return 'bg-red-100 text-red-800'
}

const isOverdue = (fechaEntrega?: Date, estado?: EstadoPedido) => {
  if (!fechaEntrega || estado === 'entregado') return false
  return new Date(fechaEntrega) < new Date()
}

const getProgressPercentage = (cantidadRecibida: number, cantidadTotal: number) => {
  if (cantidadTotal === 0) return 0
  return Math.min((cantidadRecibida / cantidadTotal) * 100, 100)
}

// ✅ Main component
export default function PedidoEquipoTableClient({
  data,
  pagination,
  sorting,
  loading = false,
  allowEdit = true,
  allowBulkActions = true,
  showCoherenceIndicators = true,
  onPedidoClick,
  onPedidoEdit,
  onPedidoUpdate,
  onBulkAction,
  onExport
}: PedidoEquipoTableClientProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // 🔁 Handle sorting
  const handleSort = useCallback((column: string) => {
    const newSortOrder = sorting?.sortBy === column && sorting?.sortOrder === 'asc' ? 'desc' : 'asc'
    const params = new URLSearchParams(window.location.search)
    params.set('sortBy', column)
    params.set('sortOrder', newSortOrder)
    router.push(`?${params.toString()}`)
  }, [sorting, router])

  // 🔁 Handle selection
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? data.map(item => item.id) : [])
  }, [data])

  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => 
      checked 
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id)
    )
  }, [])

  // 🔁 Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos un pedido')
      return
    }

    setBulkActionLoading(true)
    try {
      await onBulkAction?.(action, selectedIds)
      setSelectedIds([])
      toast.success(`Acción "${action}" aplicada a ${selectedIds.length} pedidos`)
    } catch (error) {
      toast.error('Error al ejecutar la acción')
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedIds, onBulkAction])

  // 🔁 Calculate stats
  const stats = useMemo(() => {
    const totalItems = data.reduce((sum, pedido) => sum + (pedido.items?.length || 0), 0)
    const totalRecibidos = data.reduce((sum, pedido) => {
      return sum + (pedido.items?.reduce((itemSum, item) => itemSum + (item.cantidadRecibida || 0), 0) || 0)
    }, 0)
    const totalPendientes = data.reduce((sum, pedido) => {
      return sum + (pedido.items?.reduce((itemSum, item) => itemSum + (item.cantidad - (item.cantidadRecibida || 0)), 0) || 0)
    }, 0)
    
    return {
      totalItems,
      totalRecibidos,
      totalPendientes,
      progresoPromedio: totalItems > 0 ? Math.min(100, (totalRecibidos / totalItems) * 100) : 0
    }
  }, [data])

  // 🚨 Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="border rounded-lg">
          <div className="h-12 bg-gray-100 border-b" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 border-b last:border-b-0 bg-white">
              <div className="flex items-center space-x-4 p-4">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 📊 Empty state
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No se encontraron pedidos
        </h3>
        <p className="text-gray-600 mb-4 text-center">
          No hay pedidos que coincidan con los filtros aplicados
        </p>
        <Button variant="outline" onClick={() => router.push(window.location.pathname)}>
          Limpiar filtros
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 📊 Header with stats and actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            {pagination.total} pedidos encontrados
          </h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Items: {stats.totalItems}</span>
            <span>Recibidos: {stats.totalRecibidos}</span>
            <span>Pendientes: {stats.totalPendientes}</span>
            <span>Progreso: {stats.progresoPromedio.toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Bulk Actions */}
          {allowBulkActions && selectedIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkActionLoading}>
                  Acciones ({selectedIds.length})
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones en lote</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('marcar_enviado')}>
                  <Truck className="mr-2 h-4 w-4" />
                  Marcar como enviado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('marcar_atendido')}>
                  <Clock className="mr-2 h-4 w-4" />
                  Marcar como atendido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('exportar_seleccionados')}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar seleccionados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleBulkAction('eliminar')} 
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar seleccionados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Export Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport?.('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.('excel')}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 📋 Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {allowBulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === data.length && data.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
              )}
              
              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => handleSort('codigo')}
                >
                  Código
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              
              <TableHead className="min-w-[200px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => handleSort('proyecto')}
                >
                  Proyecto
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              
              <TableHead className="min-w-[150px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => handleSort('proveedor')}
                >
                  Proveedor
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              
              <TableHead className="min-w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => handleSort('estado')}
                >
                  Estado
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              
              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => handleSort('fechaNecesaria')}
                >
                  F. Entrega
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              
              <TableHead className="min-w-[100px] text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => handleSort('montoTotal')}
                >
                  Monto
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              
              {showCoherenceIndicators && (
                <TableHead className="min-w-[100px] text-center">
                  Coherencia
                </TableHead>
              )}
              
              <TableHead className="min-w-[120px] text-center">
                Progreso
              </TableHead>
              
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            <AnimatePresence>
              {data.map((pedido, index) => {
                const estadoConfig = ESTADOS_CONFIG[pedido.estado]
                const isSelected = selectedIds.includes(pedido.id)
                const overdue = isOverdue(pedido.fechaNecesaria, pedido.estado)
                const totalItems = pedido.items?.reduce((sum, item) => sum + item.cantidad, 0) || 0
                const totalRecibidos = pedido.items?.reduce((sum, item) => sum + (item.cantidadRecibida || 0), 0) || 0
                const progreso = getProgressPercentage(totalRecibidos, totalItems)
                
                return (
                  <motion.tr
                    key={pedido.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/50',
                      isSelected && 'bg-blue-50',
                      overdue && 'border-l-4 border-l-red-500 bg-red-50/30',
                      pedido.urgente && 'border-l-4 border-l-orange-500 bg-orange-50/30'
                    )}
                  >
                    {allowBulkActions && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectItem(pedido.id, checked as boolean)}
                          aria-label={`Seleccionar pedido ${pedido.codigo}`}
                        />
                      </TableCell>
                    )}
                    
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">{pedido.codigo}</span>
                          {pedido.urgente && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-4 w-4 text-orange-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Pedido urgente</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {overdue && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Clock className="h-4 w-4 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Pedido vencido</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {pedido.descripcion && (
                          <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {pedido.descripcion}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {pedido.proyecto?.codigo || 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {pedido.proyecto?.nombre || 'Sin proyecto'}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {pedido.proveedor?.nombre || 'Sin proveedor'}
                          </span>
                        </div>
                        {pedido.proveedor?.ruc && (
                          <Badge variant="outline" className="text-xs">
                            RUC: {pedido.proveedor.ruc}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge 
                              variant="outline" 
                              className={cn('flex items-center space-x-1', estadoConfig.color)}
                            >
                              <estadoConfig.icon className="h-3 w-3" />
                              <span>{estadoConfig.label}</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{estadoConfig.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {pedido.fechaNecesaria && (
                          <div className={cn(
                            'text-sm font-medium',
                            overdue ? 'text-red-600' : 'text-gray-900'
                          )}>
                            {format(new Date(pedido.fechaNecesaria), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        )}
                        {pedido.fechaEntregaEstimada && (
                          <div className="text-xs text-blue-600">
                            Estimada: {format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        )}
                        {pedido.fechaEntregaReal && (
                          <div className="text-xs text-green-600">
                            Entregado: {format(new Date(pedido.fechaEntregaReal), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        )}
                        {!pedido.fechaNecesaria && (
                          <span className="text-xs text-muted-foreground">Sin fecha</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {pedido.montoTotal ? formatCurrency(pedido.montoTotal) : 'N/A'}
                        </div>
                        {pedido.items && pedido.items.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {pedido.items.length} items
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {showCoherenceIndicators && (
                      <TableCell className="text-center">
                        {pedido.coherencia ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge 
                                  variant={pedido.coherencia.esCoherente ? "default" : "destructive"} 
                                  className="flex items-center space-x-1"
                                >
                                  <Target className="h-3 w-3" />
                                  <span>
                                    {pedido.coherencia.esCoherente ? 'Coherente' : 'Incoherente'}
                                  </span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p>Coherencia con lista de aprovisionamiento</p>
                                  <p className="text-xs">
                                    Items coherentes: {pedido.coherencia.itemsCoherentes}/{pedido.coherencia.totalItems}
                                  </p>
                                  <p className="text-xs">
                                    Precios coherentes: {pedido.coherencia.preciosCoherentes}/{pedido.coherencia.totalItems}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    )}
                    
                    <TableCell className="text-center">
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={cn(
                                'h-2 rounded-full transition-all duration-300',
                                progreso === 100 ? 'bg-green-500' : 
                                progreso >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                              )}
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {progreso.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {totalRecibidos}/{totalItems}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => onPedidoClick?.(pedido)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          
                          {allowEdit && (
                            <DropdownMenuItem onClick={() => onPedidoEdit?.(pedido)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem asChild>
                            <Link href={`/finanzas/aprovisionamiento/pedidos/${pedido.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              Ver página completa
                            </Link>
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => onExport?.('pdf')}>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar PDF
                          </DropdownMenuItem>
                          
                          {pedido.responsable && (
                            <DropdownMenuItem>
                              <User className="mr-2 h-4 w-4" />
                              Contactar responsable
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* 📄 Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} pedidos
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', (pagination.page - 1).toString())
                router.push(`?${params.toString()}`)
              }}
              disabled={pagination.page <= 1}
            >
              Anterior
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const params = new URLSearchParams(window.location.search)
                      params.set('page', pageNum.toString())
                      router.push(`?${params.toString()}`)
                    }}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', (pagination.page + 1).toString())
                router.push(`?${params.toString()}`)
              }}
              disabled={pagination.page >= pagination.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
