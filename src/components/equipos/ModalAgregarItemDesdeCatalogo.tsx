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
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from 'sonner'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import { createListaEquipoItem } from '@/lib/services/listaEquipoItem'
import {
  Plus,
  Search,
  Package,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  X,
  ShoppingCart,
  Layers
} from 'lucide-react'
import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ProyectoEquipoCotizado,
} from '@/types'

interface Props {
  isOpen: boolean
  proyectoId: string
  listaId: string
  onClose: () => void
  onSuccess?: () => void
  onCreated?: () => Promise<void>
}

export default function ModalAgregarItemDesdeCatalogo({
  isOpen,
  proyectoId,
  listaId,
  onClose,
  onSuccess,
  onCreated,
}: Props) {
  const { data: session } = useSession()
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [secciones, setSecciones] = useState<ProyectoEquipoCotizado[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [search, setSearch] = useState('')
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [proyectoEquipoId, setProyectoEquipoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setInitialLoading(true)
        const [equiposData, categoriasData, seccionesData] = await Promise.all([
          getCatalogoEquipos(),
          getCategoriasEquipo(),
          getProyectoEquipos(proyectoId),
        ])
        setEquipos(equiposData)
        setCategorias(categoriasData)
        setSecciones(seccionesData)
      } catch (error) {
        console.error('❌ Error al cargar datos:', error)
        toast.error('❌ Error al cargar los datos del catálogo')
      } finally {
        setInitialLoading(false)
      }
    }
    fetchData()
  }, [proyectoId])

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleAgregar = async () => {
    if (!session?.user?.id) {
      toast.error('❌ No se pudo identificar el usuario. Inicia sesión nuevamente.')
      return
    }

    if (seleccionados.length === 0 || !proyectoEquipoId) {
      toast.warning('Selecciona al menos un equipo y el grupo del proyecto')
      return
    }

    try {
      setLoading(true)
      for (const id of seleccionados) {
        const equipo = equipos.find((e) => e.id === id)
        if (!equipo) continue

        await createListaEquipoItem({
          listaId,
          proyectoEquipoId,
          responsableId: session.user.id, // ✅ Agregar responsableId
          codigo: equipo.codigo,
          descripcion: equipo.descripcion,
          unidad: equipo.unidad?.nombre || 'UND',
          cantidad: 1,
          presupuesto: equipo.precioVenta ?? 0,
          origen: 'nuevo',
          estado: 'borrador',
        })
      }

      toast.success('✅ Equipos agregados correctamente')
      onSuccess?.()
      await onCreated?.()
      onClose()
    } catch (error) {
      console.error('❌ Error al agregar los equipos:', error)
      toast.error('❌ No se pudo agregar los equipos')
    } finally {
      setLoading(false)
    }
  }

  const equiposFiltrados = equipos.filter((e) => {
    const matchCategoria = categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
    const matchSearch = e.codigo.toLowerCase().includes(search.toLowerCase()) || e.descripcion.toLowerCase().includes(search.toLowerCase())
    return matchCategoria && matchSearch
  })

  const seleccionadosPreview = equipos.filter((e) => seleccionados.includes(e.id))

  if (!isOpen) return null

  return (
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
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-gray-900">
                    Agregar Equipos desde Catálogo
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Selecciona equipos del catálogo para agregar a la lista técnica
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
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Seleccionados: {seleccionadosPreview.length} equipos</span>
                    </div>
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
                        </div>
                      ))}
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
                              <CheckCircle className="h-4 w-4" />
                            </th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '20%'}}>
                              Código
                            </th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '60%'}}>
                              Descripción
                            </th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '16%'}}>
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
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => toggleSeleccion(equipo.id)}
                            >
                              <td className="py-3 px-1 whitespace-nowrap" style={{width: '4%'}}>
                                 <Checkbox
                                   checked={seleccionados.includes(equipo.id)}
                                   onCheckedChange={() => toggleSeleccion(equipo.id)}
                                   className="mx-auto"
                                 />
                               </td>
                              <td className="py-3 px-3 whitespace-nowrap text-sm font-medium text-gray-900" style={{width: '20%'}}>
                                {equipo.codigo}
                              </td>
                              <td className="py-3 px-3 text-sm text-gray-700" style={{width: '60%'}}>
                                {equipo.descripcion}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-500" style={{width: '16%'}}>
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

              {/* 🎯 Selección de Grupo */}
              {seleccionadosPreview.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <Card>
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Asignar a Grupo del Proyecto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-gray-600">
                        <strong>Equipos seleccionados ({seleccionadosPreview.length}):</strong>
                      </div>
                      <div className="max-h-20 overflow-y-auto">
                        <div className="flex flex-wrap gap-1">
                          {seleccionadosPreview.map((equipo) => (
                            <Badge key={equipo.id} variant="secondary" className="text-xs">
                              {equipo.codigo}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Select value={proyectoEquipoId} onValueChange={setProyectoEquipoId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona grupo del proyecto" />
                        </SelectTrigger>
                        <SelectContent>
                          {secciones.map((seccion) => (
                            <SelectItem key={seccion.id} value={seccion.id}>
                              {seccion.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </ScrollArea>

            {/* 🎯 Botones de Acción */}
            <div className="flex-shrink-0 px-6 pb-6">
              <Separator className="mb-4" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {seleccionadosPreview.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{seleccionadosPreview.length} equipo{seleccionadosPreview.length !== 1 ? 's' : ''} seleccionado{seleccionadosPreview.length !== 1 ? 's' : ''}</span>
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
                    disabled={loading || seleccionadosPreview.length === 0 || !proyectoEquipoId}
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
                        Agregar {seleccionadosPreview.length > 0 ? `(${seleccionadosPreview.length})` : ''}
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
  )
}
