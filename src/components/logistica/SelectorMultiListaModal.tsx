// ===================================================
// 📁 Archivo: SelectorMultiListaModal.tsx
// 📌 Descripción: Modal para seleccionar items de múltiples listas para cotizaciones
// 📌 Propósito: Permitir agregar items de diferentes listas a una misma cotización
// ✍️ Autor: Sistema GYS - Análisis de Cotizaciones
// 📅 Actualizado: 2025-11-17
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Plus,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  FileText,
  Hash,
  Calculator,
  Layers,
  Filter,
  List,
} from 'lucide-react'

import type {
  ListaEquipo,
  ListaEquipoItem,
  CotizacionProveedor,
  Proyecto,
} from '@/types'

import { getListaPorProyecto } from '@/lib/services/listaPorProyecto'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'

interface Props {
  open: boolean
  onClose: () => void
  cotizacion: CotizacionProveedor
  proyectoId: string
  onAdded?: () => void
}

export default function SelectorMultiListaModal({
  open,
  onClose,
  cotizacion,
  proyectoId,
  onAdded,
}: Props) {
  // 🎯 Estados principales
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [selectedListas, setSelectedListas] = useState<Set<string>>(new Set())
  const [itemsPorLista, setItemsPorLista] = useState<Record<string, ListaEquipoItem[]>>({})
  const [selectedItems, setSelectedItems] = useState<Record<string, ListaEquipoItem>>({})
  const [yaAgregados, setYaAgregados] = useState<Set<string>>(new Set())
  const [itemsConCotizacion, setItemsConCotizacion] = useState<Set<string>>(new Set())
  
  // 🔄 Estados de carga y UI
  const [loading, setLoading] = useState(false)
  const [loadingListas, setLoadingListas] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [vistaActual, setVistaActual] = useState<'unificada' | 'por-lista'>('unificada')
  const [listaFiltroActiva, setListaFiltroActiva] = useState<string>('')

  // 📡 Cargar listas del proyecto
  useEffect(() => {
    const cargarListas = async () => {
      if (!proyectoId) return

      try {
        setLoadingListas(true)
        const data = await getListaPorProyecto(proyectoId)
        setListas(data || [])
        
        // 🎯 Auto-seleccionar todas las listas por defecto
        if (data && data.length > 0) {
          setSelectedListas(new Set(data.map((l: ListaEquipo) => l.id)))
        }
      } catch (error) {
        console.error('❌ Error al cargar listas:', error)
        toast.error('Error al cargar listas del proyecto')
      } finally {
        setLoadingListas(false)
      }
    }

    if (open) {
      cargarListas()
      resetEstados()
    }
  }, [proyectoId, open])

  // 📡 Cargar items de todas las listas seleccionadas
  useEffect(() => {
    const cargarItemsDeListas = async () => {
      if (selectedListas.size === 0) return

      try {
        setLoadingItems(true)
        const itemsPromises = Array.from(selectedListas).map(async (listaId) => {
          const items = await getListaEquipoItemsByLista(listaId)
          return { listaId, items: items || [] }
        })

        const resultados = await Promise.all(itemsPromises)
        const itemsMap: Record<string, ListaEquipoItem[]> = {}
        let todosItems: ListaEquipoItem[] = []

        resultados.forEach(({ listaId, items }) => {
          itemsMap[listaId] = items
          todosItems = [...todosItems, ...items]
        })

        setItemsPorLista(itemsMap)

        // 🎯 Identificar items ya agregados
        const idsAgregados = new Set(
          cotizacion.items
            ?.map(i => i.listaEquipoItemId)
            .filter((id): id is string => !!id)
        )
        setYaAgregados(idsAgregados)

        // 🎨 Identificar items con cotizaciones
        const idsConCotizacion = new Set(
          todosItems
            .filter(item => item.cotizaciones && item.cotizaciones.length > 0)
            .map(item => item.id)
        )
        setItemsConCotizacion(idsConCotizacion)
      } catch (error) {
        console.error('❌ Error al cargar items:', error)
        toast.error('Error al cargar items de las listas')
      } finally {
        setLoadingItems(false)
      }
    }

    cargarItemsDeListas()
  }, [selectedListas, cotizacion])

  const resetEstados = () => {
    setSelectedListas(new Set())
    setItemsPorLista({})
    setSelectedItems({})
    setSearchTerm('')
    setVistaActual('unificada')
    setListaFiltroActiva('')
  }

  // 🎯 Funciones de utilidad
  const toggleLista = (listaId: string, checked: boolean) => {
    setSelectedListas(prev => {
      const updated = new Set(prev)
      if (checked) updated.add(listaId)
      else updated.delete(listaId)
      return updated
    })
  }

  const toggleItemSeleccion = (item: ListaEquipoItem, checked: boolean) => {
    setSelectedItems(prev => {
      const updated = { ...prev }
      if (checked) updated[item.id] = item
      else delete updated[item.id]
      return updated
    })
  }

  // 🔍 Filtrar items
  const getAllItems = () => {
    return Object.values(itemsPorLista).flat()
  }

  const getItemsFiltrados = () => {
    let items = vistaActual === 'unificada' ? getAllItems() : (itemsPorLista[listaFiltroActiva] || [])
    
    if (searchTerm) {
      items = items.filter(item =>
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return items
  }

  // 📊 Estadísticas
  const estadisticas = {
    totalListas: listas.length,
    listasSeleccionadas: selectedListas.size,
    totalItems: getAllItems().length,
    conCotizacion: itemsConCotizacion.size,
    sinCotizacion: getAllItems().length - itemsConCotizacion.size,
    yaAgregados: yaAgregados.size,
    seleccionados: Object.keys(selectedItems).length
  }

  // 🎨 Obtener estilo del item
  const getItemStyle = (item: ListaEquipoItem) => {
    const yaAgregado = yaAgregados.has(item.id)
    const tieneCotizacion = itemsConCotizacion.has(item.id)
    const seleccionado = !!selectedItems[item.id]
    const lista = listas.find(l => l.id === item.listaId)

    if (yaAgregado) {
      return {
        className: 'bg-gray-100 border-gray-300 opacity-60',
        badge: { text: 'Ya agregado', variant: 'secondary' as const }
      }
    }
    
    if (seleccionado) {
      return {
        className: 'bg-blue-50 border-blue-300 ring-2 ring-blue-200',
        badge: { text: 'Seleccionado', variant: 'default' as const }
      }
    }
    
    if (tieneCotizacion) {
      return {
        className: 'bg-green-50 border-green-200 hover:bg-green-100',
        badge: { text: 'Con cotización', variant: 'outline' as const }
      }
    }
    
    return {
      className: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      badge: { text: 'Sin cotización', variant: 'destructive' as const }
    }
  }

  const handleAgregar = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast.warning('Selecciona al menos un item')
      return
    }

    try {
      setLoading(true)
      const promises = Object.values(selectedItems).map((item) =>
        createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: item.listaId || undefined,
          listaEquipoItemId: item.id,
        })
      )
      
      await Promise.all(promises)
      toast.success(`✅ ${Object.keys(selectedItems).length} items agregados correctamente`)
      
      setSelectedItems({})
      onAdded?.()
      onClose()
    } catch (err) {
      console.error('Error al agregar items:', err)
      toast.error('❌ Error al agregar items')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col p-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col h-full"
        >
          {/* 📋 Header */}
          <div className="flex-shrink-0 p-6 pb-4 border-b">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    Selector Multi-Lista
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Proveedor: <span className="font-medium">{cotizacion.proveedor?.nombre}</span>
                    {' • '}
                    Proyecto: <span className="font-medium">{cotizacion.proyecto?.codigo}</span>
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* 📊 Estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <List className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                <p className="text-sm font-bold text-gray-900">{estadisticas.listasSeleccionadas}/{estadisticas.totalListas}</p>
                <p className="text-xs text-gray-600">Listas</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <Package className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                <p className="text-sm font-bold text-blue-700">{estadisticas.totalItems}</p>
                <p className="text-xs text-blue-600">Total Items</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-600" />
                <p className="text-sm font-bold text-green-700">{estadisticas.conCotizacion}</p>
                <p className="text-xs text-green-600">Con Cotización</p>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                <p className="text-sm font-bold text-orange-700">{estadisticas.sinCotizacion}</p>
                <p className="text-xs text-orange-600">Sin Cotización</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <FileText className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                <p className="text-sm font-bold text-gray-700">{estadisticas.yaAgregados}</p>
                <p className="text-xs text-gray-600">Ya Agregados</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <Calculator className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                <p className="text-sm font-bold text-blue-700">{estadisticas.seleccionados}</p>
                <p className="text-xs text-blue-600">Seleccionados</p>
              </div>
            </div>
          </div>

          {/* 📜 Contenido */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* 🎯 Selector de Listas */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Seleccionar Listas
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {listas.map((lista) => (
                      <div
                        key={lista.id}
                        className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedListas.has(lista.id)}
                          onCheckedChange={(checked) => toggleLista(lista.id, !!checked)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{lista.codigo}</p>
                          <p className="text-xs text-gray-500">{lista.nombre}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🔍 Barra de búsqueda */}
                {selectedListas.size > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar por descripción o código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}

                {/* 🎯 Tabs de Vista */}
                {selectedListas.size > 0 && (
                  <Tabs value={vistaActual} onValueChange={(val) => setVistaActual(val as any)}>
                    <TabsList>
                      <TabsTrigger value="unificada">Vista Unificada</TabsTrigger>
                      <TabsTrigger value="por-lista">Por Lista</TabsTrigger>
                    </TabsList>

                    <TabsContent value="unificada" className="space-y-4">
                      {/* 📋 Lista unificada de items */}
                      <div className="border rounded-lg">
                        <div className="p-4 max-h-96 overflow-y-auto">
                          {loadingItems ? (
                            <div className="space-y-3">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                    <div className="flex-1">
                                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : getItemsFiltrados().length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-500">
                                {searchTerm ? 'No se encontraron items' : 'No hay items en las listas seleccionadas'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {getItemsFiltrados().map((item) => {
                                const itemStyle = getItemStyle(item)
                                const lista = listas.find(l => l.id === item.listaId)
                                
                                return (
                                  <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-center justify-between p-3 border rounded-lg transition-all ${itemStyle.className}`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <Checkbox
                                        checked={!!selectedItems[item.id]}
                                        onCheckedChange={(checked) => toggleItemSeleccion(item, !!checked)}
                                        disabled={yaAgregados.has(item.id)}
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">
                                          {item.descripcion}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                          <Hash className="h-3 w-3" />
                                          <span>{item.codigo}</span>
                                          <span>•</span>
                                          <span>{lista?.codigo}</span>
                                          <span>•</span>
                                          <span>{item.unidad}</span>
                                          <span>•</span>
                                          <span>Cant: {item.cantidad}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant={itemStyle.badge.variant as any} className="text-xs">
                                      {itemStyle.badge.text}
                                    </Badge>
                                  </motion.div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="por-lista" className="space-y-4">
                      {/* 🎯 Selector de lista activa */}
                      <Select value={listaFiltroActiva} onValueChange={setListaFiltroActiva}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar lista para filtrar" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(selectedListas).map((listaId) => {
                            const lista = listas.find(l => l.id === listaId)
                            return (
                              <SelectItem key={listaId} value={listaId}>
                                {lista?.codigo} - {lista?.nombre}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>

                      {/* 📋 Items de la lista seleccionada */}
                      {listaFiltroActiva && (
                        <div className="border rounded-lg">
                          <div className="p-4 max-h-96 overflow-y-auto">
                            {getItemsFiltrados().length === 0 ? (
                              <div className="text-center py-8">
                                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">
                                  {searchTerm ? 'No se encontraron items' : 'No hay items en esta lista'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {getItemsFiltrados().map((item) => {
                                  const itemStyle = getItemStyle(item)
                                  
                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className={`flex items-center justify-between p-3 border rounded-lg transition-all ${itemStyle.className}`}
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <Checkbox
                                          checked={!!selectedItems[item.id]}
                                          onCheckedChange={(checked) => toggleItemSeleccion(item, !!checked)}
                                          disabled={yaAgregados.has(item.id)}
                                        />
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900">
                                            {item.descripcion}
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <Hash className="h-3 w-3" />
                                            <span>{item.codigo}</span>
                                            <span>•</span>
                                            <span>{item.unidad}</span>
                                            <span>•</span>
                                            <span>Cant: {item.cantidad}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <Badge variant={itemStyle.badge.variant as any} className="text-xs">
                                        {itemStyle.badge.text}
                                      </Badge>
                                    </motion.div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* 📋 Resumen de selección */}
                <AnimatePresence>
                  {Object.keys(selectedItems).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">
                          Ítems Seleccionados ({Object.keys(selectedItems).length})
                        </h3>
                      </div>
                      <div className="grid gap-2 max-h-32 overflow-y-auto">
                        {Object.values(selectedItems).map((item) => {
                          const lista = listas.find(l => l.id === item.listaId)
                          return (
                            <div key={item.id} className="flex items-center justify-between text-sm bg-white rounded p-2">
                              <span className="font-medium">{item.descripcion}</span>
                              <span className="text-gray-500">({item.codigo} • {lista?.codigo})</span>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* 🎯 Botones de acción */}
          <div className="flex-shrink-0 p-6 pt-4 border-t bg-white">
            <motion.div
              className="flex justify-end gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                onClick={handleAgregar}
                disabled={loading || Object.keys(selectedItems).length === 0}
                className="min-w-[160px] bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar ({Object.keys(selectedItems).length})
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}