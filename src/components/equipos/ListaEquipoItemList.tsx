// ===================================================
// 📁 Archivo: ListaEquipoItemList.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Lista de ítems técnicos de una lista de equipos con mejoras UX/UI
// ===================================================

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil, Trash2, Search, Package, Clock, AlertTriangle, CheckCircle, XCircle, Grid3X3, List, RotateCcw, Plus, ShoppingCart, FileText, Download, Tag, ChevronDown, Wrench, Trophy, Layers, MoreHorizontal, Lock, Zap, GripVertical } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ListaEquipoItem } from '@/types'
import { updateListaEquipoItem, reordenarListaEquipoItems } from '@/lib/services/listaEquipoItem'
import { toast } from 'sonner'
import ModalReemplazarEquipo from './ModalReemplazarEquipo'
import ModalAgregarItemDesdeCatalogo from './ModalAgregarItemDesdeCatalogo'
import ModalAgregarItemDesdeEquipo from './ModalAgregarItemDesdeEquipo'
import ModalImportarExcelLista from './ModalImportarExcelLista'
import ModalAgregarItemLibre from './ModalAgregarItemLibre'
import ModalEditarListaItem from './ModalEditarListaItem'
import TipoItemBadge from '@/components/shared/TipoItemBadge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { calcularCostoItem, calcularCostoTotal, formatCurrency } from '@/lib/utils/costoCalculations'
import { exportarListaEquipoAExcel } from '@/lib/utils/listaEquipoExcel'
// import { DebugLogger, useRenderTracker } from '@/components/debug/DebugLogger'
// import MotionRefDebugger from '@/components/debug/MotionRefDebugger'
// import RenderLoopDetector, { useRenderLoopDetection } from '@/components/debug/RenderLoopDetector'
// Debug imports removed to fix runtime errors
import { useDeleteWithValidation } from '@/hooks/useDeleteWithValidation'
import { DeleteWithValidationDialog } from '@/components/DeleteWithValidationDialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CotizacionCodigoSimple } from './CotizacionSelector'
import CotizacionSelectorModal from './CotizacionSelectorModal'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
import { getItemEditPermissions, type EstadoListaEquipo } from '@/lib/utils/flujoListaEquipo'

interface Props {
  listaId: string
  proyectoId: string
  listaCodigo?: string
  listaNombre?: string
  listaEstado?: string
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
  nuevo: 'no cotizado',
  reemplazo: 'reemplazo',
}

// ✅ Utility functions for styling (formatCurrency moved to utils/costoCalculations.ts)

const getStatusVariant = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'aprobado': return 'default'
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


function SortableItemRow({ id, disabled, showHandle, rowClassName, children }: {
  id: string
  disabled: boolean
  showHandle: boolean
  rowClassName?: string
  children: (dragHandle: React.ReactNode) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const dragHandle = showHandle ? (
    <td className="w-5 px-1" onClick={(e) => e.stopPropagation()}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
        <GripVertical className="h-3.5 w-3.5 text-gray-400" />
      </div>
    </td>
  ) : null
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={rowClassName || 'border-b hover:bg-gray-50 transition-colors group'}
    >
      {children(dragHandle)}
    </tr>
  )
}

