'use client'

import React, { useState, useEffect } from 'react'
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
  X
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProyectoEquipo, ProyectoEquipoItem } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  proyectoEquipo: ProyectoEquipo
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
  const [itemsDisponibles, setItemsDisponibles] = useState<ProyectoEquipoItem[]>([])
  const [itemsSeleccionados, setItemsSeleccionados] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)
  const [nombreLista, setNombreLista] = useState('')
  const [descripcionLista, setDescripcionLista] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('__ALL__')
  const [busqueda, setBusqueda] = useState('')

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
  const getCategoriaPredominante = (items: ProyectoEquipoItem[]) => {
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

  // Inicializar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log('🎯 Modal Crear Lista Múltiple abierto para:', proyectoEquipo.nombre)

      // Obtener datos frescos de los items disponibles
      cargarItemsDisponibles()

      // Resetear estado
      setItemsSeleccionados([])
      const categoriaPredominante = getCategoriaPredominante(proyectoEquipo.items || [])
      setNombreLista(`Lista de ${categoriaPredominante}`)
      setDescripcionLista(`Lista técnica de ${categoriaPredominante} para ${proyectoEquipo.nombre}`)
      setFiltroCategoria('__ALL__')
      setBusqueda('')
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
        (item.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ?? false)

      const coincideCategoria = filtroCategoria === '__ALL__' ||
        item.categoria === filtroCategoria

      return coincideBusqueda && coincideCategoria
    })
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
      onDistribucionCompletada(listaCreada.id)
      onClose()

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-medium">Crear Lista Múltiple</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 h-[60vh] pr-6">
          <div className="space-y-4 pb-6">
            {/* Información básica */}
            <div className="space-y-3">
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
                <Label htmlFor="descripcion-lista" className="text-sm font-medium">Descripción</Label>
                <Input
                  id="descripcion-lista"
                  value={descripcionLista}
                  onChange={(e) => setDescripcionLista(e.target.value)}
                  placeholder="Descripción opcional"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Filtros simples */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-sm font-medium">Buscar</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar items..."
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
                  <div className="p-2 space-y-1">
                    {itemsFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No hay items disponibles</p>
                      </div>
                    ) : (
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
                                <div className="font-medium text-sm truncate">
                                  {item.descripcion || item.codigo || 'Sin descripción'}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>Cant: {item.cantidad || 0}</span>
                                  <span>{item.unidad || 'Sin unidad'}</span>
                                  {item.categoria && item.categoria !== 'SIN-CATEGORIA' && (
                                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                      {item.categoria}
                                    </span>
                                  )}
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

        <DialogFooter className="gap-3 pt-4 border-t bg-muted/20 -mx-6 -mb-6 px-6 py-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={crearLista}
            disabled={cargando || itemsSeleccionados.length === 0 || !nombreLista.trim()}
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