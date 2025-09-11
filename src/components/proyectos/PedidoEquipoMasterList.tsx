/**
 * 📋 Pedido Equipo Master List Component
 * 
 * Componente para mostrar la lista master de pedidos de equipos con:
 * - Vista de tabla y cards
 * - Filtros y búsqueda
 * - Navegación a detalle
 * - Estados y estadísticas
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Package, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Grid3X3,
  List
} from 'lucide-react'

// 🎨 UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

// 📡 Types
import type { PedidoEquipo, ListaEquipo } from '@/types/modelos'
import type { PedidoEquipoPayload } from '@/types/payloads'

export interface PedidoEquipoMasterListProps {
  pedidos: PedidoEquipo[]
  listas?: ListaEquipo[]
  loading?: boolean
  proyectoId: string
  onEdit?: (pedido: PedidoEquipo) => void
  onDelete?: (pedidoId: string) => void
  onCreate?: (payload: PedidoEquipoPayload) => Promise<PedidoEquipo | null>
  onRefresh?: () => void
}

// ✅ Helper functions
const getStatusVariant = (estado: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return 'default'
    case 'en_proceso': return 'secondary' 
    case 'completado': return 'outline'
    case 'cancelado': return 'destructive'
    default: return 'outline'
  }
}

const getStatusColor = (estado: string): string => {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return 'text-orange-600'
    case 'en_proceso': return 'text-blue-600'
    case 'completado': return 'text-green-600'
    case 'cancelado': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return 'Sin fecha'
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  if (isNaN(date.getTime())) return 'Fecha inválida'
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// 🎨 Loading Skeleton Component
const PedidoMasterSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

// 🎨 Card View Component
const PedidoCard: React.FC<{
  pedido: PedidoEquipo
  proyectoId: string
  onEdit?: (pedido: PedidoEquipo) => void
  onDelete?: (pedidoId: string) => void
}> = ({ pedido, proyectoId, onEdit, onDelete }) => {
  const router = useRouter()
  
  // 📊 Calculate totals
  const totalItems = pedido.items?.length || 0
  const montoTotal = pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                {pedido.codigo}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(pedido.fechaPedido || '')}
                </span>
                {pedido.fechaEntregaEstimada && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Entrega: {formatDate(pedido.fechaEntregaEstimada)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(pedido.estado || '')}>
                {pedido.estado || 'Sin estado'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/proyectos/${proyectoId}/equipos/pedidos/${pedido.id}`}>
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalle
                    </DropdownMenuItem>
                  </Link>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(pedido)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(pedido.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items:</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Responsable:</span>
                <span className="font-medium truncate">
                  {pedido.responsable?.name || 'No asignado'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monto Total:</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(montoTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <span className={`font-medium ${getStatusColor(pedido.estado || '')}`}>
                  {pedido.estado || 'Sin estado'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 🎯 Action Button */}
          <div className="mt-4 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => router.push(`/proyectos/${proyectoId}/equipos/pedidos/${pedido.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalle
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🎨 Main Component
const PedidoEquipoMasterList: React.FC<PedidoEquipoMasterListProps> = ({
  pedidos,
  listas,
  loading = false,
  proyectoId,
  onEdit,
  onDelete,
  onCreate,
  onRefresh
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const router = useRouter()

  // 🔄 Loading state
  if (loading) {
    return <PedidoMasterSkeleton />
  }

  // 📭 Empty state
  if (pedidos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          No hay pedidos registrados
        </h3>
        <p className="text-gray-600 mb-4">
          Comienza creando tu primer pedido de equipos para este proyecto.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 🎛️ View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pedidos ({pedidos.length})
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 🎨 Content based on view mode */}
      {viewMode === 'cards' ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {pedidos.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              proyectoId={proyectoId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </motion.div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Pedido</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => {
                const totalItems = pedido.items?.length || 0
                const montoTotal = pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0
                
                return (
                  <TableRow key={pedido.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        {pedido.codigo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(pedido.estado || '')}>
                        {pedido.estado || 'Sin estado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(pedido.fechaPedido || '')}
                    </TableCell>
                    <TableCell>
                      {pedido.responsable?.name || 'No asignado'}
                    </TableCell>
                    <TableCell>{totalItems}</TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatCurrency(montoTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/proyectos/${proyectoId}/equipos/pedidos/${pedido.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalle
                            </DropdownMenuItem>
                          </Link>
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(pedido)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={() => onDelete(pedido.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

export default PedidoEquipoMasterList
