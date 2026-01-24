// ===================================================
// 📁 Archivo: ListaEquipoItemList.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Lista de ítems técnicos de una lista de equipos con mejoras UX/UI
// ===================================================

'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, Trash2, CheckCircle2, X, Search, Filter, Package, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Grid3X3, List, Settings, Eye, EyeOff, RotateCcw, Recycle, Plus, ShoppingCart, FileText, Download } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ListaEquipoItem } from '@/types'
import { updateListaEquipoItem, deleteListaEquipoItem } from '@/lib/services/listaEquipoItem'
import { toast } from 'sonner'
import ModalReemplazarItemDesdeCatalogo from './ModalReemplazarItemDesdeCatalogo'
import ModalReemplazarReemplazoDesdeCatalogo from './ModalReemplazarReemplazoDesdeCatalogo'
import ModalAgregarItemDesdeCatalogo from './ModalAgregarItemDesdeCatalogo'
import ModalAgregarItemDesdeEquipo from './ModalAgregarItemDesdeEquipo'
import ModalImportarExcelLista from './ModalImportarExcelLista'
import { calcularCostoItem, calcularCostoTotal, formatCurrency } from '@/lib/utils/costoCalculations'
import { exportarListaEquipoAExcel } from '@/lib/utils/listaEquipoExcel'
// import { DebugLogger, useRenderTracker } from '@/components/debug/DebugLogger'
// import MotionRefDebugger from '@/components/debug/MotionRefDebugger'
// import RenderLoopDetector, { useRenderLoopDetection } from '@/components/debug/RenderLoopDetector'
// Debug imports removed to fix runtime errors
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
import {
  obtenerTodosLosPedidos,
  calcularDisponibilidad,
  generarResumenPedidos,
  obtenerColorDisponibilidad
} from '@/lib/utils/pedidoDisplayHelpers'

