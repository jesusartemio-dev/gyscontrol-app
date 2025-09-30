// ===================================================
// 📁 Archivo: ModalCrearCotizacionCompleta.tsx
// 📌 Descripción: Modal completo para crear cotización con proveedor e items
// 📌 Propósito: UX integrada para crear cotización completa en un paso
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
  Building2,
  Truck,
} from 'lucide-react'

import type {
  ListaEquipo,
  ListaEquipoItem,
  Proyecto,
  Proveedor,
} from '@/types'

import { getListaPorProyecto } from '@/lib/services/listaPorProyecto'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedor } from '@/lib/services/cotizacionProveedor'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'

interface Props {
  open: boolean
  onClose: () => void
  proyectos: Proyecto[]
  proveedores: Proveedor[]
  onCreated?: () => void
}

export default function ModalCrearCotizacionCompleta({
  open,
  onClose,
  proyectos,
  proveedores,
  onCreated,
}: Props) {
  // 🎯 Estados principales
  const [pasoActual, setPasoActual] = useState<'proveedor' | 'items'>('proveedor')
  const [proyectoId, setProyectoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [listaId, setListaId] = useState('')
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [seleccionados, setSeleccionados] = useState<Record<string, ListaEquipoItem>>({})
  const [itemsConCotizacion, setItemsConCotizacion] = useState<Set<string>>(new Set())

  // 🔄 Estados de carga y UI
  const [loading, setLoading] = useState(false)
  const [loadingListas, setLoadingListas] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // 📡 Cargar listas del proyecto seleccionado
  useEffect(() => {
    const cargarListas = async () => {
      if (!proyectoId) {
        setListas([])
        setListaId('')
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

    if (open && proyectoId) {
      cargarListas()
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
  }, [listaId])

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
    seleccionados: Object.keys(seleccionados).length
  }

  // 🎨 Obtener estilo del item según su estado
  const getItemStyle = (item: ListaEquipoItem) => {
    const tieneCotizacion = itemsConCotizacion.has(item.id)
    const seleccionado = !!seleccionados[item.id]

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

  const handleSiguiente = () => {
    if (pasoActual === 'proveedor') {
      if (!proyectoId || !proveedorId) {
        toast.error('Selecciona proyecto y proveedor')
        return
      }
      setPasoActual('items')
    }
  }

  const handleAnterior = () => {
    if (pasoActual === 'items') {
      setPasoActual('proveedor')
    }
  }

  const handleCrear = async () => {
    if (!proyectoId || !proveedorId) {
      toast.error('Selecciona proyecto y proveedor')
      return
    }

    if (Object.keys(seleccionados).length === 0) {
      toast.error('Selecciona al menos un item')
      return
    }

    try {
      setLoading(true)

      // 🎯 Crear la cotización primero
      const cotizacion = await createCotizacionProveedor({
        proyectoId,
        proveedorId,
      })

      if (!cotizacion) {
        throw new Error('No se pudo crear la cotización')
      }

      // 🎯 Agregar los items seleccionados
      const promises = Object.values(seleccionados).map((item) =>
        createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: item.listaId || listaId,
          listaEquipoItemId: item.id,
        })
      )

      await Promise.all(promises)

      toast.success('✅ Cotización completa creada correctamente')
      setSeleccionados({})
      setProyectoId('')
      setProveedorId('')
      setListaId('')
      setPasoActual('proveedor')
      onCreated?.()
      onClose()
    } catch (err) {
      console.error('Error al crear cotización completa:', err)
      toast.error('❌ Error al crear la cotización completa')
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setPasoActual('proveedor')
    setProyectoId('')
    setProveedorId('')
    setListaId('')
    setSeleccionados({})
    setSearchTerm('')
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { resetModal(); onClose(); } }}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col h-full"
        >
          {/* 📋 Header mejorado */}
          <div className="flex-shrink-0 p-6 pb-4 border-b">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Plus className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    Crear Cotización Completa
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Selecciona proveedor e items en un solo paso
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* 📍 Indicador de pasos */}
            <div className="flex items-center gap-4 mt-4">
              <div className={`flex items-center gap-2 ${pasoActual === 'proveedor' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  pasoActual === 'proveedor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <span className="text-sm font-medium">Proveedor</span>
              </div>
              <div className={`h-px flex-1 ${pasoActual === 'items' ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`flex items-center gap-2 ${pasoActual === 'items' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  pasoActual === 'items' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <span className="text-sm font-medium">Items</span>
              </div>
            </div>
          </div>

          {/* 📜 Contenido con scroll optimizado */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* 🎯 PASO 1: Selección de Proveedor */}
                <AnimatePresence mode="wait">
                  {pasoActual === 'proveedor' && (
                    <motion.div
                      key="proveedor"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="text-center">
                        <div className="p-4 bg-blue-50 rounded-full w-16 h-16 mx-auto mb-4">
                          <Truck className="h-8 w-8 text-blue-600 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Seleccionar Proveedor
                        </h3>
                        <p className="text-gray-600">
                          Elige el proyecto y proveedor para la nueva cotización
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div>
                          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Proyecto
                          </label>
                          <Select value={proyectoId} onValueChange={setProyectoId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar proyecto" />
                            </SelectTrigger>
                            <SelectContent>
                              {proyectos.map((proyecto) => (
                                <SelectItem key={proyecto.id} value={proyecto.id}>
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-gray-500" />
                                    <span>{proyecto.codigo} - {proyecto.nombre}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Proveedor
                          </label>
                          <Select value={proveedorId} onValueChange={setProveedorId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar proveedor" />
                            </SelectTrigger>
                            <SelectContent>
                              {proveedores.map((proveedor) => (
                                <SelectItem key={proveedor.id} value={proveedor.id}>
                                  {proveedor.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 🎯 PASO 2: Selección de Items */}
                  {pasoActual === 'items' && (
                    <motion.div
                      key="items"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="text-center">
                        <div className="p-4 bg-green-50 rounded-full w-16 h-16 mx-auto mb-4">
                          <Package className="h-8 w-8 text-green-600 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Seleccionar Items
                        </h3>
                        <p className="text-gray-600">
                          Elige los items que deseas incluir en la cotización
                        </p>
                      </div>

                      {/* 📊 Estadísticas rápidas */}
                      <motion.div
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
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

                      {/* 📋 Lista de items */}
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
                                                toggleSeleccion(item, !!checked)
                                              }
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* 🎯 Botones de acción */}
          <div className="flex-shrink-0 p-6 pt-4 border-t bg-white">
            <motion.div
              className="flex justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div>
                {pasoActual === 'items' && (
                  <Button variant="outline" onClick={handleAnterior} disabled={loading}>
                    ← Anterior
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { resetModal(); onClose(); }} disabled={loading}>
                  Cancelar
                </Button>

                {pasoActual === 'proveedor' ? (
                  <Button
                    onClick={handleSiguiente}
                    disabled={!proyectoId || !proveedorId || loading}
                    className="min-w-[120px]"
                  >
                    Siguiente →
                  </Button>
                ) : (
                  <Button
                    onClick={handleCrear}
                    disabled={loading || Object.keys(seleccionados).length === 0}
                    className="min-w-[160px] bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Cotización ({Object.keys(seleccionados).length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}