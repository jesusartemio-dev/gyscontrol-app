'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Settings,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  X,
  Eye,
  EyeOff,
  Group,
  Ungroup,
  Tag,
  Layers,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@prisma/client'

// Extended type that includes items relation
type ProyectoEquipoCotizadoWithItems = ProyectoEquipoCotizado & {
  items: ProyectoEquipoCotizadoItem[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  proyectoEquipo: any
  proyectoId: string
  onDistribucionCompletada: (listaId: string) => void
}

export default function CrearListaMultipleModal({
  isOpen,
  onClose,
  proyectoEquipo,
  proyectoId,
  onDistribucionCompletada
}: Props) {
  const [itemsDisponibles, setItemsDisponibles] = useState<ProyectoEquipoCotizadoItem[]>([])
  const [itemsSeleccionados, setItemsSeleccionados] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)
  const [nombreLista, setNombreLista] = useState('')
  const [descripcionLista, setDescripcionLista] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('__ALL__')
  const [busqueda, setBusqueda] = useState('')
  const [agruparPorCategoria, setAgruparPorCategoria] = useState(false)
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null)
  const [codigoLista, setCodigoLista] = useState('')
  const [fechaRequerida, setFechaRequerida] = useState('')
  const router = useRouter()

  // Función para cargar items disponibles desde la base de datos
  const cargarItemsDisponibles = async () => {
    try {
      console.log('🔍 Cargando items disponibles para ProyectoEquipo:', proyectoEquipo.id)

      // ✅ Usar el mismo endpoint que el modal funcional
      const response = await fetch(`/api/proyecto-equipo-item/from-proyecto/${proyectoId}?soloDisponibles=true`)
      if (response.ok) {
        const items = await response.json()
        console.log('✅ Items obtenidos de API correcta:', items.length)

        // ✅ Filtrar solo los items que pertenecen a este ProyectoEquipo
        const itemsDeEsteEquipo = items.filter((item: any) =>
          item.proyectoEquipoId === proyectoEquipo.id
        )

        console.log('🎯 Items filtrados para este ProyectoEquipo:', itemsDeEsteEquipo.length)
        setItemsDisponibles(itemsDeEsteEquipo)
      } else {
        console.log('❌ API falló, usando fallback')
        // Fallback: usar datos del proyectoEquipo si falla la API
        const itemsSinAsignar = proyectoEquipo.items?.filter((item: any) =>
          !item.listaId // Solo items que NO están asignados a listas
        ) || []
        console.log('🔄 Items del fallback:', itemsSinAsignar.length)
        setItemsDisponibles(itemsSinAsignar)
      }
    } catch (error) {
      console.error('❌ Error cargando items disponibles:', error)
      // Fallback: usar datos del proyectoEquipo
      const itemsSinAsignar = proyectoEquipo.items?.filter((item: any) =>
        !item.listaId // Solo items que NO están asignados a listas
      ) || []
      console.log('🔄 Items del fallback por error:', itemsSinAsignar.length)
      setItemsDisponibles(itemsSinAsignar)
    }
  }

  // Función para obtener la categoría predominante
  const getCategoriaPredominante = (items: ProyectoEquipoCotizadoItem[]) => {
    const categorias = items.reduce((acc, item) => {
      const categoria = item.categoria || 'SIN-CATEGORIA'
      acc[categoria] = (acc[categoria] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const categoriaPredominante = Object.entries(categorias)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0]

    return categoriaPredominante && categoriaPredominante !== 'SIN-CATEGORIA'
      ? categoriaPredominante
      : 'Equipos'
  }

  // Función para obtener el código de lista preview
  const obtenerCodigoListaPreview = async () => {
    try {
      // Obtener información del proyecto
      const proyectoResponse = await fetch(`/api/proyecto/${proyectoId}`)
      if (!proyectoResponse.ok) {
        throw new Error('No se pudo obtener información del proyecto')
      }
      const proyecto = await proyectoResponse.json()

      // Obtener las listas existentes del proyecto para calcular el siguiente número
      const listasResponse = await fetch(`/api/lista-equipo?proyectoId=${proyectoId}`)
      let nextSequence = 1

      if (listasResponse.ok) {
        const listas = await listasResponse.json()
        if (listas.length > 0) {
          // Encontrar el número de secuencia más alto
          const maxSequence = Math.max(...listas.map((lista: any) => lista.numeroSecuencia || 0))
          nextSequence = maxSequence + 1
        }
      }

      // Generar código siguiendo el patrón exacto: {codigoProyecto}-LST-{correlativo}
      const codigo = `${proyecto.codigo}-LST-${String(nextSequence).padStart(3, '0')}`
      setCodigoLista(codigo)
    } catch (error) {
      console.error('Error obteniendo código de lista preview:', error)
      // Fallback: usar un código genérico
      setCodigoLista('CÓDIGO-PENDIENTE')
    }
  }

  // Inicializar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log('🎯 Modal Crear Lista Múltiple abierto para:', proyectoEquipo.nombre)

      // Obtener datos frescos de los items disponibles
      cargarItemsDisponibles()

      // Obtener código de lista preview
      obtenerCodigoListaPreview()

      // Resetear estado
      setItemsSeleccionados([])
      const categoriaPredominante = getCategoriaPredominante(proyectoEquipo.items || [])
      setNombreLista(`Lista de ${categoriaPredominante}`)
      setFiltroCategoria('__ALL__')
      setBusqueda('')
      // Reset fecha requerida
      setFechaRequerida('')
    }
  }, [isOpen, proyectoEquipo.id, proyectoId])

  // Toggle selección de item
  const toggleItemSeleccion = (itemId: string) => {
    setItemsSeleccionados(prev => {
      const nuevosSeleccionados = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]

      // Actualizar nombre basado en items seleccionados
      if (nuevosSeleccionados.length > 0) {
        const itemsSeleccionadosData = itemsDisponibles.filter(item =>
          nuevosSeleccionados.includes(item.id)
        )
        const categoriaPredominante = getCategoriaPredominante(itemsSeleccionadosData)
        setNombreLista(`Lista de ${categoriaPredominante}`)
        setDescripcionLista(`Lista técnica de ${categoriaPredominante} para ${proyectoEquipo.nombre}`)
      }

      return nuevosSeleccionados
    })
  }

  // Seleccionar todos los items filtrados
  const seleccionarTodos = () => {
    const itemsFiltrados = getItemsFiltrados()
    const idsFiltrados = itemsFiltrados.map(item => item.id)
    setItemsSeleccionados(prev => {
      const nuevosSeleccionados = [...new Set([...prev, ...idsFiltrados])]

      // Actualizar nombre basado en todos los items seleccionados
      const itemsSeleccionadosData = itemsDisponibles.filter(item =>
        nuevosSeleccionados.includes(item.id)
      )
      const categoriaPredominante = getCategoriaPredominante(itemsSeleccionadosData)
      setNombreLista(`Lista de ${categoriaPredominante}`)
      setDescripcionLista(`Lista técnica de ${categoriaPredominante} para ${proyectoEquipo.nombre}`)

      return nuevosSeleccionados
    })
  }

  // Deseleccionar todos
  const deseleccionarTodos = () => {
    setItemsSeleccionados([])
    // Resetear nombre por defecto
    const categoriaPredominante = getCategoriaPredominante(proyectoEquipo.items || [])
    setNombreLista(`Lista de ${categoriaPredominante}`)
    setDescripcionLista(`Lista técnica de ${categoriaPredominante} para ${proyectoEquipo.nombre}`)
  }

  // Obtener items filtrados
  const getItemsFiltrados = () => {
    return itemsDisponibles.filter(item => {
      const coincideBusqueda = busqueda === '' ||
        (item.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ?? false) ||
        (item.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ?? false) ||
        (item.categoria?.toLowerCase().includes(busqueda.toLowerCase()) ?? false) ||
        (item.unidad?.toLowerCase().includes(busqueda.toLowerCase()) ?? false)

      const coincideCategoria = filtroCategoria === '__ALL__' ||
        item.categoria === filtroCategoria

      return coincideBusqueda && coincideCategoria
    })
  }

  // Agrupar items por categoría
  const getItemsAgrupadosPorCategoria = () => {
    const itemsFiltrados = getItemsFiltrados()
    const agrupados: Record<string, ProyectoEquipoCotizadoItem[]> = {}

    itemsFiltrados.forEach(item => {
      const categoria = item.categoria || 'SIN-CATEGORIA'
      if (!agrupados[categoria]) {
        agrupados[categoria] = []
      }
      agrupados[categoria].push(item)
    })

    return agrupados
  }

  // Seleccionar/deseleccionar todos los items de una categoría
  const toggleCategoriaSeleccion = (categoria: string, seleccionar: boolean) => {
    const itemsDeCategoria = itemsDisponibles.filter(item =>
      (item.categoria || 'SIN-CATEGORIA') === categoria
    )
    const idsDeCategoria = itemsDeCategoria.map(item => item.id)

    setItemsSeleccionados(prev => {
      if (seleccionar) {
        return [...new Set([...prev, ...idsDeCategoria])]
      } else {
        return prev.filter(id => !idsDeCategoria.includes(id))
      }
    })
  }

  // Verificar si una categoría está completamente seleccionada
  const isCategoriaCompletamenteSeleccionada = (categoria: string) => {
    const itemsDeCategoria = itemsDisponibles.filter(item =>
      (item.categoria || 'SIN-CATEGORIA') === categoria
    )
    const idsDeCategoria = itemsDeCategoria.map(item => item.id)
    return idsDeCategoria.length > 0 &&
           idsDeCategoria.every(id => itemsSeleccionados.includes(id))
  }

  // Verificar si una categoría tiene items parcialmente seleccionados
  const isCategoriaParcialmenteSeleccionada = (categoria: string) => {
    const itemsDeCategoria = itemsDisponibles.filter(item =>
      (item.categoria || 'SIN-CATEGORIA') === categoria
    )
    const idsDeCategoria = itemsDeCategoria.map(item => item.id)
    const seleccionadosEnCategoria = idsDeCategoria.filter(id =>
      itemsSeleccionados.includes(id)
    )
    return seleccionadosEnCategoria.length > 0 &&
           seleccionadosEnCategoria.length < idsDeCategoria.length
  }

  // Obtener categorías únicas
  const getCategoriasUnicas = () => {
    const categorias = itemsDisponibles
      .map(item => ({ id: item.categoria || 'SIN-CATEGORIA', nombre: item.categoria || 'Sin Categoría' }))
      .filter((cat, index, self) =>
        cat.id && cat.id !== 'SIN-CATEGORIA' && self.findIndex(c => c.id === cat.id) === index
      )

    // Si no hay categorías, agregar algunas de ejemplo para que el filtro funcione
    if (categorias.length === 0 && itemsDisponibles.length > 0) {
      return [
        { id: 'ELECTRICO', nombre: 'Eléctrico' },
        { id: 'MECANICO', nombre: 'Mecánico' },
        { id: 'INSTRUMENTACION', nombre: 'Instrumentación' },
        { id: 'CONTROL', nombre: 'Control' }
      ]
    }

    return categorias
  }

  // Crear la lista
  const crearLista = async () => {
    if (!nombreLista.trim()) {
      toast.error('El nombre de la lista es obligatorio')
      return
    }

    if (!fechaRequerida) {
      toast.error('La fecha requerida es obligatoria')
      return
    }

    if (itemsSeleccionados.length === 0) {
      toast.error('Debe seleccionar al menos un item')
      return
    }

    try {
      setCargando(true)

      const payload = {
        proyectoId,
        proyectoEquipoId: proyectoEquipo.id,
        nombre: nombreLista.trim(),
        descripcion: descripcionLista.trim(),
        fechaNecesaria: fechaRequerida,
        itemsIds: itemsSeleccionados
      }

      const response = await fetch('/api/lista-equipo/from-proyecto-equipo/distribuir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Error creando la lista')
      }

      // Obtener la lista creada desde la respuesta
      const listaCreada = await response.json()

      toast.success(`✅ Lista "${nombreLista}" creada exitosamente con ${itemsSeleccionados.length} items`)

      // Navegar al detalle de la lista creada
      router.push(`/proyectos/${proyectoId}/equipos/listas/${listaCreada.id}`)

    } catch (error) {
      console.error('Error creando lista:', error)
      toast.error('❌ Error al crear la lista')
    } finally {
      setCargando(false)
    }
  }

  const itemsFiltrados = getItemsFiltrados()
  const categorias = getCategoriasUnicas()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-medium text-blue-900">Crear Lista Múltiple</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 h-[60vh] pr-6">
          <div className="space-y-4 pb-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre-lista" className="text-sm font-medium">Nombre *</Label>
                <Input
                  id="nombre-lista"
                  value={nombreLista}
                  onChange={(e) => setNombreLista(e.target.value)}
                  placeholder="Nombre de la lista"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="codigo-lista" className="text-sm font-medium">Código de Lista</Label>
                <Input
                  id="codigo-lista"
                  value={codigoLista}
                  readOnly
                  placeholder="Se generará automáticamente"
                  className="mt-1 bg-muted/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Código único que se asignará a la lista
                </p>
              </div>
              <div>
                <Label htmlFor="fecha-necesaria" className="text-sm font-medium">Fecha Necesaria *</Label>
                <Input
                  id="fecha-necesaria"
                  type="date"
                  value={fechaRequerida}
                  onChange={(e) => setFechaRequerida(e.target.value)}
                  className="mt-1"
                  min={new Date().toISOString().split('T')[0]} // No permitir fechas pasadas
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fecha límite para tener lista la compra
                </p>
              </div>
            </div>

            {/* Filtros y opciones avanzadas - Todo en una fila */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-sm font-medium">Buscar</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por código, descripción, categoría..."
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label className="text-sm font-medium">Categoría</Label>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todas</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={agruparPorCategoria ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAgruparPorCategoria(!agruparPorCategoria)}
                  className="h-9"
                >
                  {agruparPorCategoria ? (
                    <Ungroup className="h-4 w-4 mr-2" />
                  ) : (
                    <Group className="h-4 w-4 mr-2" />
                  )}
                  {agruparPorCategoria ? 'Sin agrupar' : 'Agrupar'}
                </Button>
              </div>
            </div>

            {/* Estadísticas minimalistas */}
            <div className="flex justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span>{itemsDisponibles.length} disponibles</span>
              <span>{itemsSeleccionados.length} seleccionados</span>
              <span>{itemsFiltrados.length} filtrados</span>
            </div>

            {/* Lista de items con scroll mejorado */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Items Disponibles ({itemsFiltrados.length})</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={seleccionarTodos}
                    disabled={itemsFiltrados.length === 0}
                    className="h-8 px-3 text-xs"
                  >
                    Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deseleccionarTodos}
                    disabled={itemsSeleccionados.length === 0}
                    className="h-8 px-3 text-xs"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="h-80 border rounded-lg overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">
                    {itemsFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No hay items disponibles</p>
                      </div>
                    ) : agruparPorCategoria ? (
                      // Vista agrupada por categoría
                      Object.entries(getItemsAgrupadosPorCategoria()).map(([categoria, itemsCategoria]) => {
                        const categoriaCompletamenteSeleccionada = isCategoriaCompletamenteSeleccionada(categoria)
                        const categoriaParcialmenteSeleccionada = isCategoriaParcialmenteSeleccionada(categoria)

                        return (
                          <div key={categoria} className="space-y-2">
                            {/* Header de categoría */}
                            <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {categoria === 'SIN-CATEGORIA' ? 'Sin Categoría' : categoria}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {itemsCategoria.length}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={categoriaCompletamenteSeleccionada}
                                  onChange={() => toggleCategoriaSeleccion(categoria, !categoriaCompletamenteSeleccionada)}
                                  className="h-4 w-4"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleCategoriaSeleccion(categoria, !categoriaCompletamenteSeleccionada)}
                                  className="h-6 px-2 text-xs"
                                >
                                  {categoriaCompletamenteSeleccionada ? 'Quitar' : 'Seleccionar'}
                                </Button>
                              </div>
                            </div>

                            {/* Items de la categoría */}
                            <div className="space-y-1 ml-4">
                              {itemsCategoria.map((item) => {
                                const isSelected = itemsSeleccionados.includes(item.id)
                                return (
                                  <div
                                    key={item.id}
                                    className={`p-3 border rounded cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => toggleItemSeleccion(item.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={() => toggleItemSeleccion(item.id)}
                                        className="pointer-events-none"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="font-medium text-sm truncate flex-1">
                                            {item.descripcion || item.codigo || 'Sin descripción'}
                                          </div>
                                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                            {item.categoria || 'Sin categoría'}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                          <span className="font-mono">{item.codigo}</span>
                                          <span>Cant: {item.cantidad || 0}</span>
                                          <span>{item.unidad || 'Sin unidad'}</span>
                                          <span className="text-green-600 font-medium">
                                            ${item.precioCliente?.toFixed(2) || '0.00'}
                                          </span>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      // Vista sin agrupar (lista plana)
                      itemsFiltrados.map((item) => {
                        const isSelected = itemsSeleccionados.includes(item.id)
                        return (
                          <div
                            key={item.id}
                            className={`p-3 border rounded cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleItemSeleccion(item.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleItemSeleccion(item.id)}
                                className="pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium text-sm truncate flex-1">
                                    {item.descripcion || item.codigo || 'Sin descripción'}
                                  </div>
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {item.categoria || 'Sin categoría'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="font-mono">{item.codigo}</span>
                                  <span>Cant: {item.cantidad || 0}</span>
                                  <span>{item.unidad || 'Sin unidad'}</span>
                                  <span className="text-green-600 font-medium">
                                    ${item.precioCliente?.toFixed(2) || '0.00'}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-3 pt-4 border-t border-blue-200 bg-blue-50/50 -mx-6 -mb-6 px-6 py-4">
          <Button variant="outline" onClick={onClose} className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100">
            Cancelar
          </Button>
          <Button
            onClick={crearLista}
            disabled={cargando || itemsSeleccionados.length === 0 || !nombreLista.trim() || !fechaRequerida}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            size="lg"
          >
            {cargando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              `Crear Lista (${itemsSeleccionados.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}