interface Props {
  listaId: string
  proyectoId: string
  items: ListaEquipoItem[]
  editable?: boolean
  onCreated?: () => void | Promise<void>
  onItemUpdated?: (itemId: string) => Promise<void>
  onItemsUpdated?: () => Promise<void>
  onDeleted?: () => void | Promise<void>
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


export default function ListaEquipoItemList({ listaId, proyectoId, items, editable = true, onCreated, onItemUpdated, onItemsUpdated, onDeleted, onRefresh }: Props) {
  const router = useRouter()
  const [editCantidadItemId, setEditCantidadItemId] = useState<string | null>(null)
  const [editCantidadValues, setEditCantidadValues] = useState<Record<string, string>>({})
  const [editComentarioItemId, setEditComentarioItemId] = useState<string | null>(null)
  const [editComentarioValues, setEditComentarioValues] = useState<Record<string, string>>({})
  const [itemReemplazoOriginal, setItemReemplazoOriginal] = useState<ListaEquipoItem | null>(null)
  const [itemReemplazoReemplazo, setItemReemplazoReemplazo] = useState<ListaEquipoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list') // ✅ Default to list view
  const [showModalAgregarCatalogo, setShowModalAgregarCatalogo] = useState(false)
  const [showModalAgregarEquipo, setShowModalAgregarEquipo] = useState(false)
  const [showModalImportarExcel, setShowModalImportarExcel] = useState(false)
  
  const [visibleColumns, setVisibleColumns] = useState({
    codigoDescripcion: true, // ✅ Combined column
    unidad: false, // ✅ Oculta cuando está activa la unificada
    cantidad: false, // ✅ Oculta cuando está activa la unificada
    cantidadUnidad: true, // ✅ Nueva columna unificada (activada por defecto)
    pedidos: true, // ✅ Nueva columna: estado de pedidos
    cotizacion: true,
    costo: true,
    entrega: false,
    origen: true,
    estado: true,
    verificado: true,
    comentario: true, // ✅ Visible by default
    pedidosLinks: true, // ✅ Nueva columna de pedidos (links)
    equipo: false,
    acciones: true
  })

  // 📊 Memoize pedido summaries to prevent infinite loops
  const itemsWithResumen = useMemo(() => {
    return items.map(item => ({
      ...item,
      resumen: calcularResumenPedidos(item)
    }))
  }, [items])

  // 📊 Calculate statistics using memoized summaries
  const stats = useMemo(() => {
    const total = itemsWithResumen.length
    const verificados = itemsWithResumen.filter(i => i.verificado).length
    const sinPedidos = itemsWithResumen.filter(i => i.resumen.estado === 'sin_pedidos').length
    const enPedido = itemsWithResumen.filter(i => 
      i.resumen.estado === 'pendiente' || i.resumen.estado === 'parcial'
    ).length
    const conCotizacion = itemsWithResumen.filter(i => 
      i.cotizacionSeleccionada && i.cotizacionSeleccionada.precioUnitario && i.cotizacionSeleccionada.precioUnitario > 0
    ).length
    // ✅ Use itemsWithResumen instead of items to avoid duplicate dependency
    const costoTotal = calcularCostoTotal(itemsWithResumen)
    
    return { total, verificados, sinPedidos, enPedido, conCotizacion, costoTotal }
  }, [itemsWithResumen])

  // 🔍 Filter and search items using memoized summaries
  const filteredItems = useMemo(() => {
    let filtered = [...itemsWithResumen]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [itemsWithResumen, searchTerm])

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
        onDeleted?.()
      }
    } catch {
      toast.error('❌ No se pudo eliminar el ítem')
    } finally {
      setDeleteTarget(null)
    }
  }

  // 🔗 Función para navegar al pedido
  const handleNavigateToPedido = (item: ListaEquipoItem, resumenPedidos: ReturnType<typeof calcularResumenPedidos>) => {
    const pedidoId = getIdPedidoRelevante(resumenPedidos)

    if (pedidoId) {
      router.push(`/proyectos/${proyectoId}/pedidos-equipo/${pedidoId}`)
    } else {
      toast.error('No se encontró un pedido asociado a este ítem')
    }
  }

  // 📊 Handle Excel export
  const handleExportExcel = useCallback(async () => {
    try {
      if (items.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      // Get lista information - if not available in items, fetch it
      let listaNombre = items[0]?.lista?.nombre || 'Lista de Equipos'
      let listaCodigo = items[0]?.lista?.codigo || 'SIN-CODIGO'

      // If lista info is not available in items, try to fetch it
      if (!items[0]?.lista?.codigo && listaId) {
        try {
          const response = await fetch(`/api/listas-equipo/${listaId}`)
          if (response.ok) {
            const listaData = await response.json()
            listaNombre = listaData.nombre || listaNombre
            listaCodigo = listaData.codigo || listaCodigo
          }
        } catch (error) {
          console.warn('Could not fetch lista details:', error)
        }
      }

      exportarListaEquipoAExcel(items, listaNombre, listaCodigo)
      toast.success('Lista exportada a Excel correctamente')
    } catch (error) {
      console.error('Error exportando a Excel:', error)
      toast.error('Error al exportar la lista a Excel')
    }
  }, [items, listaId])

  // 🎨 Render header with search and actions only
  const renderHeader = () => (
    <div className="mb-6">

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
         

         
         {/* Add Items Buttons */}
         {editable && (
           <div className="flex gap-2">
             <Button
               variant="default"
               size="sm"
               onClick={() => setShowModalAgregarCatalogo(true)}
               className="h-8 px-3"
             >
               <Plus className="h-4 w-4 mr-1" />
               Desde Catálogo
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={() => setShowModalAgregarEquipo(true)}
               className="h-8 px-3"
             >
               <ShoppingCart className="h-4 w-4 mr-1" />
               + Desde Cotización
             </Button>
             <Button
               variant="default"
               size="sm"
               onClick={() => setShowModalImportarExcel(true)}
               className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
             >
               <FileText className="h-4 w-4 mr-2" />
               Importar Excel
             </Button>
             <Button
               variant="default"
               size="sm"
               onClick={handleExportExcel}
               disabled={items.length === 0}
               className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
             >
               <Download className="h-4 w-4 mr-2" />
               Exportar Excel
             </Button>
           </div>
         )}
         
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
                     pedidos: 'Pedidos',
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
    </div>
  )

  // 🎨 Render empty state
  const renderEmptyState = () => (
    <div className="text-center py-12">
      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No hay ítems técnicos</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm 
          ? 'No se encontraron ítems que coincidan con la búsqueda.'
          : 'Comienza agregando ítems técnicos a esta lista de equipos.'}
      </p>
      {searchTerm && (
        <Button 
          variant="outline" 
          onClick={() => {
            setSearchTerm('')
          }}
        >
          Limpiar búsqueda
        </Button>
      )}
    </div>
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

  // 🎨 Render list view (table) - Compact layout
  const renderListView = () => {
    const cellPadding = 'px-2 py-1.5'
    const textSize = 'text-xs'

    // ✅ Define optimized column widths for compact layout
    const columnWidths = {
      codigoDescripcion: 'w-48',
      unidad: 'w-16',
      cantidad: 'w-20',
      cantidadUnidad: 'w-28',
      pedidos: 'w-24',
      cotizacion: 'w-28',
      costo: 'w-24',
      entrega: 'w-20',
      origen: 'w-20',
      estado: 'w-24',
      pedidosLinks: 'w-32',
      verificado: 'w-12',
      comentario: 'w-56',
      equipo: 'w-24',
      acciones: 'w-24'
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
                {visibleColumns.pedidos && (
                  <th className={`${cellPadding} ${columnWidths.pedidos} text-center font-semibold text-gray-900 tracking-tight`}>
                    Pedidos
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
            {filteredItems.map((item) => {
              const isEditingCantidad = editCantidadItemId === item.id
              const isEditingComentario = editComentarioItemId === item.id
              const costoTotal = calcularCostoItem(item)
              const resumenPedidos = item.resumen
              const clasesFilaPorEstado = getClasesFilaPorEstado(resumenPedidos.estado)

              // 🔍 Debug: Log each render of motion.tr
                // console.log('🔍 ListaEquipoItemList - Rendering motion.tr for item:', item.id, { estado: item.estado, resumenPedidos })

              return (
                <tr
                   key={item.id}
                   className={`border-b hover:bg-gray-50 transition-colors ${
                     item.estado === 'rechazado' ? 'bg-red-50/30' :
                     item.estado === 'aprobado' ? 'bg-blue-50/30' : ''
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
                   {visibleColumns.pedidos && (
                     <td className={`${cellPadding} ${columnWidths.pedidos} text-center`}>
                       {(() => {
                         const cantidadPedida = item.cantidadPedida || 0
                         const cantidadTotal = item.cantidad || 0

                         if (cantidadPedida === 0) {
                           return <Badge variant="outline" className="text-xs text-gray-500">Sin pedidos</Badge>
                         } else if (cantidadPedida >= cantidadTotal) {
                           return <Badge variant="default" className="text-xs bg-blue-600">Completo</Badge>
                         } else {
                           return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">{cantidadPedida}/{cantidadTotal}</Badge>
                         }
                       })()}
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
                      <div className="flex flex-col gap-1 min-w-0">
                        {(() => {
                          const pedidos = obtenerTodosLosPedidos(item)
                          
                          if (pedidos.length === 0) {
                            return (
                               <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                 Disponible
                               </Badge>
                             )
                          }
                          
                          // Mostrar todos los pedidos directamente
                          return (
                            <div className="flex flex-col gap-1">
                              {pedidos.map((codigo, index) => (
                                <Tooltip key={index}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-1 text-xs hover:bg-blue-50 justify-start min-w-0"
                                      onClick={() => {
                                        // Navegar al pedido específico
                                        const pedidoItem = item.pedidos?.find(p => p.pedido?.codigo === codigo)
                                        if (pedidoItem?.pedido?.id) {
                                          router.push(`/proyectos/${proyectoId}/pedidos-equipo/${pedidoItem.pedido.id}`)
                                        }
                                      }}
                                    >
                                      <Badge variant="default" className="text-[10px] truncate px-1.5 py-0.5">
                                         {codigo}
                                       </Badge>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Click para ver pedido {codigo}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          )
                        })()
                        }
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
                          !item.reemplazaProyectoEquipoCotizadoItemId ? (
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
                   </tr>
               )
                 })
               }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
              const isEditingCantidad = editCantidadItemId === item.id
              const isEditingComentario = editComentarioItemId === item.id
              const costoTotal = calcularCostoItem(item)

              return (
                <div
                  key={item.id}
                  className="h-full"
                >
                  <Card className={`h-full transition-all duration-200 hover:shadow-md ${
                    item.estado === 'rechazado' ? 'border-red-200 bg-red-50/30' :
                    item.estado === 'aprobado' ? 'border-blue-200 bg-blue-50/30' : ''
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
                            !item.reemplazaProyectoEquipoCotizadoItemId ? (
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
                </div>
              )
            })}
          </div>
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

      {/* Modales de Agregar Items */}
      <ModalAgregarItemDesdeCatalogo
        isOpen={showModalAgregarCatalogo}
        onClose={() => setShowModalAgregarCatalogo(false)}
        listaId={listaId}
        proyectoId={proyectoId}
        onSuccess={() => {
          setShowModalAgregarCatalogo(false)
          onCreated?.()
        }}
      />

      <ModalAgregarItemDesdeEquipo
        isOpen={showModalAgregarEquipo}
        onClose={() => setShowModalAgregarEquipo(false)}
        listaId={listaId}
        proyectoId={proyectoId}
        onSuccess={() => {
          setShowModalAgregarEquipo(false)
          onCreated?.()
        }}
      />

      <ModalImportarExcelLista
        isOpen={showModalImportarExcel}
        onClose={() => setShowModalImportarExcel(false)}
        listaId={listaId}
        proyectoId={proyectoId}
        onSuccess={() => {
          setShowModalImportarExcel(false)
          onCreated?.()
        }}
      />
    </div>
  )
}
