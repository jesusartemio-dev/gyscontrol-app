// ===================================================
// 📁 Archivo: ListaEquipoItemList.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Lista de ítems técnicos de una lista de equipos con mejoras UX/UI
// ===================================================

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, Trash2, CheckCircle2, X, Search, Filter, Package, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Grid3X3, List, Settings, Eye, EyeOff, Minimize2, RotateCcw, Recycle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ListaEquipoItem } from '@/types'
import { updateListaEquipoItem, deleteListaEquipoItem } from '@/lib/services/listaEquipoItem'
import { toast } from 'sonner'
import ModalReemplazarItemDesdeCatalogo from './ModalReemplazarItemDesdeCatalogo'
import ModalReemplazarReemplazoDesdeCatalogo from './ModalReemplazarReemplazoDesdeCatalogo'
import { calcularCostoItem, calcularCostoTotal, formatCurrency } from '@/lib/utils/costoCalculations'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CotizacionInfo, CotizacionCodigoSimple } from './CotizacionSelector'
import { 
  calcularResumenPedidos, 
  getBadgeVariantPorEstado, 
  getTextoPorEstado, 
  getTextoPorEstadoConCodigo,
  getClasesFilaPorEstado,
  getInfoPedidosParaTooltip,
  tienePedidosActivos,
  estaDisponible,
  getIdPedidoRelevante,
  getCodigoPedidoRelevante,
  type EstadoPedidoItemResumen 
} from '@/lib/utils/pedidoHelpers'

interface Props {
  listaId: string
  proyectoId: string
  items: ListaEquipoItem[]
  editable?: boolean
  onCreated?: () => void | Promise<void>
  onItemUpdated?: (itemId: string) => Promise<void>
  onItemsUpdated?: () => Promise<void>
  onRefresh?: () => Promise<void>
}

const labelOrigen: Record<string, string> = {
  cotizado: 'cotizado',
  nuevo: 'nuevo',
  reemplazo: 'reemplazo',
}

// ✅ Utility functions for styling (formatCurrency moved to utils/costoCalculations.ts)

const getStatusVariant = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'aprobado': return 'default'
    case 'rechazado': return 'destructive'
    case 'pendiente': return 'outline'
    default: return 'secondary'
  }
}

const getOrigenVariant = (origen: string): "default" | "secondary" | "outline" => {
  switch (origen?.toLowerCase()) {
    case 'cotizado': return 'default'
    case 'nuevo': return 'secondary'
    case 'reemplazo': return 'outline'
    default: return 'secondary'
  }
}

