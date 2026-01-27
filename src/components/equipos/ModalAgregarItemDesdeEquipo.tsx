'use client'

import { useEffect, useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ProyectoEquipoCotizadoItem } from '@/types'
import { createListaEquipoItemFromProyecto } from '@/lib/services/listaEquipoItem'
import { getProyectoEquipoItemsDisponibles, updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Package,
  CheckCircle,
  Clock,
  Loader2,
  X,
  ShoppingCart,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

interface Props {
  isOpen: boolean
  proyectoId: string
  listaId: string
  onClose: () => void
  onSuccess?: () => void
  onCreated?: () => Promise<void>
}

type SortField = 'codigo' | 'descripcion' | 'cantidad'
type SortOrder = 'asc' | 'desc'

export default function ModalAgregarItemDesdeEquipo({
  isOpen,
  proyectoId,
  listaId,
  onClose,
  onSuccess,
  onCreated
}: Props) {
  const [items, setItems] = useState<ProyectoEquipoCotizadoItem[]>([])
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(true)
  const [filtroGrupo, setFiltroGrupo] = useState('__ALL__')
  const [busqueda, setBusqueda] = useState('')
  const [sortField, setSortField] = useState<SortField>('codigo')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  useEffect(() => {
    if (!isOpen) return

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
  }, [proyectoId, isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSeleccionados([])
      setBusqueda('')
      setFiltroGrupo('__ALL__')
    }
  }, [isOpen])

  const gruposUnicos = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.proyectoEquipo?.nombre).filter(Boolean))
    ) as string[]
  }, [items])

  const itemsFiltrados = useMemo(() => {
    let filtered = items.filter((item) => {
      const matchGrupo = filtroGrupo === '__ALL__' || item.proyectoEquipo?.nombre === filtroGrupo
      const matchBusqueda = !busqueda ||
        item.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
      return matchGrupo && matchBusqueda
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      if (sortField === 'codigo') {
        aVal = a.codigo || ''
        bVal = b.codigo || ''
      } else if (sortField === 'descripcion') {
        aVal = a.descripcion || ''
        bVal = b.descripcion || ''
      } else if (sortField === 'cantidad') {
        aVal = a.cantidad || 0
        bVal = b.cantidad || 0
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      const compare = String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? compare : -compare
    })

    return filtered
  }, [items, filtroGrupo, busqueda, sortField, sortOrder])

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const disponibles = itemsFiltrados.filter(item => {
      const cantidadAgregada = item.listaEquipos?.reduce((sum, le) => sum + (le.cantidad || 0), 0) || 0
      return (item.cantidad || 0) - cantidadAgregada > 0
    })
    if (seleccionados.length === disponibles.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(disponibles.map(e => e.id))
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleAgregar = async () => {
    if (seleccionados.length === 0) {
      toast.warning('Selecciona al menos un equipo')
      return
    }

    const seleccionadosValidos = seleccionados.filter((itemId) => {
      const item = items.find((i) => i.id === itemId)
      const cantidadAgregada = item?.listaEquipos?.reduce((sum, le) => sum + (le.cantidad || 0), 0) || 0
      return (item?.cantidad || 0) - cantidadAgregada > 0
    })

    if (seleccionadosValidos.length === 0) {
      toast.warning('Los equipos seleccionados ya están completos')
      return
    }

    try {
      setLoading(true)
      await Promise.all(
        seleccionadosValidos.map(async (itemId) => {
          await createListaEquipoItemFromProyecto(listaId, itemId)
          await updateProyectoEquipoItem(itemId, {
            estado: 'en_lista',
            listaId: listaId,
          })
        })
      )

      toast.success(`${seleccionadosValidos.length} equipo(s) agregado(s)`)
      onSuccess?.()
      await onCreated?.()
      onClose()
    } catch (error) {
      console.error('Error adding items:', error)
      toast.error('Error al agregar los equipos')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (faltan: number) => {
    if (faltan <= 0) {
      return (
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
          <CheckCircle className="w-3 h-3 mr-0.5" />
          Completo
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
        <Clock className="w-3 h-3 mr-0.5" />
        Faltan {faltan}
      </Badge>
    )
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
      : <ChevronDown className="h-3 w-3 inline ml-0.5" />
  }

  // Count disponibles for select all
  const disponiblesCount = useMemo(() => {
    return itemsFiltrados.filter(item => {
      const cantidadAgregada = item.listaEquipos?.reduce((sum, le) => sum + (le.cantidad || 0), 0) || 0
      return (item.cantidad || 0) - cantidadAgregada > 0
    }).length
  }, [itemsFiltrados])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <DialogTitle className="text-sm font-semibold">
              Agregar desde Cotización
            </DialogTitle>
            <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
              {seleccionados.length} seleccionados
            </Badge>
          </div>
        </DialogHeader>

        {/* Filtros inline */}
        <div className="px-4 py-2 border-b bg-gray-50/50 flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar código o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
            {busqueda && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => setBusqueda('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos los grupos</SelectItem>
              {gruposUnicos.map((grupo) => (
                <SelectItem key={grupo} value={grupo} className="text-xs">
                  {grupo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-[10px] text-muted-foreground ml-auto">
            {itemsFiltrados.length} de {items.length}
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 min-h-0">
          {loadingItems ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No se encontraron equipos</p>
              {(busqueda || filtroGrupo !== '__ALL__') && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs mt-2"
                  onClick={() => { setBusqueda(''); setFiltroGrupo('__ALL__') }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="py-2 px-2 w-8">
                      <Checkbox
                        checked={seleccionados.length === disponiblesCount && disponiblesCount > 0}
                        onCheckedChange={toggleSelectAll}
                        className="h-3.5 w-3.5"
                      />
                    </th>
                    <th
                      className="py-2 px-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground w-32"
                      onClick={() => handleSort('codigo')}
                    >
                      Código <SortIcon field="codigo" />
                    </th>
                    <th
                      className="py-2 px-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('descripcion')}
                    >
                      Descripción <SortIcon field="descripcion" />
                    </th>
                    <th
                      className="py-2 px-2 text-center font-medium text-muted-foreground cursor-pointer hover:text-foreground w-16"
                      onClick={() => handleSort('cantidad')}
                    >
                      Cant. <SortIcon field="cantidad" />
                    </th>
                    <th className="py-2 px-2 text-center font-medium text-muted-foreground w-24">
                      Estado
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground w-32">
                      Grupo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemsFiltrados.map((item) => {
                    const cantidadAgregada = item.listaEquipos?.reduce((sum, le) => sum + (le.cantidad || 0), 0) || 0
                    const faltan = (item.cantidad || 0) - cantidadAgregada
                    const yaCompletado = faltan <= 0
                    const isSelected = seleccionados.includes(item.id)

                    return (
                      <tr
                        key={item.id}
                        className={`border-b transition-colors ${
                          yaCompletado
                            ? 'bg-gray-50 text-gray-400'
                            : isSelected
                            ? 'bg-blue-50 cursor-pointer'
                            : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                        onClick={() => !yaCompletado && toggleSeleccion(item.id)}
                      >
                        <td className="py-1.5 px-2">
                          <Checkbox
                            checked={isSelected}
                            disabled={yaCompletado}
                            onCheckedChange={() => toggleSeleccion(item.id)}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[11px]">
                          {item.codigo}
                        </td>
                        <td className="py-1.5 px-2 truncate max-w-xs" title={item.descripcion}>
                          {item.descripcion}
                        </td>
                        <td className="py-1.5 px-2 text-center font-medium">
                          {item.cantidad}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {getStatusBadge(faltan)}
                        </td>
                        <td className="py-1.5 px-2 truncate max-w-[120px]" title={item.proyectoEquipo?.nombre}>
                          <span className="text-muted-foreground">
                            {item.proyectoEquipo?.nombre || '-'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="h-7 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAgregar}
              disabled={loading || seleccionados.length === 0}
              className="h-7 text-xs min-w-[100px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar ({seleccionados.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
