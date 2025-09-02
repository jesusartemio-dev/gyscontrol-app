'use client'

// ===================================================
// 📁 Componente: ProyectoEquipoItemTabla.tsx
// 📌 Descripción: Tabla para mostrar ítems de equipos de un proyecto
// ===================================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Trash2, 
  Package, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProyectoEquipoItem } from '@/types'

interface Props {
  items: ProyectoEquipoItem[]
  onUpdated?: () => void
}

// Función para obtener el color del estado
function getEstadoColor(estado: string): { variant: "default" | "secondary" | "destructive" | "outline", className: string } {
  switch (estado?.toLowerCase()) {
    case 'entregado':
      return { variant: 'secondary', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    case 'comprado':
      return { variant: 'secondary', className: 'bg-purple-100 text-purple-800 border-purple-200' }
    case 'en_lista':
      return { variant: 'secondary', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
    case 'aprobado_gestor':
      return { variant: 'secondary', className: 'bg-green-100 text-green-800 border-green-200' }
    case 'aprobado_coordinador':
      return { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-200' }
    case 'revisado_tecnico':
      return { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    case 'pendiente':
      return { variant: 'outline', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    case 'reemplazado':
      return { variant: 'secondary', className: 'bg-orange-100 text-orange-800 border-orange-200' }
    default:
      return { variant: 'outline', className: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
}

export default function ProyectoEquipoItemTabla({ items, onUpdated }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('codigo')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Get variation icon and color
  const getVariationDisplay = (presupuesto: number, costoReal: number) => {
    const variation = costoReal - presupuesto
    const percentage = presupuesto > 0 ? (variation / presupuesto) * 100 : 0
    
    if (Math.abs(percentage) < 1) {
      return { icon: Minus, color: 'text-gray-500', text: '0%' }
    } else if (variation > 0) {
      return { icon: TrendingUp, color: 'text-red-500', text: `+${percentage.toFixed(1)}%` }
    } else {
      return { icon: TrendingDown, color: 'text-green-500', text: `${percentage.toFixed(1)}%` }
    }
  }

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter(item => {
      const matchesSearch = 
        item.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || item.estado?.toLowerCase() === statusFilter
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'codigo':
          aValue = a.codigo || ''
          bValue = b.codigo || ''
          break
        case 'descripcion':
          aValue = a.descripcion || ''
          bValue = b.descripcion || ''
          break
        case 'costoInterno':
          aValue = a.costoInterno
          bValue = b.costoInterno
          break
        case 'costoReal':
          aValue = a.costoReal
          bValue = b.costoReal
          break
        case 'cantidad':
          aValue = a.cantidad
          bValue = b.cantidad
          break
        default:
          aValue = a.codigo || ''
          bValue = b.codigo || ''
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc' 
          ? aValue - bValue
          : bValue - aValue
      }
    })

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(items.map(item => item.estado?.toLowerCase()).filter(Boolean)))

  if (items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 space-y-4"
      >
        <Package className="h-16 w-16 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">No hay items registrados</h3>
          <p className="text-muted-foreground">Este grupo de equipos no tiene items asignados.</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="codigo">Código</SelectItem>
              <SelectItem value="descripcion">Descripción</SelectItem>
              <SelectItem value="costoInterno">Presupuesto</SelectItem>
              <SelectItem value="costoReal">Costo Real</SelectItem>
              <SelectItem value="cantidad">Cantidad</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={onUpdated}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Mostrando {filteredAndSortedItems.length} de {items.length} items
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Descripción</TableHead>
                  <TableHead className="font-semibold text-center">Unidad</TableHead>
                  <TableHead className="font-semibold text-center">Cantidad</TableHead>
                  <TableHead className="font-semibold text-right">Presupuesto</TableHead>
                  <TableHead className="font-semibold text-right">Costo Real</TableHead>
                  <TableHead className="font-semibold text-center">Variación</TableHead>
                  <TableHead className="font-semibold text-center">Estado</TableHead>
                  <TableHead className="font-semibold">Cambio</TableHead>
                  <TableHead className="font-semibold">Item Reemplazado</TableHead>
                  <TableHead className="font-semibold">Lista</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedItems.map((item, index) => {
                  const fueReemplazo = !!item.listaEquipoSeleccionadoId
                  const estadoVisual = item.estado
                  const comentarioCambio =
                    item.listaEquipoSeleccionado?.comentarioRevision || item.motivoCambio || '—'
                  const reemplazadoTexto = item.listaEquipoSeleccionado
                    ? item.listaEquipoSeleccionado.codigo
                    : '—'
                  
                  const variation = getVariationDisplay(item.costoInterno, item.costoReal)
                  const VariationIcon = variation.icon
                  const estadoStyle = getEstadoColor(item.estado)
                  
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {item.codigo || 'Sin código'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={item.descripcion}>
                          {item.descripcion || 'Sin descripción'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.unidad || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.cantidad || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(item.costoInterno)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(item.costoReal)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`flex items-center justify-center gap-1 ${variation.color}`}>
                          <VariationIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">{variation.text}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={estadoStyle.className}>
                          {estadoVisual?.replace('_', ' ') || 'Sin estado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <div className="truncate text-sm text-muted-foreground" title={comentarioCambio}>
                          {comentarioCambio !== '—' ? comentarioCambio : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {reemplazadoTexto}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.lista?.codigo || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredAndSortedItems.length === 0 && searchTerm && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-8 space-y-4"
        >
          <Search className="h-12 w-12 text-muted-foreground" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
            <p className="text-muted-foreground">Intenta con otros términos de búsqueda o filtros.</p>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all') }}>
              Limpiar filtros
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
