// ===================================================
// 📁 Archivo: ModalReemplazarReemplazoDesdeCatalogo.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para reemplazar un ítem que ya es reemplazo
//                por otro equipo del catálogo, manteniendo la trazabilidad
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  Package,
  FileText,
  Hash,
  CheckCircle2,
  RefreshCw,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'
import {
  createListaEquipoItem,
  updateListaEquipoItem,
} from '@/lib/services/listaEquipoItem'

import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ListaEquipoItem,
} from '@/types'

import PedidosBloqueantesWarning, { type PedidoBloqueante } from './PedidosBloqueantesWarning'

interface Props {
  open: boolean
  onClose: () => void
  item: ListaEquipoItem
  listaId: string
  proyectoId: string
  onUpdated?: () => void
}

export default function ModalReemplazarReemplazoDesdeCatalogo({
  open,
  onClose,
  item,
  listaId,
  proyectoId,
  onUpdated,
}: Props) {
  const { data: session } = useSession()
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [selected, setSelected] = useState<CatalogoEquipo | null>(null)
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [cantidad, setCantidad] = useState(1)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pedidosBloqueantes, setPedidosBloqueantes] = useState<PedidoBloqueante[]>([])
  const [pedidosLoading, setPedidosLoading] = useState(false)

  useEffect(() => {
    if (open) {
      cargarDatos()
      fetchPedidosBloqueantes()
    }
  }, [open])

  const fetchPedidosBloqueantes = async () => {
    if (!item?.id) return
    setPedidosLoading(true)
    try {
      const res = await fetch(`/api/lista-equipo-item/${item.id}/pedidos-bloqueantes`)
      if (res.ok) {
        const data = await res.json()
        setPedidosBloqueantes(data.bloqueantes || [])
      } else {
        setPedidosBloqueantes([])
      }
    } catch {
      setPedidosBloqueantes([])
    } finally {
      setPedidosLoading(false)
    }
  }

  const cargarDatos = async () => {
    setInitialLoading(true)
    setError(null)
    try {
      const [equiposData, categoriasData] = await Promise.all([
        getCatalogoEquipos(),
        getCategoriasEquipo(),
      ])
      setEquipos(equiposData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Error al cargar datos:', error)
      setError('Error al cargar los datos del catálogo')
      toast.error('❌ Error al cargar los datos del catálogo')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSeleccionar = (equipo: CatalogoEquipo) => {
    setSelected(equipo)
    setCantidad(1)
  }

  const handleReemplazar = async () => {
    if (!session?.user?.id) {
      toast.error('❌ No se pudo identificar el usuario. Inicia sesión nuevamente.')
      return
    }

    if (!selected || cantidad <= 0 || !motivoCambio.trim()) {
      toast.warning('Completa todos los campos')
      return
    }

    if (pedidosBloqueantes.length > 0) {
      toast.error('❌ El ítem tiene pedidos en curso — pásalos a borrador antes de reemplazar')
      return
    }

    try {
      setLoading(true)

      // ✅ Obtener el ProyectoEquipoItemId original (trazabilidad)
      const proyectoEquipoItemOriginal = item.reemplazaProyectoEquipoCotizadoItemId || item.proyectoEquipoItemId
      
      if (!proyectoEquipoItemOriginal) {
        throw new Error('No se pudo identificar el ProyectoEquipoItem original')
      }

      // ✅ Paso 1: Actualizar item actual a 'borrador' (reset al ser reemplazado)
      await updateListaEquipoItem(item.id, {
        estado: 'borrador',
      })

      // ✅ Paso 2: Crear nuevo ítem con origen "reemplazo" y trazabilidad correcta
      const nuevoItem = await createListaEquipoItem({
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        marca: selected.marca || '',
        unidad: selected.unidad?.nombre ?? 'UND',
        cantidad,
        presupuesto: 0,
        comentarioRevision: motivoCambio,
        estado: 'borrador',
        origen: 'reemplazo',
        listaId,
        proyectoEquipoItemId: proyectoEquipoItemOriginal,
        proyectoEquipoId: item.proyectoEquipoId,
        reemplazaProyectoEquipoCotizadoItemId: proyectoEquipoItemOriginal,
        responsableId: session.user.id,
      })

      // ✅ Paso 3: Actualizar ProyectoEquipoItem para que apunte al nuevo ítem
      if (nuevoItem) {
        await updateProyectoEquipoItem(proyectoEquipoItemOriginal, {
          listaEquipoSeleccionadoId: nuevoItem.id,
          listaId: listaId,
          estado: 'reemplazado',
          motivoCambio: motivoCambio.trim(),
          // ✅ Actualizar datos del nuevo equipo
          cantidadReal: cantidad,
          precioReal: selected.precioVenta || 0,
          costoReal: cantidad * (selected.precioVenta || 0),
        })
      }
      toast.success('✅ Ítem reemplazado correctamente')
      onUpdated?.()
      onClose()

    } catch (error) {
      console.error('Error al reemplazar ítem:', error)
      toast.error(`No se pudo reemplazar el ítem: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const equiposFiltrados = equipos.filter((e) => {
    const matchCategoria =
      categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
    const matchTexto =
      e.codigo.toLowerCase().includes(search.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(search.toLowerCase())
    return matchCategoria && matchTexto
  })

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-[95vw] w-full h-[90vh] overflow-hidden p-0 flex flex-col">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col h-full"
            >
              {/* 📋 Header */}
              <div className="flex items-center gap-3 p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-xl font-semibold text-gray-900">
                    Reemplazar Ítem desde Catálogo
                  </DialogTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Reemplaza "{item?.codigo}" por un equipo del catálogo
                  </p>
                </div>
              </div>

              <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">

              {/* ⚠️ Aviso de pedidos bloqueantes */}
              <PedidosBloqueantesWarning pedidos={pedidosBloqueantes} loading={pedidosLoading} />

              {/* 🔍 Filtros de búsqueda */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Search className="h-5 w-5 text-blue-600" />
                      Filtros de Búsqueda
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por código o descripción..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="relative min-w-[200px]">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Filtrar por categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas las categorías</SelectItem>
                            {categorias.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Estadísticas */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {equiposFiltrados.length} equipos
                        </span>
                        {categoriaFiltro !== 'todas' && (
                          <Badge variant="secondary" className="text-xs">
                            Filtrado por categoría
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 📋 Tabla de equipos del catálogo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      Catálogo de Equipos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {initialLoading ? (
                      <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : error ? (
                      <div className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={cargarDatos} variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reintentar
                        </Button>
                      </div>
                    ) : equiposFiltrados.length === 0 ? (
                      <div className="p-8 text-center">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay equipos</h3>
                        <p className="text-gray-600">
                          {search || categoriaFiltro !== 'todas'
                            ? 'No se encontraron equipos con los filtros aplicados'
                            : 'No hay equipos disponibles en el catálogo'}
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="text-left p-4 font-medium text-gray-700 w-[25%]">
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4" />
                                    Código
                                  </div>
                                </th>
                                <th className="text-left p-4 font-medium text-gray-700 w-[60%]">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Descripción
                                  </div>
                                </th>
                                <th className="text-left p-4 font-medium text-gray-700 w-[15%]">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Unidad
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <AnimatePresence>
                                {equiposFiltrados.map((equipo, index) => (
                                  <motion.tr
                                    key={equipo.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                                      selected?.id === equipo.id
                                        ? 'bg-blue-50 border-blue-200'
                                        : ''
                                    }`}
                                    onClick={() => handleSeleccionar(equipo)}
                                  >
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono text-xs">
                                          {equipo.codigo}
                                        </Badge>
                                        {selected?.id === equipo.id && (
                                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-medium text-gray-900">
                                        {equipo.descripcion}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <Badge variant="secondary">
                                        {equipo.unidad?.nombre || 'UND'}
                                      </Badge>
                                    </td>
                                  </motion.tr>
                                ))}
                              </AnimatePresence>
                            </tbody>
                          </table>
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* 📝 Configuración del Reemplazo */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Separator className="mb-6" />
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          Configuración del Reemplazo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Equipo seleccionado */}
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {selected.codigo}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {selected.unidad?.nombre || 'UND'}
                                </Badge>
                              </div>
                              <p className="font-medium text-gray-900">
                                {selected.descripcion}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Configuración */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="cantidad" className="text-sm font-medium flex items-center gap-2">
                              <Hash className="h-4 w-4" />
                              Cantidad a reemplazar
                            </Label>
                            <Input
                              id="cantidad"
                              type="number"
                              min="1"
                              value={cantidad}
                              onChange={(e) => setCantidad(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="motivo" className="text-sm font-medium flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Motivo del cambio
                            </Label>
                            <Textarea
                              id="motivo"
                              placeholder="Describe el motivo del reemplazo..."
                              value={motivoCambio}
                              onChange={(e) => setMotivoCambio(e.target.value)}
                              className="min-h-[80px] resize-none"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              </ScrollArea>

               {/* 🎯 Botones de acción */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.4 }}
                 className="flex justify-end gap-3 p-6 border-t bg-gray-50"
               >
                 <Button variant="outline" onClick={onClose} disabled={loading}>
                   <X className="h-4 w-4 mr-2" />
                   Cancelar
                 </Button>
                 <Button
                   onClick={handleReemplazar}
                   disabled={!selected || loading || !motivoCambio.trim() || pedidosBloqueantes.length > 0}
                   className="bg-blue-600 hover:bg-blue-700"
                 >
                   {loading ? (
                     <>
                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       Reemplazando...
                     </>
                   ) : (
                     <>
                       <CheckCircle2 className="h-4 w-4 mr-2" />
                       Reemplazar Equipo
                     </>
                   )}
                 </Button>
               </motion.div>
             </motion.div>
           </DialogContent>
         </Dialog>
       )}
     </AnimatePresence>
  )
}
