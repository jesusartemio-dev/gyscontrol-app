// ===================================================
// 📁 Archivo: ListaEquipoItemList.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Lista de ítems técnicos de una lista de equipos con mejoras UX/UI
// ===================================================

'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, Trash2, CheckCircle2, X, Search, Filter, Package, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Grid3X3, List, Settings, Eye, EyeOff, RotateCcw, Recycle, Plus, ShoppingCart, FileText, Download, Tag } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  listaCodigo?: string
  listaNombre?: string
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


export default function ListaEquipoItemList({ listaId, proyectoId, listaCodigo, listaNombre, items, editable = true, onCreated, onItemUpdated, onItemsUpdated, onDeleted, onRefresh }: Props) {
  const router = useRouter()
  const [editCantidadItemId, setEditCantidadItemId] = useState<string | null>(null)
  const [editCantidadValues, setEditCantidadValues] = useState<Record<string, string>>({})
  const [editComentarioItemId, setEditComentarioItemId] = useState<string | null>(null)
  const [editComentarioValues, setEditComentarioValues] = useState<Record<string, string>>({})
  const [itemReemplazoOriginal, setItemReemplazoOriginal] = useState<ListaEquipoItem | null>(null)
  const [itemReemplazoReemplazo, setItemReemplazoReemplazo] = useState<ListaEquipoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')
  const [isLoading, setIsLoading] = useState(false)

  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list') // ✅ Default to list view
  const [showModalAgregarCatalogo, setShowModalAgregarCatalogo] = useState(false)
  const [showModalAgregarEquipo, setShowModalAgregarEquipo] = useState(false)
  const [showModalImportarExcel, setShowModalImportarExcel] = useState(false)
  
  const [visibleColumns, setVisibleColumns] = useState({
    codigoDescripcion: true, // ✅ Combined column
    marca: true, // ✅ Nueva columna marca
    unidad: false, // ✅ Oculta cuando está activa la unificada
    cantidad: false, // ✅ Oculta cuando está activa la unificada
    cantidadUnidad: true, // ✅ Nueva columna unificada (activada por defecto)
    pedidos: false, // ✅ Oculta por defecto (integrado en Cant./Und)
    cotizacion: true,
    costo: true,
    entrega: false,
    origen: true,
    estado: true,
    verificadoComentario: true, // ✅ Combined verificado + comentario column
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
  const filteredItems = useMemo(() => {
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

    return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [itemsWithResumen, searchTerm, categoriaFiltro])

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
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowModalAgregarCatalogo(true)}
              className="h-7 px-2 text-xs bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="h-3 w-3 mr-1" />
              Catálogo
            </Button>
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

        {/* Column Visibility Toggle */}
        {viewMode === 'list' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2" align="end">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-0.5">
                  <Label className="text-[10px] font-medium">Columnas unificadas</Label>
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
                  marca: 'Marca',
                  unidad: 'Unidad',
                  cantidad: 'Cantidad',
                  cantidadUnidad: 'Cant./Unidad',
                  pedidos: 'Pedidos',
                  cotizacion: 'Cotización',
                  costo: 'Costo',
                  entrega: 'Entrega',
                  origen: 'Origen',
                  estado: 'Estado',
                  pedidosLinks: 'Links Pedidos',
                  verificadoComentario: 'Verif./Comentario'
                }).map(([key, label]) => {
                  if (visibleColumns.cantidadUnidad && (key === 'unidad' || key === 'cantidad')) {
                    return null
                  }
                  if (!visibleColumns.cantidadUnidad && key === 'cantidadUnidad') {
                    return null
                  }

                  return (
                    <div key={key} className="flex items-center justify-between py-0.5">
                      <Label htmlFor={key} className="text-[10px]">{label}</Label>
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
      codigoDescripcion: 'min-w-[180px]',
      marca: 'w-28',
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
      verificadoComentario: 'w-40',
      equipo: 'w-24',
      acciones: 'w-24'
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${textSize}`}>
            <thead>
              <tr className="bg-gray-50 border-b">
                {visibleColumns.codigoDescripcion && (
                  <th className={`${cellPadding} ${columnWidths.codigoDescripcion} text-left font-semibold text-gray-700`}>
                    Código / Descripción
                  </th>
                )}
                {visibleColumns.marca && (
                  <th className={`${cellPadding} ${columnWidths.marca} text-left font-semibold text-gray-700`}>
                    Marca
                  </th>
                )}
                {visibleColumns.unidad && (
                  <th className={`${cellPadding} ${columnWidths.unidad} text-center font-semibold text-gray-700`}>
                    Und
                  </th>
                )}
                {visibleColumns.cantidad && (
                  <th className={`${cellPadding} ${columnWidths.cantidad} text-center font-semibold text-gray-700`}>
                    Cant.
                  </th>
                )}
                {visibleColumns.cantidadUnidad && (
                  <th className={`${cellPadding} ${columnWidths.cantidadUnidad} text-center font-semibold text-gray-700`}>
                    Cant./Und
                  </th>
                )}
                {visibleColumns.pedidos && (
                  <th className={`${cellPadding} ${columnWidths.pedidos} text-center font-semibold text-gray-700`}>
                    Pedidos
                  </th>
                )}
                {visibleColumns.cotizacion && (
                  <th className={`${cellPadding} ${columnWidths.cotizacion} text-center font-semibold text-gray-700`}>
                    Cotización
                  </th>
                )}
                {visibleColumns.costo && (
                  <th className={`${cellPadding} ${columnWidths.costo} text-right font-semibold text-gray-700`}>
                    Costo
                  </th>
                )}
                {visibleColumns.entrega && (
                  <th className={`${cellPadding} ${columnWidths.entrega} text-center font-semibold text-gray-700`}>
                    Entrega
                  </th>
                )}
                {visibleColumns.origen && (
                  <th className={`${cellPadding} ${columnWidths.origen} text-center font-semibold text-gray-700`}>
                    Origen
                  </th>
                )}
                {visibleColumns.estado && (
                  <th className={`${cellPadding} ${columnWidths.estado} text-center font-semibold text-gray-700`}>
                    Estado
                  </th>
                )}
                {visibleColumns.pedidosLinks && (
                  <th className={`${cellPadding} ${columnWidths.pedidosLinks} text-center font-semibold text-gray-700`}>
                    Pedidos
                  </th>
                )}
                {visibleColumns.verificadoComentario && (
                  <th className={`${cellPadding} ${columnWidths.verificadoComentario} text-left font-semibold text-gray-700`}>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Comentario</span>
                    </div>
                  </th>
                )}
                {visibleColumns.equipo && (
                  <th className={`${cellPadding} ${columnWidths.equipo} text-center font-semibold text-gray-700`}>
                    Equipo
                  </th>
                )}
                {visibleColumns.acciones && (
                  <th className={`${cellPadding} ${columnWidths.acciones} text-center font-semibold text-gray-700`}></th>
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

              const rowIndex = filteredItems.indexOf(item)
              return (
                <tr
                   key={item.id}
                   className={`border-b hover:bg-gray-50 transition-colors ${
                     rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                   }`}
                 >
                   {visibleColumns.codigoDescripcion && (
                     <td className={`${cellPadding} ${columnWidths.codigoDescripcion} text-gray-700`}>
                       <div className="space-y-0.5">
                         <div className="font-medium text-gray-900 text-xs truncate" title={item.codigo}>
                           {item.codigo}
                         </div>
                         <div className="text-[11px] text-gray-500 truncate" title={item.descripcion}>
                           {item.descripcion}
                         </div>
                         {item.categoria && item.categoria !== 'SIN-CATEGORIA' && (
                           <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0 rounded bg-violet-50 text-violet-600 border border-violet-200">
                             <Tag className="h-2 w-2" />{item.categoria}
                           </span>
                         )}
                       </div>
                     </td>
                   )}
                   {visibleColumns.marca && (
                     <td className={`${cellPadding} ${columnWidths.marca}`}>
                       <span className="text-gray-600 truncate line-clamp-1" title={item.marca || ''}>
                         {item.marca || '-'}
                       </span>
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
                        <div>
                          <div
                            className="flex items-center justify-center gap-1 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => editable && setEditCantidadItemId(item.id)}
                          >
                            {item.cantidad}
                            {editable && <Pencil className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          {item.origen === 'cotizado' && item.proyectoEquipoItem?.cantidad != null && item.cantidad > item.proyectoEquipoItem.cantidad && (
                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px] text-amber-600">Cotizado: {item.proyectoEquipoItem.cantidad}</span>
                            </div>
                          )}
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
                        <div>
                          <div
                            className="flex items-center justify-center gap-1 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => editable && setEditCantidadItemId(item.id)}
                          >
                            <span>{item.cantidad}</span>
                            <span className="text-xs text-gray-500">{item.unidad}</span>
                            {editable && <Pencil className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          {item.origen === 'cotizado' && item.proyectoEquipoItem?.cantidad != null && item.cantidad > item.proyectoEquipoItem.cantidad && (
                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px] text-amber-600">Cotizado: {item.proyectoEquipoItem.cantidad}</span>
                            </div>
                          )}
                          {/* Pedido status integrated */}
                          {(() => {
                            const cantidadPedida = item.cantidadPedida || 0
                            const cantidadTotal = item.cantidad || 0
                            if (cantidadPedida === 0) return null
                            if (cantidadPedida >= cantidadTotal) {
                              return <div className="text-center mt-0.5"><span className="text-[9px] text-green-600">Completo</span></div>
                            }
                            return <div className="text-center mt-0.5"><span className="text-[9px] text-muted-foreground">{cantidadPedida}/{cantidadTotal} ped.</span></div>
                          })()}
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
                     </td>
                   )}
                   {visibleColumns.costo && (
                     <td className={`${cellPadding} ${columnWidths.costo} text-right font-medium text-gray-900`}>
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
                     <td className={`${cellPadding} ${columnWidths.origen} text-center`}>
                      <span className={`text-[11px] ${item.origen === 'nuevo' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {labelOrigen[item.origen] || item.origen}
                      </span>
                     </td>
                   )}
                   {visibleColumns.estado && (
                     <td className={`${cellPadding} ${columnWidths.estado} text-center`}>
                      <span className={`text-[11px] ${
                        item.estado === 'aprobado' ? 'text-green-600' :
                        item.estado === 'rechazado' ? 'text-red-500' :
                        'text-muted-foreground'
                      }`}>
                        {item.estado || 'sin estado'}
                      </span>
                     </td>
                   )}
                   {visibleColumns.pedidosLinks && (
                     <td className={`${cellPadding} ${columnWidths.pedidosLinks}`}>
                      <div className="flex flex-col gap-1 min-w-0">
                        {(() => {
                          const pedidos = obtenerTodosLosPedidos(item)
                          
                          if (pedidos.length === 0) {
                            return (
                               <span className="text-[10px] text-muted-foreground">—</span>
                             )
                          }

                          // Mostrar todos los pedidos directamente
                          return (
                            <div className="flex flex-col gap-0.5">
                              {pedidos.map((codigo, index) => (
                                <Tooltip key={index}>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="text-[10px] font-mono text-blue-600/80 hover:text-blue-700 hover:underline text-left truncate"
                                      onClick={() => {
                                        const pedidoItem = item.pedidos?.find(p => p.pedido?.codigo === codigo)
                                        if (pedidoItem?.pedido?.id) {
                                          router.push(`/proyectos/${proyectoId}/pedidos-equipo/${pedidoItem.pedido.id}`)
                                        }
                                      }}
                                    >
                                      {codigo}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Ver pedido {codigo}</p>
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
                   {visibleColumns.verificadoComentario && (
                     <td className={`${cellPadding} ${columnWidths.verificadoComentario}`}>
                      <div className="flex items-center gap-2">
                        {/* Checkbox */}
                        <div className="flex-shrink-0">
                          <Checkbox
                            checked={item.verificado}
                            disabled={!editable}
                            onCheckedChange={(val) => editable && handleVerificado(item, Boolean(val))}
                          />
                        </div>
                        {/* Comment with Popover */}
                        <div className="flex-1 min-w-0">
                          <Popover
                            open={isEditingComentario}
                            onOpenChange={(open) => {
                              if (!open) setEditComentarioItemId(null)
                            }}
                          >
                            <PopoverTrigger asChild>
                              <div
                                onClick={() => editable && setEditComentarioItemId(item.id)}
                                className={`text-xs cursor-pointer hover:bg-muted/50 rounded transition-colors line-clamp-2 leading-tight ${
                                  editable ? 'hover:text-blue-600' : ''
                                } ${item.verificado ? 'text-green-700' : 'text-gray-600'}`}
                                title={item.comentarioRevision || 'Click para agregar comentario'}
                              >
                                {item.comentarioRevision ? (
                                  <span>{item.comentarioRevision}</span>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    {editable ? '+' : '—'}
                                  </span>
                                )}
                              </div>
                            </PopoverTrigger>
                            {editable && (
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
                        </div>
                      </div>
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
                              variant="ghost"
                              disabled={!editable}
                              onClick={() => setDeleteTarget(item.id)}
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
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
    <div className="space-y-3">
      {renderHeader()}
       
      {isLoading ? (
        renderLoadingSkeleton()
      ) : filteredItems.length === 0 ? (
        renderEmptyState()
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
              const isEditingCantidad = editCantidadItemId === item.id
              const isEditingComentario = editComentarioItemId === item.id
              const costoTotal = calcularCostoItem(item)

              return (
                <div
                  key={item.id}
                  className="h-full"
                >
                  <Card className={`h-full transition-all hover:shadow-sm hover:border-orange-300 ${
                    item.estado === 'rechazado' ? 'border-red-200 bg-red-50/30' :
                    item.estado === 'aprobado' ? 'border-green-200 bg-green-50/30' : ''
                  }`}>
                    <CardHeader className="pb-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <CardTitle className="text-sm font-semibold text-gray-900 truncate">
                            {item.codigo}
                          </CardTitle>
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
                            disabled={!editable}
                            onCheckedChange={(val) => editable && handleVerificado(item, Boolean(val))}
                          />
                          {item.verificado && (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant={getStatusVariant(item.estado) as "default" | "secondary" | "outline"} className="text-[10px] px-1.5 py-0">
                          {item.estado || 'Sin estado'}
                        </Badge>
                        <Badge variant={getOrigenVariant(item.origen)} className="text-[10px] px-1.5 py-0">
                          {labelOrigen[item.origen] || item.origen}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3 p-3 pt-0">
                      {/* Basic Info */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Cant:</span>
                          {isEditingCantidad ? (
                            <div className="flex gap-1 items-center">
                              <Input
                                type="number"
                                value={editCantidadValues[item.id] ?? item.cantidad?.toString() ?? ''}
                                onChange={(e) => setEditCantidadValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                className="h-6 w-16 text-xs"
                              />
                              <Button size="sm" onClick={() => handleSaveCantidad(item.id)} className="h-6 w-6 p-0">
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditCantidadItemId(null)} className="h-6 w-6 p-0">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span
                              className="font-medium cursor-pointer hover:text-orange-600"
                              onClick={() => editable && setEditCantidadItemId(item.id)}
                            >
                              {item.cantidad} {item.unidad}
                            </span>
                          )}
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

                      {item.cotizacionSeleccionada?.tiempoEntrega && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Entrega:</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{item.cotizacionSeleccionada.tiempoEntrega}</span>
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
                              onClick={() => editable && setEditComentarioItemId(item.id)}
                              className={`text-muted-foreground p-1.5 rounded border-dashed border ${
                                editable ? 'cursor-pointer hover:bg-muted/50' : ''
                              }`}
                            >
                              {item.comentarioRevision || (editable ? '+ Comentario' : '—')}
                            </div>
                          </PopoverTrigger>
                          {editable && (
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
                          {(item.estado !== 'rechazado') && (item.origen === 'cotizado' || item.origen === 'reemplazo') && (
                            !item.reemplazaProyectoEquipoCotizadoItemId ? (
                              <Button
                                size="sm"
                                onClick={() => setItemReemplazoOriginal(item)}
                                variant="ghost"
                                disabled={!editable}
                                className="h-6 px-2 text-xs"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setItemReemplazoReemplazo(item)}
                                variant="ghost"
                                disabled={!editable}
                                className="h-6 px-2 text-xs"
                              >
                                <Recycle className="h-3 w-3" />
                              </Button>
                            )
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!editable}
                          onClick={() => setDeleteTarget(item.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
        listaCodigo={listaCodigo}
        listaNombre={listaNombre}
        onSuccess={() => {
          setShowModalImportarExcel(false)
          onCreated?.()
        }}
      />
    </div>
  )
}
