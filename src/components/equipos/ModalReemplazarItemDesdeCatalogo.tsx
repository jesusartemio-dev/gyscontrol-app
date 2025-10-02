// ===================================================
// 📁 Archivo: ModalReemplazarItemDesdeCatalogo.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para reemplazar un ítem "cotizado" por otro del catálogo
// ✅ Lógica:
//     - Crea un nuevo ListaEquipoItem con origen "reemplazo"
//     - Copia tanto proyectoEquipoItemId como reemplazaProyectoEquipoItemId desde el ítem original
//     - Actualiza ProyectoEquipoItem para apuntar al nuevo ítem
// 🎨 UX/UI: Diseño moderno con animaciones, estados de carga y feedback visual
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Hash,
  FileText,
  X
} from 'lucide-react'
import { toast } from 'sonner'

import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import {
  createListaEquipoItem,
  deleteListaEquipoItem,
  updateListaEquipoItem,
} from '@/lib/services/listaEquipoItem'
import { updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'

import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ListaEquipoItem,
} from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  item: ListaEquipoItem
  proyectoId: string
  listaId: string
  onUpdated?: () => void
}

export default function ModalReemplazarItemDesdeCatalogo({
  open,
  onClose,
  item,
  proyectoId,
  listaId,
  onUpdated,
}: Props) {
  const { data: session } = useSession()
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CatalogoEquipo | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🎨 Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  }

  const tableRowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  useEffect(() => {
    if (!open) return
    
    const fetchData = async () => {
      try {
        setInitialLoading(true)
        setError(null)
        
        const [e, c] = await Promise.all([
          getCatalogoEquipos(),
          getCategoriasEquipo(),
        ])
        
        setEquipos(e)
        setCategorias(c)
        
        // 🔄 Reset form when modal opens
        setSelected(null)
        setCantidad(1)
        setMotivoCambio('')
        setCategoriaFiltro('todas')
        setSearch('')
        
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Error al cargar los datos del catálogo')
        toast.error('Error al cargar los datos del catálogo')
      } finally {
        setInitialLoading(false)
      }
    }
    
    fetchData()
  }, [open])

  const handleSeleccionar = (equipo: CatalogoEquipo) => {
    setSelected(equipo)
    setCantidad(1)
    toast.success(`Equipo seleccionado: ${equipo.codigo}`)
  }



  // 🔍 Get filtered equipos with statistics
  const equiposFiltrados = equipos.filter((e) => {
    const coincideCategoria =
      categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
    const coincideTexto =
      e.codigo.toLowerCase().includes(search.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(search.toLowerCase())
    return coincideCategoria && coincideTexto
  })

  const handleReemplazar = async () => {
    if (!session?.user?.id) {
      toast.error('❌ No se pudo identificar el usuario. Inicia sesión nuevamente.')
      return
    }

    if (!selected || !cantidad || cantidad <= 0 || !motivoCambio.trim()) {
      toast.warning('⚠️ Completa todos los campos requeridos')
      return
    }

    if (item.origen !== 'cotizado') {
      toast.error('❌ Este modal solo aplica a ítems con origen "cotizado"')
      return
    }

    try {
      setLoading(true)

      const tieneCotizaciones = item.cotizaciones && item.cotizaciones.length > 0
      const proyectoEquipoItemId = item.proyectoEquipoItemId ?? undefined

      if (tieneCotizaciones) {
        // ✅ Ítem tiene cotizaciones → solo se rechaza y desvincula
        await updateListaEquipoItem(item.id, {
          estado: 'rechazado',
          proyectoEquipoItemId: undefined,
        })
      } else {
        // ✅ Ítem sin cotizaciones → se elimina
        await deleteListaEquipoItem(item.id)
      }

      // ✅ Crear nuevo ítem con origen "reemplazo" y doble vínculo al ProyectoEquipoItem original
      const nuevoItem = await createListaEquipoItem({
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        unidad: selected.unidad?.nombre ?? 'UND',
        cantidad,
        presupuesto: 0,
        comentarioRevision: motivoCambio,
        estado: 'borrador',
        origen: 'reemplazo',
        listaId,
        proyectoEquipoItemId: proyectoEquipoItemId,
        proyectoEquipoId: item.proyectoEquipoId,
        reemplazaProyectoEquipoCotizadoItemId: proyectoEquipoItemId,
        responsableId: session.user.id, // ✅ Agregar responsableId
      })

      // ✅ Actualizar ProyectoEquipoItem para que apunte al nuevo ítem
      if (proyectoEquipoItemId && nuevoItem) {
          await updateProyectoEquipoItem(proyectoEquipoItemId, {
            listaEquipoSeleccionadoId: nuevoItem.id,
            listaId: listaId,
            estado: 'reemplazado',
            motivoCambio: motivoCambio.trim(),
          })
      }

      toast.success('✅ Ítem reemplazado correctamente')
      onUpdated?.()
      onClose()

    } catch (error) {
      console.error('Error al reemplazar ítem:', error)
      toast.error('❌ No se pudo reemplazar el ítem. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-[95vw] w-full h-[90vh] overflow-hidden p-0 flex flex-col">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
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
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                          <Input
                            placeholder="Buscar por código o descripción..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-8"
                          />
                          {search && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                              onClick={() => setSearch('')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Filtro por categoría */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Filtrar por categoría</label>
                        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Todas las categorías" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas las categorías</SelectItem>
                            {categorias.map((categoria) => (
                              <SelectItem key={categoria.id} value={categoria.id}>
                                {categoria.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Estadísticas rápidas */}
                    <div className="flex justify-between items-center text-xs text-gray-600 pt-2">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>Total: {equipos.length} equipos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Search className="h-3 w-3" />
                        <span>Filtrados: {equiposFiltrados.length} equipos</span>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Seleccionado: {selected.codigo}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 📋 Tabla de Equipos */}
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Equipos Disponibles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {initialLoading ? (
                      <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                          <p className="text-gray-600">{error}</p>
                          <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="mt-4"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reintentar
                          </Button>
                        </div>
                      </div>
                    ) : equiposFiltrados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No se encontraron equipos
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {search || categoriaFiltro !== 'todas'
                            ? 'Intenta ajustar los filtros de búsqueda'
                            : 'No hay equipos disponibles en el catálogo'}
                        </p>
                        {(search || categoriaFiltro !== 'todas') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearch('')
                              setCategoriaFiltro('todas')
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Limpiar filtros
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px] w-full border rounded-md overflow-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr className="border-b">
                              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '4%'}}>
                                 <CheckCircle2 className="h-4 w-4" />
                               </th>
                              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '25%'}}>
                                <div className="flex items-center gap-2">
                                  <Hash className="h-3 w-3" />
                                  Código
                                </div>
                              </th>
                              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '60%'}}>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3" />
                                  Descripción
                                </div>
                              </th>
                              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '15%'}}>
                                Unidad
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {equiposFiltrados.map((equipo, index) => (
                              <motion.tr
                                key={equipo.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                                  selected?.id === equipo.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                                }`}
                                onClick={() => handleSeleccionar(equipo)}
                              >
                                <td className="py-3 px-3 whitespace-nowrap" style={{width: '4%'}}>
                                  <div className="flex justify-center">
                                    {selected?.id === equipo.id ? (
                                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <div className="h-4 w-4 border border-gray-300 rounded" />
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-sm font-medium text-gray-900" style={{width: '25%'}}>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {equipo.codigo}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-sm text-gray-700" style={{width: '60%'}}>
                                  {equipo.descripcion}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-500" style={{width: '15%'}}>
                                  <Badge variant="outline" className="text-xs">
                                    {equipo.unidad?.nombre || 'UND'}
                                  </Badge>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* 📝 Panel de configuración del reemplazo */}
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Configuración del Reemplazo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Equipo seleccionado */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  <Hash className="h-3 w-3 mr-1" />
                                  {selected.codigo}
                                </Badge>
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Seleccionado
                                </Badge>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-2">
                                {selected.descripcion}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {selected.unidad?.nombre || 'UND'}
                                </span>

                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Configuración */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Hash className="h-3 w-3" />
                            Cantidad a reemplazar *
                          </label>
                          <Input
                            type="number"
                            min={1}
                            value={cantidad}
                            onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                            placeholder="Ingrese cantidad"
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            Motivo del reemplazo *
                          </label>
                          <Textarea
                            placeholder="Describe el motivo técnico o justificación para este reemplazo..."
                            value={motivoCambio}
                            onChange={(e) => setMotivoCambio(e.target.value)}
                            rows={3}
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </ScrollArea>

              {/* ✅ Footer con acciones */}
              <div className="border-t p-4 bg-gray-50 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {selected ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>
                          <strong>1</strong> equipo seleccionado
                        </span>
                        <Separator orientation="vertical" className="h-4" />

                      </div>
                    ) : (
                      <span className="text-gray-500">Selecciona un equipo para continuar</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={loading}
                      className="transition-all duration-200 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleReemplazar}
                      disabled={!selected || loading || !motivoCambio.trim() || cantidad <= 0}
                      className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md min-w-[120px]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesando reemplazo...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Reemplazar Equipo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
