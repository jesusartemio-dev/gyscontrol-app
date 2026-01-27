'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  X,
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
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [listaId, setListaId] = useState('')
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [yaAgregados, setYaAgregados] = useState<Set<string>>(new Set())
  const [itemsConCotizacion, setItemsConCotizacion] = useState<Set<string>>(new Set())
  const [modalMultiListaOpen, setModalMultiListaOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingListas, setLoadingListas] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Cargar listas del proyecto
  useEffect(() => {
    if (!open || !proyectoId) return

    const cargarListas = async () => {
      try {
        setLoadingListas(true)
        const data = await getListaPorProyecto(proyectoId)
        setListas(data || [])
        if (data && data.length === 1) {
          setListaId(data[0].id)
        }
      } catch (error) {
        console.error('Error al cargar listas:', error)
        toast.error('Error al cargar listas')
      } finally {
        setLoadingListas(false)
      }
    }

    cargarListas()
    setSeleccionados(new Set())
    setSearchTerm('')
    setListaId('')
  }, [proyectoId, open])

  // Cargar items de la lista seleccionada
  useEffect(() => {
    if (!listaId) {
      setItems([])
      return
    }

    const cargarItems = async () => {
      try {
        setLoadingItems(true)
        const data = await getListaEquipoItemsByLista(listaId)
        setItems(data || [])

        const idsAgregados = new Set(
          cotizacion.items
            ?.map((i) => i.listaEquipoItemId)
            .filter((id): id is string => !!id)
        )
        setYaAgregados(idsAgregados)

        const idsConCotizacion = new Set(
          data
            ?.filter(item => item.cotizaciones && item.cotizaciones.length > 0)
            .map(item => item.id) || []
        )
        setItemsConCotizacion(idsConCotizacion)
      } catch (error) {
        console.error('Error al cargar items:', error)
        toast.error('Error al cargar items')
      } finally {
        setLoadingItems(false)
      }
    }

    cargarItems()
  }, [listaId, cotizacion])

  const itemsFiltrados = useMemo(() => {
    if (!searchTerm) return items
    const term = searchTerm.toLowerCase()
    return items.filter(item =>
      item.descripcion?.toLowerCase().includes(term) ||
      item.codigo?.toLowerCase().includes(term)
    )
  }, [items, searchTerm])

  const itemsDisponibles = useMemo(() => {
    return itemsFiltrados.filter(item => !yaAgregados.has(item.id))
  }, [itemsFiltrados, yaAgregados])

  const toggleSeleccion = (id: string) => {
    if (yaAgregados.has(id)) return
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (seleccionados.size === itemsDisponibles.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(itemsDisponibles.map(i => i.id)))
    }
  }

  const handleAgregar = async () => {
    if (seleccionados.size === 0) return
    try {
      setLoading(true)
      const promises = Array.from(seleccionados).map((itemId) => {
        const item = items.find(i => i.id === itemId)
        return createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: item?.listaId || listaId,
          listaEquipoItemId: itemId,
        })
      })
      await Promise.all(promises)
      toast.success(`${seleccionados.size} item(s) agregado(s)`)
      setSeleccionados(new Set())
      onAdded?.()
      onClose()
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al agregar items')
    } finally {
      setLoading(false)
    }
  }

  const getItemStatus = (item: ListaEquipoItem) => {
    if (yaAgregados.has(item.id)) {
      return { label: 'Agregado', color: 'text-gray-500', bg: 'bg-gray-100' }
    }
    if (itemsConCotizacion.has(item.id)) {
      return { label: 'Cotizado', color: 'text-green-600', bg: 'bg-green-50' }
    }
    return { label: 'Pendiente', color: 'text-orange-600', bg: 'bg-orange-50' }
  }

  if (!open) return null

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" />
              <DialogTitle className="text-sm font-semibold">
                Agregar Items
              </DialogTitle>
              <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                {cotizacion.proveedor?.nombre}
              </Badge>
            </div>
          </DialogHeader>

          {/* Lista selector */}
          <div className="px-4 py-3 border-b bg-gray-50/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Lista:
              </label>
              <Select value={listaId} onValueChange={setListaId} disabled={loadingListas}>
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue placeholder="Seleccionar lista..." />
                </SelectTrigger>
                <SelectContent>
                  {listas.map((lista) => (
                    <SelectItem key={lista.id} value={lista.id} className="text-xs">
                      {lista.codigo} - {lista.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search and stats */}
          {listaId && (
            <div className="px-4 py-2 border-b flex items-center gap-2 flex-shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-7 pl-7 text-xs"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] ml-auto">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-muted-foreground">Cotizados:</span>
                  <span className="font-medium">{itemsConCotizacion.size}</span>
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-orange-600" />
                  <span className="text-muted-foreground">Pendientes:</span>
                  <span className="font-medium">{items.length - itemsConCotizacion.size - yaAgregados.size}</span>
                </span>
              </div>
            </div>
          )}

          {/* Items table */}
          <div className="flex-1 min-h-0">
            {!listaId ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-muted-foreground">Selecciona una lista</p>
              </div>
            ) : loadingItems ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : itemsFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'No se encontraron items' : 'No hay items'}
                </p>
                {searchTerm && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs mt-2"
                    onClick={() => setSearchTerm('')}
                  >
                    Limpiar búsqueda
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-h-[45vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="py-2 px-2 w-8">
                        <Checkbox
                          checked={seleccionados.size === itemsDisponibles.length && itemsDisponibles.length > 0}
                          onCheckedChange={toggleSelectAll}
                          disabled={itemsDisponibles.length === 0}
                          className="h-3.5 w-3.5"
                        />
                      </th>
                      <th className="py-2 px-2 text-left font-medium text-muted-foreground w-24">
                        Código
                      </th>
                      <th className="py-2 px-2 text-left font-medium text-muted-foreground">
                        Descripción
                      </th>
                      <th className="py-2 px-2 text-center font-medium text-muted-foreground w-14">
                        Cant.
                      </th>
                      <th className="py-2 px-2 text-center font-medium text-muted-foreground w-12">
                        Und.
                      </th>
                      <th className="py-2 px-2 text-center font-medium text-muted-foreground w-20">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsFiltrados.map((item) => {
                      const isYaAgregado = yaAgregados.has(item.id)
                      const isSelected = seleccionados.has(item.id)
                      const status = getItemStatus(item)

                      return (
                        <tr
                          key={item.id}
                          className={`border-b transition-colors ${
                            isYaAgregado
                              ? 'bg-gray-50 text-gray-400'
                              : isSelected
                              ? 'bg-blue-50 cursor-pointer'
                              : 'hover:bg-gray-50 cursor-pointer'
                          }`}
                          onClick={() => !isYaAgregado && toggleSeleccion(item.id)}
                        >
                          <td className="py-1.5 px-2">
                            <Checkbox
                              checked={isSelected}
                              disabled={isYaAgregado}
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
                          <td className="py-1.5 px-2 text-center text-muted-foreground">
                            {item.unidad}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 px-1.5 ${status.color}`}
                            >
                              {status.label}
                            </Badge>
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
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalMultiListaOpen(true)}
                className="h-7 text-xs"
              >
                <Layers className="h-3 w-3 mr-1" />
                Múltiples Listas
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {seleccionados.size > 0 && (
                    <span className="text-blue-600 font-medium">
                      {seleccionados.size} seleccionados
                    </span>
                  )}
                </span>
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
                  disabled={loading || seleccionados.size === 0}
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
                      Agregar ({seleccionados.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Multi-Lista */}
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
