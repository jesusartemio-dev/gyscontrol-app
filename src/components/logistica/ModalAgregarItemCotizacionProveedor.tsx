// ===================================================
// 📁 Archivo: ModalAgregarItemCotizacionProveedor.tsx
// 📌 Descripción: Modal mejorado para agregar items a cotización de proveedor
// 📌 Propósito: UX/UI moderna con diferenciación visual por estado de cotización
// ✍️ Autor: Sistema GYS
// 📅 Actualizado: 2025-01-27
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
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
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
} from 'lucide-react'

import type {
  ListaEquipo,
  ListaEquipoItem,
  CotizacionProveedor,
} from '@/types'

import { getListaPorProyecto } from '@/lib/services/listaPorProyecto'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import SelectorMultiListaModal from './SelectorMultiListaModal'

interface Props {
  open: boolean
  onClose: () => void
  cotizacion: CotizacionProveedor
  proyectoId: string
  onAdded?: () => void
}

export default function ModalAgregarItemCotizacionProveedor({
  open,
  onClose,
  cotizacion,
  proyectoId,
  onAdded,
}: Props) {
  // 🎯 Estados principales
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [listaId, setListaId] = useState('')
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [seleccionados, setSeleccionados] = useState<Record<string, ListaEquipoItem>>({})
  const [yaAgregados, setYaAgregados] = useState<Set<string>>(new Set())
  const [itemsConCotizacion, setItemsConCotizacion] = useState<Set<string>>(new Set())
  
  // 🎯 Estados para nueva funcionalidad multi-lista
  const [modalMultiListaOpen, setModalMultiListaOpen] = useState(false)
  
  // 🔄 Estados de carga y UI
  const [loading, setLoading] = useState(false)
  const [loadingListas, setLoadingListas] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // 📡 Cargar listas del proyecto
  useEffect(() => {
    const cargarListas = async () => {
      if (!proyectoId) {
        console.warn('⚠️ proyectoId está vacío')
        return
      }

      try {
        setLoadingListas(true)
        const data = await getListaPorProyecto(proyectoId)
        setListas(data || [])
        
        // 🎯 Auto-seleccionar primera lista si solo hay una
        if (data && data.length === 1) {
          setListaId(data[0].id)
        }
      } catch (error) {
        console.error('❌ Error al cargar listas por proyecto:', error)
        toast.error('Error al cargar listas del proyecto')
      } finally {
        setLoadingListas(false)
      }
    }

    if (open) {
      cargarListas()
      // 🔄 Reset estados al abrir modal
      setSeleccionados({})
      setSearchTerm('')
    }
  }, [proyectoId, open])

  // 📡 Cargar items de la lista seleccionada
  useEffect(() => {
    const cargarItems = async () => {
      if (!listaId) return

      try {
        setLoadingItems(true)
        const data = await getListaEquipoItemsByLista(listaId)
        setItems(data || [])

        // 🎯 Identificar items ya agregados a esta cotización
        const idsAgregados = new Set(
          cotizacion.items
            ?.map((i) => i.listaEquipoItemId)
            .filter((id): id is string => !!id)
        )
        setYaAgregados(idsAgregados)

        // 🎨 Identificar items que tienen cotizaciones (de cualquier proveedor)
        const idsConCotizacion = new Set(
          data
            ?.filter(item => item.cotizaciones && item.cotizaciones.length > 0)
            .map(item => item.id) || []
        )
        setItemsConCotizacion(idsConCotizacion)
      } catch (error) {
        console.error('❌ Error al cargar items:', error)
        toast.error('Error al cargar items de la lista')
      } finally {
        setLoadingItems(false)
      }
    }

    cargarItems()
  }, [listaId, cotizacion])

  // 🎯 Funciones de utilidad
  const toggleSeleccion = (item: ListaEquipoItem, checked: boolean) => {
    setSeleccionados((prev) => {
      const updated = { ...prev }
      if (checked) updated[item.id] = item
      else delete updated[item.id]
      return updated
    })
  }

  // 🔍 Filtrar items por búsqueda
  const itemsFiltrados = items.filter(item => 
    item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 📊 Estadísticas de items
  const estadisticas = {
    total: items.length,
    conCotizacion: itemsConCotizacion.size,
    sinCotizacion: items.length - itemsConCotizacion.size,
    yaAgregados: yaAgregados.size,
    seleccionados: Object.keys(seleccionados).length
  }

  // 🎨 Obtener estilo del item según su estado
  const getItemStyle = (item: ListaEquipoItem) => {
    const yaAgregado = yaAgregados.has(item.id)
    const tieneCotizacion = itemsConCotizacion.has(item.id)
    const seleccionado = !!seleccionados[item.id]

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
    if (Object.keys(seleccionados).length === 0) return
    try {
      setLoading(true)
      const promises = Object.values(seleccionados).map((item) =>
        createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: item.listaId || listaId,
          listaEquipoItemId: item.id,
        })
      )
      await Promise.all(promises)
      toast.success('✅ Ítems agregados correctamente')
      setSeleccionados({})
      onAdded?.()
      onClose()
    } catch (err) {
      toast.error('❌ Error al agregar ítems')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            {/* 📋 Header mejorado - Fixed */}
            <div className="flex-shrink-0 p-6 pb-4 border-b">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold">
                      Agregar Ítems a Cotización
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Proveedor: <span className="font-medium">{cotizacion.proveedor?.nombre}</span>
                    </p>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* 📜 Contenido con scroll optimizado */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* 📊 Estadísticas rápidas */}
                  <motion.div
                    className="grid grid-cols-2 md:grid-cols-5 gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Package className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <p className="text-lg font-bold text-gray-900">{estadisticas.total}</p>
                      <p className="text-xs text-gray-600">Total Items</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <p className="text-lg font-bold text-green-700">{estadisticas.conCotizacion}</p>
                      <p className="text-xs text-green-600">Con Cotización</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <AlertCircle className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                      <p className="text-lg font-bold text-orange-700">{estadisticas.sinCotizacion}</p>
                      <p className="text-xs text-orange-600">Sin Cotización</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <FileText className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <p className="text-lg font-bold text-gray-700">{estadisticas.yaAgregados}</p>
                      <p className="text-xs text-gray-600">Ya Agregados</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Calculator className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <p className="text-lg font-bold text-blue-700">{estadisticas.seleccionados}</p>
                      <p className="text-xs text-blue-600">Seleccionados</p>
                    </div>
                  </motion.div>

                  {/* 🎯 Selector de lista */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="text-sm font-medium mb-2 block">Lista de Equipos:</label>
                    <Select value={listaId} onValueChange={setListaId} disabled={loadingListas}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar Lista de Equipos" />
                      </SelectTrigger>
                      <SelectContent>
                        {listas.map((lista) => (
                          <SelectItem key={lista.id} value={lista.id}>
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-gray-500" />
                              <span>{lista.codigo} - {lista.nombre}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>

                  {/* 🔍 Barra de búsqueda */}
                  {listaId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="relative"
                    >
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por descripción o código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </motion.div>
                  )}

                  {/* 📋 Lista de items - Sin ScrollArea anidado */}
                  {listaId && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="border rounded-lg">
                        <div className="p-4 max-h-80 overflow-y-auto">
                          {loadingItems ? (
                            // 🔄 Loading state
                            <div className="space-y-3">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                    <div className="flex-1">
                                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                    <div className="w-16 h-6 bg-gray-200 rounded"></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : itemsFiltrados.length === 0 ? (
                            // 📭 Empty state
                            <div className="text-center py-8">
                              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-500 mb-2">
                                {searchTerm ? 'No se encontraron items' : 'No hay items en esta lista'}
                              </p>
                              {searchTerm && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSearchTerm('')}
                                >
                                  Limpiar búsqueda
                                </Button>
                              )}
                            </div>
                          ) : (
                            // 📋 Lista de items
                            <AnimatePresence>
                              <div className="space-y-2">
                                {itemsFiltrados.map((item, index) => {
                                  const yaAgregado = yaAgregados.has(item.id)
                                  const itemStyle = getItemStyle(item)
                                  
                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      transition={{ delay: index * 0.05 }}
                                      className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-200 ${itemStyle.className}`}
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <Checkbox
                                          checked={!!seleccionados[item.id]}
                                          onCheckedChange={(checked) =>
                                            !yaAgregado && toggleSeleccion(item, !!checked)
                                          }
                                          disabled={yaAgregado}
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
                                        <Badge variant={itemStyle.badge.variant as "outline" | "default" | "secondary"} className="text-xs">
                                          {itemStyle.badge.text}
                                        </Badge>
                                      </div>
                                    </motion.div>
                                  )
                                })}
                              </div>
                            </AnimatePresence>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 📋 Resumen de selección */}
                  <AnimatePresence>
                    {Object.keys(seleccionados).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-blue-900">
                            Ítems Seleccionados ({Object.keys(seleccionados).length})
                          </h3>
                        </div>
                        <div className="grid gap-2 max-h-32 overflow-y-auto">
                          {Object.values(seleccionados).map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm bg-white rounded p-2">
                              <span className="font-medium">{item.descripcion}</span>
                              <span className="text-gray-500">({item.codigo})</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>

            {/* 🎯 Botones de acción - Fijos en la parte inferior */}
            <div className="flex-shrink-0 p-6 pt-4 border-t bg-white">
              <motion.div
                className="flex justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setModalMultiListaOpen(true)}
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Agregar de Múltiples Listas
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAgregar}
                    disabled={loading || Object.keys(seleccionados).length === 0}
                    className="min-w-[160px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar ({Object.keys(seleccionados).length})
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* 🎯 Modal Multi-Lista */}
      <SelectorMultiListaModal
        open={modalMultiListaOpen}
        onClose={() => setModalMultiListaOpen(false)}
        cotizacion={cotizacion}
        proyectoId={proyectoId}
        onAdded={() => {
          onAdded?.()
          setModalMultiListaOpen(false)
        }}
      />
    </>
  )
}
