// ===================================================
// 📁 Archivo: ModalCrearCotizacionDesdeLista.tsx
// 📌 Descripción: Modal para crear cotización desde una lista específica
// 📌 Propósito: Crear cotización con proveedor e items de lista preseleccionada
// ✍️ Autor: Sistema GYS
// 📅 Actualizado: 2025-01-27
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Truck,
  Building2,
} from 'lucide-react'

import type {
  ListaEquipo,
  ListaEquipoItem,
  Proyecto,
  Proveedor,
} from '@/types'

import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedor } from '@/lib/services/cotizacionProveedor'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import { getProveedores } from '@/lib/services/proveedor'

interface Props {
  open: boolean
  onClose: () => void
  lista: ListaEquipo
  proyecto: Proyecto
  onCreated?: () => void
}

export default function ModalCrearCotizacionDesdeLista({
  open,
  onClose,
  lista,
  proyecto,
  onCreated,
}: Props) {
  const router = useRouter()
  // 🎯 Estados principales
  const [proveedorId, setProveedorId] = useState('')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [seleccionados, setSeleccionados] = useState<Record<string, ListaEquipoItem>>({})
  const [itemsConCotizacion, setItemsConCotizacion] = useState<Set<string>>(new Set())

  // 🔄 Estados de carga y UI
  const [loading, setLoading] = useState(false)
  const [loadingProveedores, setLoadingProveedores] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // 📡 Cargar proveedores
  useEffect(() => {
    const cargarProveedores = async () => {
      if (!open) return

      try {
        setLoadingProveedores(true)
        const data = await getProveedores()
        setProveedores(data || [])
      } catch (error) {
        console.error('❌ Error al cargar proveedores:', error)
        toast.error('Error al cargar proveedores')
      } finally {
        setLoadingProveedores(false)
      }
    }

    cargarProveedores()
  }, [open])

  // 📡 Cargar items de la lista
  useEffect(() => {
    const cargarItems = async () => {
      if (!open || !lista?.id) return

      try {
        setLoadingItems(true)
        const data = await getListaEquipoItemsByLista(lista.id)
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
  }, [lista?.id, open])

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

  const handleCrear = async () => {
    if (!proveedorId) {
      toast.error('Selecciona un proveedor')
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
        proyectoId: proyecto.id,
        proveedorId,
      })

      if (!cotizacion) {
        throw new Error('No se pudo crear la cotización')
      }

      // 🎯 Agregar los items seleccionados
      const promises = Object.values(seleccionados).map((item) =>
        createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: lista.id,
          listaEquipoItemId: item.id,
        })
      )

      await Promise.all(promises)

      toast.success('✅ Cotización creada correctamente desde la lista')
      setSeleccionados({})
      setProveedorId('')
      setSearchTerm('')
      onCreated?.()
      onClose()

      // Redirigir a la página de detalle de la cotización
      router.push(`/logistica/cotizaciones/${cotizacion.id}`)
    } catch (err) {
      console.error('Error al crear cotización desde lista:', err)
      toast.error('❌ Error al crear la cotización')
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setProveedorId('')
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Plus className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    Crear Cotización desde Lista
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Lista: {lista?.codigo} • Proyecto: {proyecto?.codigo} - {proyecto?.nombre}
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* 📜 Contenido con scroll optimizado */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* 🎯 Selección de Proveedor */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <div className="p-4 bg-blue-50 rounded-full w-16 h-16 mx-auto mb-4">
                      <Truck className="h-8 w-8 text-blue-600 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Seleccionar Proveedor
                    </h3>
                    <p className="text-gray-600">
                      Elige el proveedor para la nueva cotización
                    </p>
                  </div>

                  <div className="max-w-md mx-auto">
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Proveedor
                    </label>
                    <Select value={proveedorId} onValueChange={setProveedorId} disabled={loadingProveedores}>
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
                </motion.div>

                <Separator />

                {/* 📋 Selección de Items */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <div className="p-4 bg-green-50 rounded-full w-16 h-16 mx-auto mb-4">
                      <Package className="h-8 w-8 text-green-600 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Seleccionar Items
                    </h3>
                    <p className="text-gray-600">
                      Elige los items de la lista que deseas incluir en la cotización
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

                  {/* 🔍 Barra de búsqueda */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative max-w-md mx-auto"
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

                  {/* 📋 Lista de items */}
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
              <Button variant="outline" onClick={() => { resetModal(); onClose(); }} disabled={loading}>
                Cancelar
              </Button>
              <Button
                onClick={handleCrear}
                disabled={loading || !proveedorId || Object.keys(seleccionados).length === 0}
                className="min-w-[160px] bg-purple-600 hover:bg-purple-700"
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
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}