// 🎨 Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export default function ListaEquipoItemList({ listaId, proyectoId, items, editable = true, onCreated, onItemUpdated, onItemsUpdated, onRefresh }: Props) {
  const router = useRouter()
  const [editCantidadItemId, setEditCantidadItemId] = useState<string | null>(null)
  const [editCantidadValues, setEditCantidadValues] = useState<Record<string, string>>({})
  const [editComentarioItemId, setEditComentarioItemId] = useState<string | null>(null)
  const [editComentarioValues, setEditComentarioValues] = useState<Record<string, string>>({})
  const [itemReemplazoOriginal, setItemReemplazoOriginal] = useState<ListaEquipoItem | null>(null)
  const [itemReemplazoReemplazo, setItemReemplazoReemplazo] = useState<ListaEquipoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list') // ✅ Default to list view
  const [compactMode, setCompactMode] = useState(true) // ✅ Compact mode by default
  const [visibleColumns, setVisibleColumns] = useState({
    codigoDescripcion: true, // ✅ Combined column
    unidad: false, // ✅ Oculta cuando está activa la unificada
    cantidad: false, // ✅ Oculta cuando está activa la unificada
    cantidadUnidad: true, // ✅ Nueva columna unificada (activada por defecto)
    cotizacion: true,
    costo: true,
    entrega: false,
    origen: true,
    estado: true,
    verificado: true,
    comentario: true, // ✅ Visible by default
    pedidos: true, // ✅ Nueva columna de pedidos
    equipo: false,
    acciones: true
  })

  // 📊 Calculate statistics
  const stats = useMemo(() => {
    const total = items.length
    const verificados = items.filter(i => i.verificado).length
    const sinPedidos = items.filter(i => {
      const resumen = calcularResumenPedidos(i)
      return resumen.estado === 'sin_pedidos'
    }).length
    const enPedido = items.filter(i => {
      const resumen = calcularResumenPedidos(i)
      return resumen.estado === 'pendiente' || resumen.estado === 'parcial'
    }).length
    const conCotizacion = items.filter(i => 
      i.cotizacionSeleccionada && i.cotizacionSeleccionada.precioUnitario && i.cotizacionSeleccionada.precioUnitario > 0
    ).length
    const costoTotal = calcularCostoTotal(items)
    
    return { total, verificados, sinPedidos, enPedido, conCotizacion, costoTotal }
  }, [items])

  // 🔍 Filter and search items
  const filteredItems = useMemo(() => {
    let filtered = [...items]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Unified filter logic
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => {
        const resumen = calcularResumenPedidos(item)
        const tieneCotizacion = item.cotizacionSeleccionada && item.cotizacionSeleccionada.precioUnitario && item.cotizacionSeleccionada.precioUnitario > 0
        
        switch (filterStatus) {
          case 'sin_pedidos':
            return resumen.estado === 'sin_pedidos'
          case 'en_pedido':
            return resumen.estado === 'pendiente' || resumen.estado === 'parcial'
          case 'completos':
            return resumen.estado === 'atendido' || resumen.estado === 'entregado'
          case 'verificados':
            return item.verificado === true
          case 'no_verificados':
            return item.verificado === false
          case 'con_cotizacion':
            return tieneCotizacion
          case 'sin_cotizacion':
            return !tieneCotizacion
          default:
            return true
        }
      })
    }
    
    return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [items, searchTerm, filterStatus])

  const handleSaveCantidad = async (itemId: string) => {
    try {
      const cantidad = parseFloat(editCantidadValues[itemId] || '')
      if (isNaN(cantidad) || cantidad <= 0) {
        toast.error('Cantidad inválida')
        return
      }
      await updateListaEquipoItem(itemId, { cantidad })
      toast.success('Cantidad actualizada')
      setEditCantidadItemId(null)
      setEditCantidadValues((prev) => {
        const updated = { ...prev }
        delete updated[itemId]
        return updated
      })
      onItemUpdated?.(itemId)
      onItemsUpdated?.()
    } catch {
      toast.error('Error al guardar cantidad')
    }
  }

  const handleSaveComentario = async (itemId: string) => {
    try {
      await updateListaEquipoItem(itemId, {
        comentarioRevision: editComentarioValues[itemId] || '',
      })
      toast.success('Comentario guardado')
      setEditComentarioItemId(null)
      setEditComentarioValues((prev) => {
        const updated = { ...prev }
        delete updated[itemId]
        return updated
      })
      onItemUpdated?.(itemId)
      onItemsUpdated?.()
    } catch {
      toast.error('Error al guardar el comentario')
    }
  }

  const handleVerificado = async (item: ListaEquipoItem, checked: boolean) => {
    try {
      await updateListaEquipoItem(item.id, { verificado: checked })
      if (checked) {
        const comentarioActual = item.comentarioRevision ?? ''
        // ✅ Set comment values first
        setEditComentarioValues((prev) => ({
          ...prev,
          [item.id]: comentarioActual.trim() === '' ? 'Verificado' : comentarioActual,
        }))
        // ✅ Then set edit mode
        setEditComentarioItemId(item.id)
        // ✅ Focus input after render
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>(`#comentario-${item.id}`)
          if (input) {
            input.focus()
            input.select() // ✅ Select text for easy editing
          }
        }, 100) // ✅ Increased timeout for better reliability
      } else {
        setEditComentarioItemId(null)
        // ✅ Clear comment values when unchecked
        setEditComentarioValues((prev) => {
          const updated = { ...prev }
          delete updated[item.id]
          return updated
        })
      }
      onCreated?.()
    } catch {
      toast.error('Error al actualizar verificado')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const ok = await deleteListaEquipoItem(deleteTarget)
      if (ok) {
        toast.success('🗑️ Ítem eliminado')
        onItemsUpdated?.()
      }
    } catch {
      toast.error('❌ No se pudo eliminar el ítem')
    } finally {
      setDeleteTarget(null)
    }
  }

  // 🔗 Función para navegar al pedido
  const handleNavigateToPedido = (item: ListaEquipoItem) => {
    const resumenPedidos = calcularResumenPedidos(item)
    const pedidoId = getIdPedidoRelevante(resumenPedidos)
    
    if (pedidoId) {
      router.push(`/proyectos/${proyectoId}/pedidos-equipo/${pedidoId}`)
    } else {
      toast.error('No se encontró un pedido asociado a este ítem')
    }
  }

  // 🎨 Render header with statistics
  const renderHeader = () => (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-4"
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Ítems</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Verificados</p>
              <p className="text-2xl font-bold text-green-600">{stats.verificados}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sin Pedidos</p>
              <p className="text-2xl font-bold text-orange-600">{stats.sinPedidos}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">En Pedido</p>
              <p className="text-2xl font-bold text-blue-600">{stats.enPedido}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Con Cotización</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.conCotizacion}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search, Filter and View Toggle */}
       <div className="flex flex-col sm:flex-row gap-4">
         <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Buscar por código o descripción..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-10"
           />
         </div>
         
         {/* 🎯 Filtros minimalistas unificados */}
         <div className="flex flex-wrap gap-2">
           <Button
             variant={filterStatus === 'all' ? 'default' : 'outline'}
             size="sm"
             onClick={() => setFilterStatus('all')}
           >
             Todos
           </Button>
           <Button
             variant={filterStatus === 'sin_pedidos' ? 'default' : 'outline'}
             size="sm"
             onClick={() => setFilterStatus('sin_pedidos')}
           >
             Sin Pedidos
           </Button>
           <Button
             variant={filterStatus === 'en_pedido' ? 'default' : 'outline'}
             size="sm"
             onClick={() => setFilterStatus('en_pedido')}
           >
             En Pedido
           </Button>
           <Button
             variant={filterStatus === 'completos' ? 'default' : 'outline'}
             size="sm"
             onClick={() => setFilterStatus('completos')}
           >
             Completos
           </Button>
           <Button
             variant={filterStatus === 'verificados' ? 'default' : 'outline'}
             size="sm"
             onClick={() => setFilterStatus('verificados')}
           >
             Verificados
           </Button>
           <Button
             variant={filterStatus === 'no_verificados' ? 'default' : 'outline'}
             size="sm"
             onClick={() => setFilterStatus('no_verificados')}
           >
             No Verificados
           </Button>
           <Button
             variant={filterStatus === 'con_cotizacion' ? 'default' : 'outline'}
             size="sm"
             onClick={() => setFilterStatus('con_cotizacion')}
           >
             Con Cotización
           </Button>
         </div>
         
         {/* View Mode Toggle */}
         <div className="flex gap-2">
           <div className="flex gap-1 border rounded-md p-1">
             <Button
               variant={viewMode === 'cards' ? 'default' : 'ghost'}
               size="sm"
               onClick={() => setViewMode('cards')}
               className="h-8 px-3"
             >
               <Grid3X3 className="h-4 w-4 mr-1" />
               Cards
             </Button>
             <Button
               variant={viewMode === 'list' ? 'default' : 'ghost'}
               size="sm"
               onClick={() => setViewMode('list')}
               className="h-8 px-3"
             >
               <List className="h-4 w-4 mr-1" />
               Lista
             </Button>
           </div>
           
           {/* Compact Mode Toggle */}
           {viewMode === 'list' && (
             <Button
               variant={compactMode ? 'default' : 'outline'}
               size="sm"
               onClick={() => setCompactMode(!compactMode)}
               className="h-8 px-3"
             >
               <Minimize2 className="h-4 w-4 mr-1" />
               Compacto
             </Button>
           )}
           
           {/* Column Visibility Toggle */}
           {viewMode === 'list' && (
             <Popover>
               <PopoverTrigger asChild>
                 <Button variant="outline" size="sm" className="h-8 px-2">
                   <Settings className="h-3 w-3" />
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-48 p-3" align="end">
                 <div className="space-y-2">
                   {/* ✅ Toggle para columnas unificadas vs separadas */}
                   <div className="flex items-center justify-between py-1">
                     <Label className="text-xs font-medium">Unificadas</Label>
                     <Switch 
                        checked={visibleColumns.cantidadUnidad} 
                        onCheckedChange={(checked) => { 
                          setVisibleColumns(prev => ({ 
                            ...prev, 
                            cantidadUnidad: checked, 
                            unidad: !checked, 
                            cantidad: !checked 
                          })) 
                        }} 
                      />
                   </div>
                   <div className="h-px bg-border" />
                   {Object.entries({
                     codigoDescripcion: 'Código',
                     unidad: 'Unidad',
                     cantidad: 'Cantidad',
                     cantidadUnidad: 'Cant./Unidad',
                     cotizacion: 'Cotización',
                     costo: 'Costo',
                     entrega: 'Entrega',
                     origen: 'Origen',
                     estado: 'Estado',
                     verificado: 'Verificado'
                   }).map(([key, label]) => {
                     // ✅ Ocultar columnas individuales cuando está activa la unificada
                     if (visibleColumns.cantidadUnidad && (key === 'unidad' || key === 'cantidad')) {
                       return null
                     }
                     // ✅ Ocultar columna unificada cuando están activas las individuales
                     if (!visibleColumns.cantidadUnidad && key === 'cantidadUnidad') {
                       return null
                     }
                     
                     return (
                       <div key={key} className="flex items-center justify-between py-0.5">
                         <Label htmlFor={key} className="text-xs">{label}</Label>
                         <Switch
                           id={key}
                           checked={visibleColumns[key as keyof typeof visibleColumns]}
                           onCheckedChange={(checked) => 
                             setVisibleColumns(prev => ({ ...prev, [key]: checked }))
                           }
                           disabled={key === 'codigoDescripcion'}
                         />
                       </div>
                     )
                   })}
                 </div>
               </PopoverContent>
             </Popover>
           )}
         </div>
       </div>
    </motion.div>
  )

  // 🎨 Render empty state
  const renderEmptyState = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No hay ítems técnicos</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm || filterStatus !== 'all' 
          ? 'No se encontraron ítems que coincidan con los filtros aplicados.'
          : 'Comienza agregando ítems técnicos a esta lista de equipos.'}
      </p>
      {(searchTerm || filterStatus !== 'all') && (
        <Button 
          variant="outline" 
          onClick={() => {
            setSearchTerm('')
            setFilterStatus('all')
          }}
        >
          Limpiar filtros
        </Button>
      )}
    </motion.div>
  )

  // 🎨 Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-6 w-full mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </Card>
      ))}
    </div>
  )

  // 🎨 Render list view (table) - Enhanced alignment
  const renderListView = () => {
    const cellPadding = compactMode ? 'px-2 py-1.5' : 'px-3 py-2'
    const textSize = compactMode ? 'text-xs' : 'text-sm'
    
    // ✅ Define optimized column widths for compact layout
    const columnWidths = {
      codigoDescripcion: compactMode ? 'w-48' : 'w-56', // ✅ Reduced width
      unidad: 'w-16',
      cantidad: 'w-20',
      cantidadUnidad: 'w-28', // ✅ Nueva columna unificada Cantidad/Unidad
      cotizacion: 'w-28',
      costo: 'w-24',
      entrega: 'w-20',
      origen: 'w-20',
      estado: 'w-24',
      pedidos: 'w-32', // ✅ Nueva columna para pedidos
      verificado: 'w-12',
      comentario: compactMode ? 'w-56' : 'w-64', // ✅ Significantly increased width for optimal comment editing
      equipo: 'w-24',
      acciones: 'w-24' // ✅ Compact action buttons
    }
    
    return (
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className={`w-full ${textSize} table-fixed`}>
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                {visibleColumns.codigoDescripcion && (
                  <th className={`${cellPadding} ${columnWidths.codigoDescripcion} text-left font-semibold text-gray-900 tracking-tight`}>
                    Código / Descripción
                  </th>
                )}
                {visibleColumns.unidad && (
                  <th className={`${cellPadding} ${columnWidths.unidad} text-center font-semibold text-gray-900 tracking-tight`}>
                    Unidad
                  </th>
                )}
                {visibleColumns.cantidad && (
                  <th className={`${cellPadding} ${columnWidths.cantidad} text-center font-semibold text-gray-900 tracking-tight`}>
                    Cantidad
                  </th>
                )}
                {visibleColumns.cantidadUnidad && (
                  <th className={`${cellPadding} ${columnWidths.cantidadUnidad} text-center font-semibold text-gray-900 tracking-tight`}>
                    Cant./Unidad
                  </th>
                )}
                {visibleColumns.cotizacion && (
                  <th className={`${cellPadding} ${columnWidths.cotizacion} text-center font-semibold text-gray-900 tracking-tight`}>
                    Cotización
                  </th>
                )}
                {visibleColumns.costo && (
                  <th className={`${cellPadding} ${columnWidths.costo} text-right font-semibold text-gray-900 tracking-tight`}>
                    Costo USD
                  </th>
                )}
                {visibleColumns.entrega && (
                  <th className={`${cellPadding} ${columnWidths.entrega} text-center font-semibold text-gray-900 tracking-tight`}>
                    Entrega
                  </th>
                )}
                {visibleColumns.origen && (
                  <th className={`${cellPadding} ${columnWidths.origen} text-center font-semibold text-gray-900 tracking-tight`}>
                    Origen
                  </th>
                )}
                {visibleColumns.estado && (
                  <th className={`${cellPadding} ${columnWidths.estado} text-center font-semibold text-gray-900 tracking-tight`}>
                    Estado
                  </th>
                )}
                {visibleColumns.pedidos && (
                  <th className={`${cellPadding} ${columnWidths.pedidos} text-center font-semibold text-gray-900 tracking-tight`}>
                    Pedidos
                  </th>
                )}
                {visibleColumns.verificado && (
                  <th className={`${cellPadding} ${columnWidths.verificado} text-center font-semibold text-gray-900 tracking-tight`}>
                    <CheckCircle className="h-4 w-4 mx-auto" />
                  </th>
                )}
                {visibleColumns.comentario && (
                  <th className={`${cellPadding} ${columnWidths.comentario} text-left font-semibold text-gray-900 tracking-tight`}>
                    Comentario
                  </th>
                )}
                {visibleColumns.equipo && (
                  <th className={`${cellPadding} ${columnWidths.equipo} text-center font-semibold text-gray-900 tracking-tight`}>
                    Equipo
                  </th>
                )}
                {visibleColumns.acciones && (
                  <th className={`${cellPadding} ${columnWidths.acciones} text-center font-semibold text-gray-900 tracking-tight`}>
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
          <tbody>
            <AnimatePresence>
            {filteredItems.map((item) => {
              const isEditingCantidad = editCantidadItemId === item.id
              const isEditingComentario = editComentarioItemId === item.id
              const costoTotal = calcularCostoItem(item)
              const resumenPedidos = calcularResumenPedidos(item)
              const clasesFilaPorEstado = getClasesFilaPorEstado(resumenPedidos.estado)

              return (
                <motion.tr
                   key={item.id}
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   transition={{ duration: 0.3 }}
                   className={`border-b hover:bg-gray-50 transition-colors ${
                     item.estado === 'rechazado' ? 'bg-red-50/50' : 
                     item.estado === 'aprobado' ? 'bg-green-50/50' : ''
                   } ${clasesFilaPorEstado}`}
                 >
                   {visibleColumns.codigoDescripcion && (
                     <td className={`${cellPadding} ${columnWidths.codigoDescripcion} text-gray-700`}>
                       <div className="space-y-1">
                         <div className="font-semibold text-gray-900 text-sm truncate" title={item.codigo}>
                           {item.codigo}
                         </div>
                         <div className="text-xs text-gray-600 truncate" title={item.descripcion}>
                           {item.descripcion}
                         </div>
                       </div>
                     </td>
                   )}
                   {visibleColumns.unidad && (
                     <td className={`${cellPadding} ${columnWidths.unidad} text-center text-gray-600`}>
                       {item.unidad}
                     </td>
                   )}
                   {visibleColumns.cantidad && (
                     <td className={`${cellPadding} ${columnWidths.cantidad}`}>
                      {isEditingCantidad ? (
                        <div className="flex gap-1 items-center justify-center">
                          <Input
                            type="number"
                            value={editCantidadValues[item.id] ?? item.cantidad?.toString() ?? ''}
                            onChange={(e) => setEditCantidadValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-16 h-7 text-center text-xs"
                          />
                          <Button size="sm" onClick={() => handleSaveCantidad(item.id)} className="h-7 w-7 p-0">
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditCantidadItemId(null)} className="h-7 w-7 p-0">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-center gap-1 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => editable && setEditCantidadItemId(item.id)}
                        >
                          {item.cantidad}
                          {editable && <Pencil className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      )}
                     </td>
                   )}
                   {visibleColumns.cantidadUnidad && (
                     <td className={`${cellPadding} ${columnWidths.cantidadUnidad}`}>
                      {isEditingCantidad ? (
                        <div className="flex gap-1 items-center justify-center">
                          <Input
                            type="number"
                            value={editCantidadValues[item.id] ?? item.cantidad?.toString() ?? ''}
                            onChange={(e) => setEditCantidadValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-12 h-7 text-center text-xs"
                          />
                          <span className="text-xs text-gray-500 mx-1">{item.unidad}</span>
                          <Button size="sm" onClick={() => handleSaveCantidad(item.id)} className="h-7 w-7 p-0">
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditCantidadItemId(null)} className="h-7 w-7 p-0">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-center gap-1 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => editable && setEditCantidadItemId(item.id)}
                        >
                          <span>{item.cantidad}</span>
                          <span className="text-xs text-gray-500">{item.unidad}</span>
                          {editable && <Pencil className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      )}
                     </td>
                   )}
                   {visibleColumns.cotizacion && (
                     <td className={`${cellPadding} ${columnWidths.cotizacion}`}>
                      <div className="flex justify-center">
                        <CotizacionCodigoSimple
                          cotizaciones={item.cotizaciones || []}
                          cotizacionSeleccionadaId={item.cotizacionSeleccionadaId || undefined}
                          interactive={false}
                          />
                      </div>
                     </td>
                   )}
                   {visibleColumns.costo && (
                     <td className={`${cellPadding} ${columnWidths.costo} text-right font-bold text-emerald-600`}>
                      {costoTotal > 0 ? formatCurrency(costoTotal) : '—'}
                    </td>
                   )}
                   {visibleColumns.entrega && (
                     <td className={`${cellPadding} ${columnWidths.entrega} text-center text-gray-700`}>
                      {item.cotizacionSeleccionada?.tiempoEntrega ? (
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{item.cotizacionSeleccionada.tiempoEntrega}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">—</span>
                      )}
                     </td>
                   )}
                   {visibleColumns.origen && (
                     <td className={`${cellPadding} ${columnWidths.origen}`}>
                      <div className="flex justify-center">
                        <Badge variant={getOrigenVariant(item.origen)} className="text-xs">
                          {labelOrigen[item.origen] || item.origen}
                        </Badge>
                      </div>
                    </td>
                   )}
                   {visibleColumns.estado && (
                     <td className={`${cellPadding} ${columnWidths.estado}`}>
                      <div className="flex justify-center">
                        <Badge variant={getStatusVariant(item.estado) as "default" | "secondary" | "outline"} className="text-xs">
                          {item.estado || 'Sin estado'}
                        </Badge>
                      </div>
                    </td>
                   )}
                   {visibleColumns.pedidos && (
                     <td className={`${cellPadding} ${columnWidths.pedidos}`}>
                      <div className="flex justify-center">
                        {resumenPedidos.totalPedidos > 0 ? (
                          <Badge 
                            variant="outline" 
                            className="text-blue-700 border-blue-200 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleNavigateToPedido(item)}
                          >
                            {getCodigoPedidoRelevante(resumenPedidos) || 'Sin código'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Disponible
                          </Badge>
                        )}
                      </div>
                    </td>
                   )}
                   {visibleColumns.verificado && (
                     <td className={`${cellPadding} ${columnWidths.verificado} text-center`}>
                      <div className="flex items-center justify-center space-x-1">
                        <Checkbox
                          checked={item.verificado}
                          disabled={!editable}
                          onCheckedChange={(val) => editable && handleVerificado(item, Boolean(val))}
                        />
                        {item.verificado && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                     </td>
                   )}
                   {visibleColumns.comentario && (
                     <td className={`${cellPadding} ${columnWidths.comentario}`}>
                      {isEditingComentario && editable ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            id={`comentario-${item.id}`}
                            value={editComentarioValues[item.id] ?? item.comentarioRevision ?? ''}
                            onChange={(e) => setEditComentarioValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveComentario(item.id)}
                            className="text-sm"
                            placeholder="Agregar comentario..."
                          />
                          <Button size="sm" onClick={() => handleSaveComentario(item.id)}>
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditComentarioItemId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => editable && setEditComentarioItemId(item.id)}
                          className={`text-sm cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors truncate ${
                            editable ? 'hover:text-blue-600' : ''
                          }`}
                          title={item.comentarioRevision || 'Click para agregar comentario'}
                        >
                          {item.comentarioRevision ? (
                            <span>{item.comentarioRevision}</span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              {editable ? 'Click para agregar...' : 'Sin comentario'}
                            </span>
                          )}
                          {editable && <Pencil className="h-3 w-3 ml-1 inline text-muted-foreground" />}
                        </div>
                      )}
                     </td>
                   )}
                   {visibleColumns.equipo && (
                     <td className={`${cellPadding} ${columnWidths.equipo} text-center`}>
                      {item.proyectoEquipo?.nombre ? (
                        <Badge variant="outline" className="text-xs">{item.proyectoEquipo.nombre}</Badge>
                      ) : (
                        <span className="text-gray-400 italic text-xs">—</span>
                      )}
                     </td>
                   )}
                   {visibleColumns.acciones && (
                     <td className={`${cellPadding} ${columnWidths.acciones} text-center`}>
                      <div className="flex justify-end gap-1 items-center">
                        {(item.estado !== 'rechazado') && (item.origen === 'cotizado' || item.origen === 'reemplazo') && (
                          !item.reemplazaProyectoEquipoItemId ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => setItemReemplazoOriginal(item)} 
                                  variant="outline" 
                                  disabled={!editable}
                                  className="h-7 w-7 p-0"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reemplazar ítem</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => setItemReemplazoReemplazo(item)} 
                                  variant="secondary" 
                                  disabled={!editable}
                                  className="h-7 w-7 p-0"
                                >
                                  <Recycle className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reemplazar reemplazo</TooltipContent>
                            </Tooltip>
                          )
                        )}
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!editable}
                              onClick={() => setDeleteTarget(item.id)}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar ítem</TooltipContent>
                        </Tooltip>
                      </div>
                     </td>
                   )}
                 </motion.tr>
              )
            })}
          </AnimatePresence>
          </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {renderHeader()}
      
      {isLoading ? (
        renderLoadingSkeleton()
      ) : filteredItems.length === 0 ? (
        renderEmptyState()
      ) : viewMode === 'cards' ? (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filteredItems.map((item) => {
              const isEditingCantidad = editCantidadItemId === item.id
              const isEditingComentario = editComentarioItemId === item.id
              const costoTotal = calcularCostoItem(item)

              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="h-full"
                >
                  <Card className={`h-full transition-all duration-200 hover:shadow-md ${
                    item.estado === 'rechazado' ? 'border-red-200 bg-red-50/50' : 
                    item.estado === 'aprobado' ? 'border-green-200 bg-green-50/50' : ''
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {item.codigo}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.descripcion}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            checked={item.verificado}
                            disabled={!editable}
                            onCheckedChange={(val) => editable && handleVerificado(item, Boolean(val))}
                          />
                          {item.verificado && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant={getStatusVariant(item.estado) as "default" | "secondary" | "outline"}>
                          {item.estado || 'Sin estado'}
                        </Badge>
                        <Badge variant={getOrigenVariant(item.origen)}>
                          {labelOrigen[item.origen] || item.origen}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Unidad</p>
                          <p className="font-medium">{item.unidad}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cantidad</p>
                          {isEditingCantidad ? (
                            <div className="flex gap-1 items-center mt-1">
                              <Input
                                type="number"
                                value={editCantidadValues[item.id] ?? item.cantidad?.toString() ?? ''}
                                onChange={(e) => setEditCantidadValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                className="h-8 text-sm"
                              />
                              <Button size="sm" onClick={() => handleSaveCantidad(item.id)}>
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditCantidadItemId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-1 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => editable && setEditCantidadItemId(item.id)}
                            >
                              {item.cantidad}
                              {editable && <Pencil className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Financial Info */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Cotización:</span>
                          <CotizacionCodigoSimple
                            cotizaciones={item.cotizaciones || []}
                            cotizacionSeleccionadaId={item.cotizacionSeleccionadaId || undefined}
                            interactive={false}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Costo Total:</span>
                          <span className="font-bold text-lg text-emerald-600">
                            {costoTotal > 0 ? formatCurrency(costoTotal) : '—'}
                          </span>
                        </div>
                        
                        {item.cotizacionSeleccionada?.tiempoEntrega && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Entrega:</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{item.cotizacionSeleccionada.tiempoEntrega}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Comments */}
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Comentario:</p>
                        {isEditingComentario && editable ? (
                          <div className="space-y-2">
                            <Input
                              id={`comentario-${item.id}`}
                              value={editComentarioValues[item.id] ?? item.comentarioRevision ?? ''}
                              onChange={(e) => setEditComentarioValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveComentario(item.id)}
                              placeholder="Agregar comentario..."
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveComentario(item.id)}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Guardar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditComentarioItemId(null)}>
                                <X className="h-3 w-3 mr-1" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => editable && setEditComentarioItemId(item.id)}
                            className={`text-sm p-2 rounded border min-h-[2.5rem] flex items-center ${
                              editable ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''
                            }`}
                          >
                            {item.comentarioRevision ? (
                              <span>{item.comentarioRevision}</span>
                            ) : (
                              <span className="text-muted-foreground italic">
                                {editable ? 'Click para agregar comentario...' : 'Sin comentario'}
                              </span>
                            )}
                            {editable && <Pencil className="h-3 w-3 ml-auto text-muted-foreground" />}
                          </div>
                        )}
                      </div>
                      
                      {/* Equipment Info */}
                      {item.proyectoEquipo?.nombre && (
                        <>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Equipo:</span>
                            <Badge variant="outline">{item.proyectoEquipo.nombre}</Badge>
                          </div>
                        </>
                      )}
                      
                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-2">
                          {(item.estado !== 'rechazado') && (item.origen === 'cotizado' || item.origen === 'reemplazo') && (
                            !item.reemplazaProyectoEquipoItemId ? (
                              <Button 
                                size="sm" 
                                onClick={() => setItemReemplazoOriginal(item)} 
                                variant="outline" 
                                disabled={!editable}
                                className="text-xs"
                              >
                                🔄 Reemplazar
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => setItemReemplazoReemplazo(item)} 
                                variant="secondary" 
                                disabled={!editable}
                                className="text-xs"
                              >
                                ♻️ Reemplazar
                              </Button>
                            )
                          )}
                        </div>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!editable}
                              onClick={() => setDeleteTarget(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar ítem</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

            )
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        renderListView()
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ítem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El ítem será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {itemReemplazoOriginal && (
        <ModalReemplazarItemDesdeCatalogo
          open={!!itemReemplazoOriginal}
          item={itemReemplazoOriginal}
          onClose={() => setItemReemplazoOriginal(null)}
          onUpdated={onCreated}
          listaId={listaId}
          proyectoId={proyectoId}
        />
      )}

      {itemReemplazoReemplazo && (
        <ModalReemplazarReemplazoDesdeCatalogo
          open={!!itemReemplazoReemplazo}
          item={itemReemplazoReemplazo}
          onClose={() => setItemReemplazoReemplazo(null)}
          onUpdated={onCreated}
          listaId={listaId}
          proyectoId={proyectoId}
        />
      )}
    </div>
  )
}
