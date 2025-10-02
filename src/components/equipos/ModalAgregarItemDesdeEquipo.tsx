// ===================================================
// 📁 ModalAgregarItemDesdeEquipo.tsx
// 🔧 Lógica: Agrega ítems de ProyectoEquipoItem a la lista
//           → origen: 'cotizado'
//           → se usa createListaEquipoItemFromProyecto
// ✨ UX/UI: Diseño moderno con animaciones y estados mejorados
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DebugLogger, useRenderTracker } from '@/components/debug/DebugLogger'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { ProyectoEquipoCotizadoItem } from '@/types'
import { createListaEquipoItemFromProyecto } from '@/lib/services/listaEquipoItem'
import { getProyectoEquipoItemsDisponibles, updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'
import { toast } from 'sonner'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Package, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Filter,
  X,
  ShoppingCart
} from 'lucide-react'

interface Props {
  isOpen: boolean
  proyectoId: string
  listaId: string
  onClose: () => void
  onSuccess?: () => void
  onCreated?: () => Promise<void>
}

export default function ModalAgregarItemDesdeEquipo({ isOpen, proyectoId, listaId, onClose, onSuccess, onCreated }: Props) {
  const [items, setItems] = useState<ProyectoEquipoCotizadoItem[]>([])
  
  // 🐛 Debug logger to track re-renders
  const renderCount = useRenderTracker('ModalAgregarItemDesdeEquipo', [proyectoId, listaId, items?.length])
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(true)
  const [filtroGrupo, setFiltroGrupo] = useState('__ALL__')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const fetchDisponibles = async () => {
      try {
        setLoadingItems(true)
        const data = await getProyectoEquipoItemsDisponibles(proyectoId)
        setItems(data)
      } catch (error) {
        toast.error('Error al cargar los equipos disponibles')
        console.error('Error fetching items:', error)
      } finally {
        setLoadingItems(false)
      }
    }
    fetchDisponibles()
  }, [proyectoId])

  // ✅ Helper functions
  const getStatusBadge = (faltan: number) => {
    if (faltan <= 0) {
      return (
        <Badge variant="secondary" className="text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completo
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs">
        <AlertCircle className="w-3 h-3 mr-1" />
        Faltan {faltan}
      </Badge>
    )
  }

  // 🔍 Filter and search logic
  const itemsFiltrados = items.filter((item) => {
    const matchGrupo = filtroGrupo === '__ALL__' || item.proyectoEquipo?.nombre === filtroGrupo
    const matchBusqueda = busqueda === '' || 
      item.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    return matchGrupo && matchBusqueda
  })

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
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleAgregar = async () => {
    if (seleccionados.length === 0) {
      toast.warning('Debes seleccionar al menos un ítem', {
        description: 'Marca los equipos que deseas agregar a la lista'
      })
      return
    }

    const seleccionadosValidos = seleccionados.filter((itemId) => {
      const item = items.find((i) => i.id === itemId)
      const cantidadAgregada = item?.listaEquipos?.reduce((sum, le) => sum + (le.cantidad || 0), 0) || 0
      const faltan = (item?.cantidad || 0) - cantidadAgregada
      return faltan > 0
    })

    if (seleccionadosValidos.length === 0) {
      toast.warning('Todos los ítems seleccionados ya están completos', {
        description: 'Selecciona equipos que aún tengan cantidades pendientes'
      })
      return
    }

    try {
      setLoading(true)
      toast.loading(`Agregando ${seleccionadosValidos.length} equipos...`, {
        id: 'adding-items'
      })
      
      await Promise.all(
        seleccionadosValidos.map(async (itemId) => {
          await createListaEquipoItemFromProyecto(listaId, itemId)
          await updateProyectoEquipoItem(itemId, {
            estado: 'en_lista',
            listaId: listaId, // ✅ Asociar el ProyectoEquipoItem a la lista
          })
        })
      )

      toast.success(`✅ ${seleccionadosValidos.length} equipos agregados exitosamente`, {
        id: 'adding-items',
        description: 'Los equipos han sido añadidos a la lista técnica'
      })
      
      onSuccess?.()
      await onCreated?.()
      onClose()
    } catch (error) {
      console.error('Error adding items:', error)
      toast.error('❌ Error al agregar los equipos seleccionados', {
        id: 'adding-items',
        description: 'Inténtalo nuevamente o contacta al administrador'
      })
    } finally {
      setLoading(false)
    }
  }


  const gruposUnicos = Array.from(
    new Set(items.map((item) => item.proyectoEquipo?.nombre).filter(Boolean))
  )

  if (!isOpen) return null

  return (
    <>
      <DebugLogger componentName="ModalAgregarItemDesdeEquipo" props={{ proyectoId, listaId, itemsLength: items?.length, seleccionadosLength: seleccionados?.length }} />
      <AnimatePresence>
        <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[98vw] w-full h-[90vh] flex flex-col p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            <DialogHeader className="pb-3 pt-6 px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-gray-900">
                    Agregar Equipos Técnicos
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Selecciona los equipos que deseas agregar a la lista técnica
                  </p>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 h-0 px-6">

            {/* 🔍 Filtros y Búsqueda */}
            <Card className="mb-4">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros y Búsqueda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Búsqueda */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Buscar equipo</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por código o descripción..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-10 h-8"
                      />
                      {busqueda && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => setBusqueda('')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filtro por Grupo */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Filtrar por equipo</label>
                    <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Todos los equipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ALL__">
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            Todos los equipos
                          </div>
                        </SelectItem>
                        {gruposUnicos.map((grupo) => (
                          <SelectItem key={grupo} value={grupo}>
                            <div className="flex items-center gap-2">
                              <Package className="h-3 w-3" />
                              {grupo}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Estadísticas rápidas */}
                <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <span>Total: {items.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    <span>Filtrados: {itemsFiltrados.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Seleccionados: {seleccionados.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 📊 Tabla de Equipos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Equipos Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingItems ? (
                  // 🔄 Loading State
                  <div className="space-y-3 p-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : itemsFiltrados.length === 0 ? (
                  // 📭 Empty State
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="p-3 bg-gray-100 rounded-full mb-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No se encontraron equipos
                    </h3>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                      {busqueda || filtroGrupo !== '__ALL__' 
                        ? 'Intenta ajustar los filtros de búsqueda'
                        : 'No hay equipos disponibles para agregar a la lista'
                      }
                    </p>
                    {(busqueda || filtroGrupo !== '__ALL__') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setBusqueda('')
                          setFiltroGrupo('__ALL__')
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  // 📋 Tabla con datos
                  <ScrollArea className="h-[600px] w-full border rounded-md overflow-auto">
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="min-w-full"
                    >
                      <table className="w-full text-sm table-fixed">
                        <thead className="bg-gray-50 border-b sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-3 text-center font-medium text-gray-700" style={{width: '4%'}}>
                              <CheckCircle className="h-4 w-4 mx-auto" />
                            </th>
                            <th className="px-3 py-3 text-left font-medium text-gray-700" style={{width: '52%'}}>Código y Descripción</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700" style={{width: '18%'}}>Cant./Estado</th>
                            <th className="px-3 py-3 text-left font-medium text-gray-700" style={{width: '26%'}}>Equipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsFiltrados.map((item, index) => {
                            const cantidadAgregada = item.listaEquipos?.reduce((sum, le) => sum + (le.cantidad || 0), 0) || 0
                            const faltan = item.cantidad - cantidadAgregada
                            const yaCompletado = faltan <= 0
                            const isSelected = seleccionados.includes(item.id)
                            
                            // 🔍 Debug: Log each render of motion.tr
                // console.log('🔍 ModalAgregarItemDesdeEquipo - Rendering motion.tr for item:', item.id, { yaCompletado, faltan, isSelected })
                            
                            return (
                              <motion.tr
                                key={item.id}
                                variants={{
                                  hidden: { opacity: 0, y: 20 },
                                  visible: { 
                                    opacity: 1, 
                                    y: 0,
                                    transition: {
                                      duration: 0.3,
                                      ease: [0, 0, 0.2, 1] as const
                                    }
                                  }
                                }}
                                className={`border-b transition-colors ${
                                  yaCompletado 
                                    ? 'bg-gray-50 text-gray-400' 
                                    : isSelected
                                    ? 'bg-blue-50 hover:bg-blue-100'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <td className="px-1 py-3 text-center" style={{width: '4%'}}>
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={yaCompletado}
                                    onCheckedChange={() => toggleSeleccion(item.id)}
                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                  />
                                </td>
                                <td className="px-3 py-3" style={{width: '52%'}}>
                                  <div className="space-y-1">
                                    <div className="font-medium text-gray-900 text-sm">
                                      {item.codigo}
                                    </div>
                                    <div className="text-gray-700 text-xs break-words leading-relaxed" title={item.descripcion}>
                                      {item.descripcion}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center" style={{width: '18%'}}>
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm">
                                      {item.cantidad}
                                    </div>
                                    <div className="flex justify-center">
                                      {getStatusBadge(faltan)}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3" style={{width: '26%'}}>
                                  <div className="text-sm text-gray-600 break-words leading-relaxed" title={item.proyectoEquipo?.nombre}>
                                    {item.proyectoEquipo?.nombre || '—'}
                                  </div>
                                </td>
                              </motion.tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
            </ScrollArea>

            {/* 🎯 Botones de Acción */}
            <div className="flex-shrink-0 px-6 pb-6">
              <Separator className="mb-4" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {seleccionados.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{seleccionados.length} equipo{seleccionados.length !== 1 ? 's' : ''} seleccionado{seleccionados.length !== 1 ? 's' : ''}</span>
                    </motion.div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    disabled={loading}
                    className="min-w-[100px]"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  
                  <Button 
                    onClick={handleAgregar} 
                    disabled={loading || seleccionados.length === 0}
                    className="min-w-[140px] bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar {seleccionados.length > 0 ? `(${seleccionados.length})` : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </DialogContent>
        </Dialog>
      </AnimatePresence>
    </>
  )
}
