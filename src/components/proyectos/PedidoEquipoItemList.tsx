/**
 * 📋 PedidoEquipoItemList Component
 * 
 * Lista de items de un pedido de equipos con:
 * - Vista de tabla responsive
 * - Acciones de edición y eliminación
 * - Estados y estadísticas
 * - Búsqueda y filtros
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// 🎨 UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Skeleton } from '@/components/ui/skeleton'

// 🎯 Icons
import {
  Package,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  DollarSign,
  Hash,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'

// 📡 Types
import type { PedidoEquipoItem } from '@/types/modelos'
import type { PedidoEquipoItemPayload, PedidoEquipoItemUpdatePayload } from '@/types/payloads'
import type { ListaEquipo } from '@/types/modelos'

// 🎯 Props Interface
interface PedidoEquipoItemListProps {
  items: PedidoEquipoItem[]
  listas?: ListaEquipo[]
  loading?: boolean
  onEdit?: (item: PedidoEquipoItem) => void
  onDelete?: (itemId: string) => Promise<void>
  onUpdate?: (id: string, payload: PedidoEquipoItemUpdatePayload) => Promise<void>
  onRefresh?: () => void
  className?: string
}

// 🎨 Helper functions
const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

const truncateText = (text: string, maxLength: number = 50) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 🎨 Loading Skeleton Component
const ItemListSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="border rounded-lg">
      <div className="p-4">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  </div>
)

// 🎯 Main Component
export const PedidoEquipoItemList: React.FC<PedidoEquipoItemListProps> = ({
  items,
  listas,
  loading = false,
  onEdit,
  onDelete,
  onUpdate,
  onRefresh,
  className = ''
}) => {
  // 🎯 States
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 🔍 Filtered items
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items
    
    const term = searchTerm.toLowerCase()
    return items.filter(item => 
      item.codigo?.toLowerCase().includes(term) ||
      item.descripcion?.toLowerCase().includes(term) ||
      item.estado?.toLowerCase().includes(term)
    )
  }, [items, searchTerm])

  // 📊 Statistics
  const totalItems = items.length
  const totalCantidad = items.reduce((sum, item) => sum + (item.cantidadPedida || 0), 0)
  const totalCosto = items.reduce((sum, item) => sum + ((item.cantidadPedida || 0) * (item.precioUnitario || 0)), 0)

  // 🎯 Event handlers
  const handleDelete = async (itemId: string) => {
    if (!onDelete) return
    
    try {
      setDeletingId(itemId)
      await onDelete(itemId)
      toast.success('Item eliminado correctamente')
    } catch (error) {
      console.error('Error al eliminar item:', error)
      toast.error('Error al eliminar el item')
    } finally {
      setDeletingId(null)
    }
  }

  // 🔄 Loading state
  if (loading) {
    return <ItemListSkeleton />
  }

  // 📭 Empty state
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center py-12 ${className}`}
      >
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          No hay items en este pedido
        </h3>
        <p className="text-gray-600 mb-4">
          Agrega items desde las listas de equipos disponibles.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${className}`}
    >
      {/* 📊 Statistics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cantidad Total</p>
                <p className="text-2xl font-bold">{totalCantidad}</p>
              </div>
              <Hash className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Costo Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCosto)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🔍 Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items del Pedido
              <Badge variant="outline">{filteredItems.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, descripción o estado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

          {/* 📋 Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Tiempo Entrega</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredItems.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        {item.codigo}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {truncateText(item.descripcion || '', 40)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.estado === 'entregado' ? 'default' : 
                                 item.estado === 'pendiente' ? 'secondary' : 
                                 item.estado === 'atendido' ? 'outline' : 'destructive'}
                        >
                          {item.estado || 'pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.cantidadPedida || 0}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.unidad || 'und'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.precioUnitario || 0)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency((item.cantidadPedida || 0) * (item.precioUnitario || 0))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.tiempoEntrega && (
                            <p className="font-medium">{item.tiempoEntrega}</p>
                          )}
                          {item.tiempoEntregaDias && (
                            <p className="text-muted-foreground">{item.tiempoEntregaDias} días</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar item?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. El item será eliminado permanentemente del pedido.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(item.id)}
                                      disabled={deletingId === item.id}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deletingId === item.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Eliminando...
                                        </>
                                      ) : (
                                        'Eliminar'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* 📭 No results */}
          {filteredItems.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No se encontraron items que coincidan con "{searchTerm}"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default PedidoEquipoItemList