export default function ListaEquipoItemList({ listaId, proyectoId, listaCodigo, listaNombre, listaEstado, items, editable = true, onCreated, onItemUpdated, onItemsUpdated, onDeleted, onRefresh }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const [localItems, setLocalItems] = useState<ListaEquipoItem[]>([])
  useEffect(() => {
    setLocalItems([...items].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)))
  }, [items])
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const rol = (session?.user as any)?.role || ''
  const puedeSeleccionarCotizacion = ['admin', 'gerente', 'gestor', 'coordinador'].includes(rol)
  const { canVerify } = getItemEditPermissions((listaEstado as EstadoListaEquipo) ?? 'borrador')
  const [selectorItem, setSelectorItem] = useState<ListaEquipoItem | null>(null)
  const [editComentarioItemId, setEditComentarioItemId] = useState<string | null>(null)
  const [editComentarioValues, setEditComentarioValues] = useState<Record<string, string>>({})
  const [editingItem, setEditingItem] = useState<ListaEquipoItem | null>(null)
  const [itemReemplazo, setItemReemplazo] = useState<ListaEquipoItem | null>(null)
  const deleteValidation = useDeleteWithValidation({
    entity: 'listaEquipoItem',
    deleteEndpoint: (id) => `/api/lista-equipo-item/${id}`,
    onSuccess: () => {
      toast.success('Item eliminado')
      onItemsUpdated?.()
      onDeleted?.()
    },
    onError: (msg) => toast.error(msg),
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')
  const [isLoading, setIsLoading] = useState(false)

  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list') // ✅ Default to list view
  const [showModalAgregarCatalogo, setShowModalAgregarCatalogo] = useState(false)
  const [showModalAgregarEquipo, setShowModalAgregarEquipo] = useState(false)
  const [showModalImportarExcel, setShowModalImportarExcel] = useState(false)
  const [showModalItemLibre, setShowModalItemLibre] = useState(false)
  const [tipoItemLibre, setTipoItemLibre] = useState<'consumible' | 'servicio'>('consumible')
  

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
    const noCotizados = itemsWithResumen.filter(i => i.origen === 'nuevo').length
    const conMayorCantidad = itemsWithResumen.filter(i =>
      i.origen === 'cotizado' &&
      i.proyectoEquipoItem?.cantidad != null &&
      i.cantidad > i.proyectoEquipoItem.cantidad
    ).length

    // Cobertura de cotizaciones (ideal: 3 por item)
    const MIN_COT = 3
    const coberturaBuena = itemsWithResumen.filter(i => (i.cotizaciones?.length || 0) >= MIN_COT).length
    const coberturaParcial = itemsWithResumen.filter(i => {
      const n = i.cotizaciones?.length || 0
      return n > 0 && n < MIN_COT
    }).length
    const sinCotizaciones = itemsWithResumen.filter(i => (i.cotizaciones?.length || 0) === 0).length

    return { total, verificados, sinPedidos, enPedido, conCotizacion, costoTotal, noCotizados, conMayorCantidad, coberturaBuena, coberturaParcial, sinCotizaciones }
  }, [itemsWithResumen])

  const categoriasUnicas = useMemo(() =>
    [...new Set(items.map(i => i.categoria || 'SIN-CATEGORIA'))].sort()
  , [items])

  // 🔍 Filter and search items using memoized summaries
  const canDragItems = !searchTerm && categoriaFiltro === '__ALL__' && viewMode === 'list'

  const filteredItems = useMemo(() => {
    // Build order map from localItems for drag ordering
    const orderMap = new Map(localItems.map((item, idx) => [item.id, idx]))

    let filtered = [...itemsWithResumen]

    // Category filter
    if (categoriaFiltro !== '__ALL__') {
      filtered = filtered.filter(item => (item.categoria || 'SIN-CATEGORIA') === categoriaFiltro)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item =>
        item.codigo.toLowerCase().includes(term) ||
        item.descripcion.toLowerCase().includes(term) ||
        item.marca?.toLowerCase().includes(term) ||
        item.categoria?.toLowerCase().includes(term)
      )
    }

    // Sort: use localItems order when dragging, else by orden field
    return filtered.sort((a, b) => {
      if (canDragItems) {
        return (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
      }
      return (a.orden ?? 0) - (b.orden ?? 0) || a.createdAt.localeCompare(b.createdAt)
    })
  }, [itemsWithResumen, searchTerm, categoriaFiltro, localItems, canDragItems])

  const handleDragEndItems = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = localItems.findIndex(i => i.id === active.id)
    const newIdx = localItems.findIndex(i => i.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordenados = arrayMove(localItems, oldIdx, newIdx).map((item, idx) => ({ ...item, orden: idx }))
    setLocalItems(reordenados)
    try {
      await reordenarListaEquipoItems(reordenados.map(i => ({ id: i.id, orden: i.orden })))
    } catch {
      toast.error('Error al guardar el orden')
      setLocalItems([...items].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)))
    }
  }

  const handleSaveComentario = async (itemId: string) => {
    try {
      await updateListaEquipoItem(itemId, {
        comentarioRevision: editComentarioValues[itemId] || '',
      })
      toast.success('Comentario guardado')
      setEditComentarioItemId(null)
      // No borrar editComentarioValues: se mantiene como optimistic cache
      // hasta que el parent refresque los items con el valor actualizado
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
        // ✅ Focus textarea inside Popover after render
        setTimeout(() => {
          const textarea = document.querySelector<HTMLTextAreaElement>(`#comentario-${item.id}`) ||
                           document.querySelector<HTMLTextAreaElement>(`#comentario-card-${item.id}`)
          if (textarea) {
            textarea.focus()
            textarea.select()
          }
        }, 150)
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

  // 🔗 Función para navegar al pedido
  const handleNavigateToPedido = (item: ListaEquipoItem, resumenPedidos: ReturnType<typeof calcularResumenPedidos>) => {
    const pedidoId = getIdPedidoRelevante(resumenPedidos)

    if (pedidoId) {
      router.push(`/proyectos/${proyectoId}/pedidos/${pedidoId}`)
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

      await exportarListaEquipoAExcel(items, listaNombre, listaCodigo)
      toast.success('Lista exportada a Excel correctamente')
    } catch (error) {
      console.error('Error exportando a Excel:', error)
      toast.error('Error al exportar la lista a Excel')
    }
  }, [items, listaId])

  // 🎨 Render header with search and actions only
  const renderHeader = () => (
    <div className="mb-3">
      {/* Compact toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search - only show if more than 3 items */}
        {items.length > 3 && (
          <div className="relative max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs w-48"
            />
          </div>
        )}

        {/* Category filter */}
        {categoriasUnicas.length > 1 && (
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="w-[150px] h-7 text-xs">
              <Tag className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue>
                {categoriaFiltro === '__ALL__' ? 'Categoría' : categoriaFiltro}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas las categorías</SelectItem>
              {categoriasUnicas.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{filteredItems.length} de {items.length}</span>
          <span className={`font-medium ${stats.verificados === stats.total ? 'text-green-600' : 'text-muted-foreground'}`}>
            {stats.verificados}/{stats.total} verificados
          </span>
          {stats.noCotizados > 0 && (
            <span className="text-amber-600 font-medium">{stats.noCotizados} no cotizado{stats.noCotizados > 1 ? 's' : ''}</span>
          )}
          {stats.conMayorCantidad > 0 && (
            <span className="text-amber-600 font-medium flex items-center gap-0.5">
              <AlertTriangle className="h-3 w-3" />
              {stats.conMayorCantidad} con mayor cant.
            </span>
          )}
          {stats.total > 0 && (
            <span className={`font-medium flex items-center gap-0.5 ${
              stats.coberturaBuena === stats.total ? 'text-green-600' :
              stats.sinCotizaciones > 0 ? 'text-red-500' : 'text-amber-600'
            }`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                stats.coberturaBuena === stats.total ? 'bg-green-500' :
                stats.sinCotizaciones > 0 ? 'bg-red-500' : 'bg-amber-500'
              }`} />
              {stats.coberturaBuena}/{stats.total} con 3+ cot.
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Add Items Buttons */}
        {editable && (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 px-2 text-xs bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar item
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setTimeout(() => setShowModalAgregarCatalogo(true), 0)}>
                  <Package className="h-3.5 w-3.5 mr-2 text-blue-600" />
                  Desde catalogo
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTimeout(() => { setTipoItemLibre('consumible'); setShowModalItemLibre(true) }, 0)}>
                  <Tag className="h-3.5 w-3.5 mr-2 text-orange-600" />
                  Consumible / material libre
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTimeout(() => { setTipoItemLibre('servicio'); setShowModalItemLibre(true) }, 0)}>
                  <Wrench className="h-3.5 w-3.5 mr-2 text-purple-600" />
                  Servicio / trabajo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModalAgregarEquipo(true)}
              className="h-7 px-2 text-xs"
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Cotización
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModalImportarExcel(true)}
              className="h-7 px-2 text-xs"
            >
              <FileText className="h-3 w-3 mr-1" />
              Importar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={items.length === 0}
              className="h-7 px-2 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Exportar
            </Button>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-6 px-2 rounded-r-none"
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="h-6 px-2 rounded-l-none"
          >
            <Grid3X3 className="h-3 w-3" />
          </Button>
        </div>

      </div>
    </div>
  )

  // 🎨 Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
      <Package className="h-10 w-10 text-gray-300 mb-2" />
      <p className="text-sm text-muted-foreground mb-1">
        {searchTerm ? 'No se encontraron ítems' : 'Sin ítems técnicos'}
      </p>
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchTerm('')}
          className="h-7 text-xs"
        >
          Limpiar búsqueda
        </Button>
      )}
    </div>
  )

  // 🎨 Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="border rounded-lg">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-2 border-b last:border-0">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )

  // 🎨 Render list view (table) - Compact layout
  const renderListView = () => {
    const cellPadding = 'px-2 py-1.5'
    const textSize = 'text-xs'

    // ✅ Define optimized column widths for compact layout
    const columnWidths = {
      codigoDescripcion: 'min-w-[120px]',
      marca: 'w-24',
      cantidadUnidad: 'w-24',
      cotizacion: 'w-28',
      costoEntrega: 'w-24',
      origen: 'w-16',
      estado: 'w-20',
      pedidosLinks: 'w-28',
      verificadoComentario: 'min-w-[120px]',
      acciones: 'w-10'
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${textSize}`}>
            <thead>
              <tr className="bg-gray-50 border-b">
                {canDragItems && <th className="w-5 p-0" />}
                <th className={`${cellPadding} ${columnWidths.codigoDescripcion} text-left font-semibold text-gray-700`}>
                  Código / Descripción
                </th>
                <th className={`${cellPadding} ${columnWidths.marca} text-left font-semibold text-gray-700`}>
                  Marca
                </th>
                <th className={`${cellPadding} ${columnWidths.cantidadUnidad} text-center font-semibold text-gray-700`}>
                  Cant./Und
                </th>
                <th className={`${cellPadding} ${columnWidths.cotizacion} text-center font-semibold text-gray-700`}>
                  Cotización
                </th>
                <th className={`${cellPadding} ${columnWidths.costoEntrega} text-right font-semibold text-gray-700`}>
                  Costo
                </th>
                <th className={`${cellPadding} ${columnWidths.origen} text-center font-semibold text-gray-700`}>
                  Origen
                </th>
                <th className={`${cellPadding} ${columnWidths.estado} text-center font-semibold text-gray-700`}>
                  Estado
                </th>
                <th className={`${cellPadding} ${columnWidths.pedidosLinks} text-center font-semibold text-gray-700`}>
                  Pedidos
                </th>
                <th className={`${cellPadding} ${columnWidths.verificadoComentario} text-left font-semibold text-gray-700`}>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Rev.</span>
                  </div>
                </th>
                <th className={`${cellPadding} ${columnWidths.acciones} text-center font-semibold text-gray-700`}></th>
              </tr>
            </thead>
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndItems}>
            <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <tbody>
            {filteredItems.map((item) => {
              const isEditingComentario = editComentarioItemId === item.id
              const costoTotal = calcularCostoItem(item)
              const resumenPedidos = item.resumen
              const clasesFilaPorEstado = getClasesFilaPorEstado(resumenPedidos.estado)

              const rowIndex = filteredItems.indexOf(item)
              return (
                <SortableItemRow
                   key={item.id}
                   id={item.id}
                   disabled={!canDragItems}
                   showHandle={canDragItems}
                   rowClassName={`border-b hover:bg-gray-50 transition-colors group ${
                     rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                   }`}
                 >
                 {(dragHandle) => (<>
                   {dragHandle}
                   <td className={`${cellPadding} ${columnWidths.codigoDescripcion} text-gray-700`}>
                       <div className="space-y-0.5">
                         <div className="flex items-center gap-1.5">
                           <div className="font-medium text-gray-900 text-xs" title={item.codigo}>
                             {item.codigo}
                           </div>
                           <TipoItemBadge tipoItem={(item as any).tipoItem} catalogoEquipoId={item.catalogoEquipoId} />
                         </div>
                         <div className="text-[11px] text-gray-500 line-clamp-2 leading-tight" title={item.descripcion}>
                           {item.descripcion}
                         </div>
                         {item.categoria && item.categoria !== 'SIN-CATEGORIA' && (
                           <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0 rounded bg-violet-50 text-violet-600 border border-violet-200">
                             <Tag className="h-2 w-2" />{item.categoria}
                           </span>
                         )}
                         {(() => {
                           const grupoNombre = (item as any).proyectoEquipo?.nombre
                             || item.proyectoEquipoItem?.proyectoEquipoCotizado?.nombre
                           return grupoNombre ? (
                             <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0 rounded bg-amber-50 text-amber-600 border border-amber-200">
                               <Layers className="h-2 w-2" />{grupoNombre}
                             </span>
                           ) : null
                         })()}
                       </div>
                   </td>
                   <td className={`${cellPadding} ${columnWidths.marca}`}>
                       <span className="text-gray-600 line-clamp-1" title={item.marca || ''}>
                         {item.marca || '-'}
                       </span>
                   </td>
                   <td className={`${cellPadding} ${columnWidths.cantidadUnidad}`}>
                      <div>
                        <div className="flex items-center justify-center gap-1 font-medium">
                          <span>{item.cantidad}</span>
                          <span className="text-xs text-gray-500">{item.unidad}</span>
                        </div>
                        {item.origen === 'cotizado' && item.proyectoEquipoItem?.cantidad != null && item.cantidad > item.proyectoEquipoItem.cantidad && (
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600">Cotizado: {item.proyectoEquipoItem.cantidad}</span>
                          </div>
                        )}
                      </div>
                   </td>
                   <td className={`${cellPadding} ${columnWidths.cotizacion}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-start justify-center gap-1">
                          {(() => {
                            const n = item.cotizaciones?.length || 0
                            const color = n === 0 ? 'bg-red-500' : n < 3 ? 'bg-amber-500' : 'bg-green-500'
                            const label = `${n}/3 cotizaciones`
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${color}`} />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">{label}</TooltipContent>
                              </Tooltip>
                            )
                          })()}
                          <CotizacionCodigoSimple
                            cotizaciones={item.cotizaciones || []}
                            cotizacionSeleccionadaId={item.cotizacionSeleccionadaId || undefined}
                            interactive={false}
                          />
                        </div>
                      </div>
                   </td>
                   <td className={`${cellPadding} ${columnWidths.costoEntrega} text-right`}>
                      <div className="font-medium text-gray-900">
                        {costoTotal > 0 ? formatCurrency(costoTotal) : '—'}
                      </div>
                      {/* Indicador de precio de referencia del catálogo */}
                      {costoTotal === 0 && item.catalogoEquipo?.precioLogistica && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-end gap-0.5 text-[10px] text-amber-600 cursor-help">
                              <Zap className="h-2.5 w-2.5" />
                              <span>Ref: {formatCurrency(item.catalogoEquipo.precioLogistica * item.cantidad)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs max-w-[200px]">
                            <p className="font-medium">Precio de referencia (catálogo)</p>
                            <p className="text-muted-foreground text-[10px]">Último precio logístico: {formatCurrency(item.catalogoEquipo.precioLogistica)} × {item.cantidad}</p>
                            {item.catalogoEquipo?.fechaActualizacion && (
                              <p className="text-muted-foreground text-[10px] mt-0.5">
                                Actualizado: {new Date(item.catalogoEquipo.fechaActualizacion).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </p>
                            )}
                            <p className="text-amber-600 text-[10px] mt-1">Pendiente de cotizar con proveedor.</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {(item.tiempoEntrega || item.tiempoEntregaDias) && (
                        <div className="text-[10px] text-muted-foreground">
                          {item.tiempoEntrega || `${item.tiempoEntregaDias}d`}
                        </div>
                      )}
                   </td>
                   <td className={`${cellPadding} ${columnWidths.origen} text-center`}>
                      {item.desgloseDeProyectoEquipoCotizadoItem ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] text-purple-600 cursor-help border-b border-dotted border-purple-400 inline-flex items-center gap-0.5">
                              <Layers className="h-2.5 w-2.5" />
                              desglose
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-[10px] font-semibold mb-0.5">Parte del desglose de:</p>
                            <p className="text-[10px]">
                              <span className="font-medium">{item.desgloseDeProyectoEquipoCotizadoItem.codigo}</span> — {item.desgloseDeProyectoEquipoCotizadoItem.descripcion}
                            </p>
                            {item.desgloseDeProyectoEquipoCotizadoItem.proyectoEquipoCotizado?.nombre && (
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                Grupo: {item.desgloseDeProyectoEquipoCotizadoItem.proyectoEquipoCotizado.nombre}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (item.origen === 'cotizado' || item.origen === 'reemplazo') && item.proyectoEquipoItem ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`text-[11px] text-muted-foreground cursor-help border-b border-dotted border-gray-400`}>
                              {labelOrigen[item.origen] || item.origen}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-[10px] font-semibold mb-0.5">
                              {item.origen === 'reemplazo' ? 'Reemplaza a:' : 'Equipo cotizado:'}
                            </p>
                            <p className="text-[10px]">
                              <span className="font-medium">{item.proyectoEquipoItem.codigo}</span> — {item.proyectoEquipoItem.descripcion}
                            </p>
                            {item.proyectoEquipoItem.proyectoEquipoCotizado?.nombre && (
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                Grupo: {item.proyectoEquipoItem.proyectoEquipoCotizado.nombre}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className={`text-[11px] ${item.origen === 'nuevo' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {labelOrigen[item.origen] || item.origen}
                        </span>
                      )}
                   </td>
                   <td className={`${cellPadding} ${columnWidths.estado} text-center`}>
                      <span className={`text-[11px] ${
                        item.estado === 'aprobado' ? 'text-green-600' :
                        'text-muted-foreground'
                      }`}>
                        {item.estado || 'sin estado'}
                      </span>
                   </td>
                   <td className={`${cellPadding} ${columnWidths.pedidosLinks}`}>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {(() => {
                          const pedidos = obtenerTodosLosPedidos(item)
                          const cantidadPedida = item.cantidadPedida || 0
                          const cantidadTotal = item.cantidad || 0
                          if (pedidos.length === 0 && cantidadPedida === 0) {
                            return <span className="text-[10px] text-muted-foreground">—</span>
                          }
                          return (
                            <>
                              {cantidadPedida > 0 && (
                                <span className={`text-[9px] font-medium ${cantidadPedida >= cantidadTotal ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {cantidadPedida >= cantidadTotal ? 'Completo' : `${cantidadPedida}/${cantidadTotal} ped.`}
                                </span>
                              )}
                              {pedidos.map((codigo, index) => {
                                const pedidoItem = item.pedidos?.find(p => p.pedido?.codigo === codigo)
                                const pedidoId = pedidoItem?.pedido?.id
                                return (
                                  <Tooltip key={index}>
                                    <TooltipTrigger asChild>
                                      {pedidoId ? (
                                        <a
                                          href={`/proyectos/${proyectoId}/pedidos/${pedidoId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] font-mono text-blue-600/80 hover:text-blue-700 hover:underline text-left truncate"
                                        >
                                          {codigo}
                                        </a>
                                      ) : (
                                        <span className="text-[10px] font-mono text-muted-foreground truncate">{codigo}</span>
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Abrir pedido {codigo} en nueva pestaña</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              })}
                            </>
                          )
                        })()}
                      </div>
                   </td>
                   <td className={`${cellPadding} ${columnWidths.verificadoComentario}`}>
                      {(listaEstado === 'borrador' || listaEstado === 'por_revisar') ? (
                        /* Borrador: nota editable sin verificar. Por Revisar: checkbox + comentario para coordinador */
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            <Checkbox
                              checked={item.verificado}
                              disabled={!canVerify}
                              onCheckedChange={(val) => canVerify && handleVerificado(item, Boolean(val))}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Popover
                              open={isEditingComentario}
                              onOpenChange={(open) => {
                                if (!open) setEditComentarioItemId(null)
                              }}
                            >
                              <PopoverTrigger asChild>
                                {(() => {
                                  const canEditComment = editable || canVerify
                                  const displayComment = editComentarioValues[item.id] ?? item.comentarioRevision
                                  return (
                                    <div
                                      onClick={() => canEditComment && setEditComentarioItemId(item.id)}
                                      className={`text-xs cursor-pointer hover:bg-muted/50 rounded transition-colors leading-tight ${
                                        canEditComment ? 'hover:text-blue-600' : ''
                                      } ${item.verificado ? 'text-green-700' : 'text-gray-600'}`}
                                      title={displayComment || 'Click para agregar comentario'}
                                    >
                                      {displayComment ? (
                                        <span>{displayComment}</span>
                                      ) : (
                                        <span className="text-muted-foreground italic text-xs">
                                          {canEditComment ? '+' : '—'}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })()}
                              </PopoverTrigger>
                              {(editable || canVerify) && (
                                <PopoverContent className="w-72 p-3" align="start" side="bottom">
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Comentario de revisión</p>
                                    <Textarea
                                      id={`comentario-${item.id}`}
                                      value={editComentarioValues[item.id] ?? item.comentarioRevision ?? ''}
                                      onChange={(e) => setEditComentarioValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault()
                                          handleSaveComentario(item.id)
                                        }
                                      }}
                                      placeholder="Escribe un comentario..."
                                      className="text-xs min-h-[72px] resize-none"
                                      rows={3}
                                    />
                                    <div className="flex justify-end gap-1">
                                      <Button size="sm" variant="ghost" onClick={() => setEditComentarioItemId(null)} className="h-7 text-xs">
                                        Cancelar
                                      </Button>
                                      <Button size="sm" onClick={() => handleSaveComentario(item.id)} className="h-7 text-xs">
                                        Guardar
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              )}
                            </Popover>
                            {item.verificado && item.verificadoPor && (
                              <span className="text-[9px] text-muted-foreground leading-none mt-0.5 block">
                                {item.verificadoPor.name?.split(' ')[0]} · {item.verificadoAt ? new Date(item.verificadoAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Por Cotizar en adelante: icono de solo lectura */
                        <div className="flex items-center gap-1.5">
                          {item.verificado ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          )}
                          {item.comentarioRevision && (
                            <span className="text-xs text-gray-500 truncate max-w-[100px]" title={item.comentarioRevision}>
                              {item.comentarioRevision}
                            </span>
                          )}
                        </div>
                      )}
                   </td>
                   <td className={`${cellPadding} ${columnWidths.acciones} text-center`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!editable}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {puedeSeleccionarCotizacion && (item.cotizaciones?.length || 0) > 0 && (
                            <DropdownMenuItem onSelect={() => setTimeout(() => setSelectorItem(item), 0)}>
                              <Trophy className="h-3.5 w-3.5 mr-2" />
                              {item.cotizacionSeleccionadaId ? 'Cambiar cotización' : 'Elegir cotización'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => setTimeout(() => setItemReemplazo(item), 0)}>
                            <RotateCcw className="h-3.5 w-3.5 mr-2" />
                            Reemplazar
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setTimeout(() => setEditingItem(item), 0)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setTimeout(() => deleteValidation.requestDelete(item.id), 0)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                   </td>
                   </>)}
                   </SortableItemRow>
               )
                 })
               }
           </tbody>
            </SortableContext>
          </DndContext>
           </table>
        </div>
      </div>
    )
  }

  const estadoLabels: Record<string, string> = {
    por_revisar: 'Por Revisar',
    por_cotizar: 'Por Cotizar',
    por_aprobar: 'Por Aprobar',
    aprobada: 'Aprobada',
    anulada: 'Anulada',
  }

  return (
    <div className="space-y-3">
      {renderHeader()}

      {!editable && listaEstado && listaEstado !== 'borrador' && listaEstado !== 'por_revisar' && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Esta lista está en estado <strong>{estadoLabels[listaEstado] ?? listaEstado}</strong> — solo se puede editar en estado Borrador.
          </span>
        </div>
      )}

      {isLoading ? (
        renderLoadingSkeleton()
      ) : filteredItems.length === 0 ? (
        renderEmptyState()
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
              const isEditingComentario = editComentarioItemId === item.id
              const costoTotal = calcularCostoItem(item)

              return (
                <div
                  key={item.id}
                  className="h-full"
                >
                  <Card className={`h-full transition-all hover:shadow-sm hover:border-orange-300 ${
                    item.estado === 'aprobado' ? 'border-green-200 bg-green-50/30' : ''
                  }`}>
                    <CardHeader className="pb-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-semibold text-gray-900 truncate">
                              {item.codigo}
                            </CardTitle>
                            <TipoItemBadge tipoItem={(item as any).tipoItem} catalogoEquipoId={item.catalogoEquipoId} />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.descripcion}
                          </p>
                          {item.categoria && item.categoria !== 'SIN-CATEGORIA' && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0 rounded bg-violet-50 text-violet-600 border border-violet-200">
                              <Tag className="h-2 w-2" />{item.categoria}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Checkbox
                            checked={item.verificado}
                            disabled={!canVerify}
                            onCheckedChange={(val) => canVerify && handleVerificado(item, Boolean(val))}
                          />
                          {item.verificado && (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                      {item.verificado && item.verificadoPor && (
                        <p className="text-[9px] text-muted-foreground text-right">
                          {item.verificadoPor.name?.split(' ')[0]} · {item.verificadoAt ? new Date(item.verificadoAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : ''}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant={getStatusVariant(item.estado) as "default" | "secondary" | "outline"} className="text-[10px] px-1.5 py-0">
                          {item.estado || 'Sin estado'}
                        </Badge>
                        {item.desgloseDeProyectoEquipoCotizadoItem ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help bg-purple-50 text-purple-700 border-purple-200">
                                <Layers className="h-2.5 w-2.5 mr-0.5" />
                                desglose
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-[10px] font-semibold mb-0.5">Parte del desglose de:</p>
                              <p className="text-[10px]">
                                <span className="font-medium">{item.desgloseDeProyectoEquipoCotizadoItem.codigo}</span> — {item.desgloseDeProyectoEquipoCotizadoItem.descripcion}
                              </p>
                              {item.desgloseDeProyectoEquipoCotizadoItem.proyectoEquipoCotizado?.nombre && (
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                  Grupo: {item.desgloseDeProyectoEquipoCotizadoItem.proyectoEquipoCotizado.nombre}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : (item.origen === 'cotizado' || item.origen === 'reemplazo') && item.proyectoEquipoItem ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={getOrigenVariant(item.origen)} className="text-[10px] px-1.5 py-0 cursor-help">
                                {labelOrigen[item.origen] || item.origen}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-[10px] font-semibold mb-0.5">
                                {item.origen === 'reemplazo' ? 'Reemplaza a:' : 'Equipo cotizado:'}
                              </p>
                              <p className="text-[10px]">
                                <span className="font-medium">{item.proyectoEquipoItem.codigo}</span> — {item.proyectoEquipoItem.descripcion}
                              </p>
                              {item.proyectoEquipoItem.proyectoEquipoCotizado?.nombre && (
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                  Grupo: {item.proyectoEquipoItem.proyectoEquipoCotizado.nombre}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant={getOrigenVariant(item.origen)} className="text-[10px] px-1.5 py-0">
                            {labelOrigen[item.origen] || item.origen}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3 p-3 pt-0">
                      {/* Basic Info */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Cant:</span>
                          <span className="font-medium">
                            {item.cantidad} {item.unidad}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-green-600">
                          {costoTotal > 0 ? formatCurrency(costoTotal) : '—'}
                        </span>
                      </div>

                      {/* Cotización */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          {(() => {
                            const n = item.cotizaciones?.length || 0
                            const color = n === 0 ? 'bg-red-500' : n < 3 ? 'bg-amber-500' : 'bg-green-500'
                            return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
                          })()}
                          Cot. ({item.cotizaciones?.length || 0}/3):
                        </span>
                        <CotizacionCodigoSimple
                          cotizaciones={item.cotizaciones || []}
                          cotizacionSeleccionadaId={item.cotizacionSeleccionadaId || undefined}
                          interactive={false}
                        />
                      </div>
                      {puedeSeleccionarCotizacion && (item.cotizaciones?.length || 0) > 0 && (
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectorItem(item)}
                            className="h-5 text-[10px] px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Trophy className="h-3 w-3 mr-0.5" />
                            {item.cotizacionSeleccionadaId ? 'Cambiar cotización' : 'Elegir cotización'}
                          </Button>
                        </div>
                      )}
                      {(item as any).seleccionadoPor?.name && (
                        <div className="text-[9px] text-muted-foreground text-right">
                          Elegido por {(item as any).seleccionadoPor.name}
                        </div>
                      )}

                      {(item.tiempoEntrega || item.tiempoEntregaDias) && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Entrega:</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{item.tiempoEntrega || `${item.tiempoEntregaDias}d`}</span>
                          </div>
                        </div>
                      )}

                      {/* Comments */}
                      <div className="text-xs">
                        <Popover
                          open={isEditingComentario}
                          onOpenChange={(open) => {
                            if (!open) setEditComentarioItemId(null)
                          }}
                        >
                          <PopoverTrigger asChild>
                            <div
                              onClick={() => (editable || canVerify) && setEditComentarioItemId(item.id)}
                              className={`text-muted-foreground p-1.5 rounded border-dashed border ${
                                (editable || canVerify) ? 'cursor-pointer hover:bg-muted/50' : ''
                              }`}
                            >
                              {(editComentarioValues[item.id] ?? item.comentarioRevision) || ((editable || canVerify) ? '+ Comentario' : '—')}
                            </div>
                          </PopoverTrigger>
                          {(editable || canVerify) && (
                            <PopoverContent className="w-72 p-3" align="start" side="bottom">
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Comentario de revisión</p>
                                <Textarea
                                  id={`comentario-card-${item.id}`}
                                  value={editComentarioValues[item.id] ?? item.comentarioRevision ?? ''}
                                  onChange={(e) => setEditComentarioValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      handleSaveComentario(item.id)
                                    }
                                  }}
                                  placeholder="Escribe un comentario..."
                                  className="text-xs min-h-[72px] resize-none"
                                  rows={3}
                                />
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => setEditComentarioItemId(null)} className="h-7 text-xs">
                                    Cancelar
                                  </Button>
                                  <Button size="sm" onClick={() => handleSaveComentario(item.id)} className="h-7 text-xs">
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-1 border-t">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => setItemReemplazo(item)}
                            variant="ghost"
                            disabled={!editable}
                            className="h-6 px-2 text-xs"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!editable}
                            onClick={() => setEditingItem(item)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!editable}
                            onClick={() => deleteValidation.requestDelete(item.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
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

      <DeleteWithValidationDialog
        open={deleteValidation.dialogOpen}
        onOpenChange={(open) => !open && deleteValidation.cancelDelete()}
        checking={deleteValidation.checking}
        deleting={deleteValidation.deleting}
        allowed={deleteValidation.canDeleteResult?.allowed ?? null}
        blockers={deleteValidation.canDeleteResult?.blockers ?? []}
        message={deleteValidation.canDeleteResult?.message ?? ''}
        onConfirm={deleteValidation.confirmDelete}
        onCancel={deleteValidation.cancelDelete}
        entityLabel="item"
      />

      {itemReemplazo && (
        <ModalReemplazarEquipo
          open={!!itemReemplazo}
          item={itemReemplazo}
          onClose={() => setItemReemplazo(null)}
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
        listaCodigo={listaCodigo}
        listaNombre={listaNombre}
        onSuccess={() => {
          setShowModalImportarExcel(false)
          onCreated?.()
        }}
      />

      <ModalAgregarItemLibre
        isOpen={showModalItemLibre}
        tipoItem={tipoItemLibre}
        listaId={listaId}
        proyectoId={proyectoId}
        onClose={() => setShowModalItemLibre(false)}
        onCreated={async () => { await onCreated?.() }}
      />

      {/* Modal de edición de item */}
      {editingItem && (
        <ModalEditarListaItem
          isOpen={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={async () => {
            await onItemsUpdated?.()
            await onCreated?.()
          }}
        />
      )}

      {/* Modal de selección de cotización ganadora */}
      <Dialog open={!!selectorItem} onOpenChange={(open) => { if (!open) setSelectorItem(null) }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selectorItem && (
            <CotizacionSelectorModal
              item={selectorItem}
              onUpdated={() => {
                setSelectorItem(null)
                onRefresh?.() || onCreated?.()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
