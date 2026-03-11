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
import { toast } from 'sonner'
import {
  Plus,
  Package,
  Loader2,
  Search,
  X,
  ListFilter,
} from 'lucide-react'

import type {
  ListaEquipo,
  ListaEquipoItem,
  CotizacionProveedor,
} from '@/types'

import { getListaPorProyecto } from '@/lib/services/listaPorProyecto'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'

type ItemConLista = ListaEquipoItem & { listaInfo: ListaEquipo }

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
  const [allItems, setAllItems] = useState<ItemConLista[]>([])
  const [filtroListaId, setFiltroListaId] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [yaAgregados, setYaAgregados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Carga todos los items de todas las listas del proyecto
  useEffect(() => {
    if (!open || !proyectoId) return
    loadAllData()
  }, [open, proyectoId])

  // Actualiza yaAgregados cuando cambian los items de la cotizacion
  useEffect(() => {
    const ids = new Set(
      cotizacion.items
        ?.map(i => i.listaEquipoItemId)
        .filter((id): id is string => !!id) || []
    )
    setYaAgregados(ids)
  }, [cotizacion.items])

  const loadAllData = async () => {
    try {
      setLoadingItems(true)
      const listasData = await getListaPorProyecto(proyectoId)
      const listasArr = listasData || []
      setListas(listasArr)

      const arrays = await Promise.all(
        listasArr.map((lista: ListaEquipo) =>
          getListaEquipoItemsByLista(lista.id).then(items =>
            (items || []).map(item => ({ ...item, listaInfo: lista }))
          )
        )
      )
      setAllItems(arrays.flat())
    } catch (error) {
      console.error('Error al cargar items:', error)
      toast.error('Error al cargar items')
    } finally {
      setLoadingItems(false)
    }
  }

  const resetForm = () => {
    setSeleccionados(new Set())
    setSearchTerm('')
    setFiltroListaId('')
  }

  // Items no agregados, filtrados por lista y búsqueda
  const itemsDisponibles = useMemo(() => {
    let result = allItems.filter(item => !yaAgregados.has(item.id))
    if (filtroListaId) {
      result = result.filter(item => item.listaInfo?.id === filtroListaId)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.descripcion?.toLowerCase().includes(term) ||
        item.codigo?.toLowerCase().includes(term)
      )
    }
    return result
  }, [allItems, yaAgregados, filtroListaId, searchTerm])

  // Items seleccionados (siempre visibles arriba)
  const itemsSeleccionadosData = useMemo(
    () => allItems.filter(item => seleccionados.has(item.id)),
    [allItems, seleccionados]
  )

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
    if (itemsDisponibles.length === 0) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(prev => {
        const next = new Set(prev)
        itemsDisponibles.forEach(i => next.add(i.id))
        return next
      })
    }
  }

  const handleAgregar = async () => {
    if (seleccionados.size === 0) return
    try {
      setLoading(true)
      const promises = Array.from(seleccionados).map(itemId => {
        const item = allItems.find(i => i.id === itemId)
        return createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: item?.listaInfo?.id || '',
          listaEquipoItemId: itemId,
        })
      })
      await Promise.all(promises)
      toast.success(`${seleccionados.size} item(s) agregado(s)`)
      resetForm()
      onAdded?.()
      onClose()
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al agregar items')
    } finally {
      setLoading(false)
    }
  }

  const getItemStatus = (item: ItemConLista) => {
    if (item.cotizaciones && item.cotizaciones.length > 0) {
      return { label: 'Cotizado', color: 'text-green-600' }
    }
    return { label: 'Pendiente', color: 'text-orange-600' }
  }

  const hasDraft = seleccionados.size > 0
  const totalDisponibles = allItems.filter(i => !yaAgregados.has(i.id)).length

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 pr-10 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <DialogTitle className="text-sm font-semibold">
              Agregar Items
            </DialogTitle>
            <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
              {cotizacion.proveedor?.nombre}
            </Badge>
            {hasDraft && (
              <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-300 bg-amber-50">
                borrador guardado
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Búsqueda global + filtros de lista */}
        <div className="px-4 py-3 border-b bg-gray-50/50 flex-shrink-0 space-y-2">
          {/* Search global */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar en todas las listas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs"
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtros por lista (chips) */}
          {listas.length > 1 && (
            <div className="flex items-center gap-2">
              <ListFilter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFiltroListaId('')}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    !filtroListaId
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-muted-foreground border-gray-200 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  Todas ({totalDisponibles})
                </button>
                {listas.map(lista => {
                  const count = allItems.filter(
                    i => !yaAgregados.has(i.id) && i.listaInfo?.id === lista.id
                  ).length
                  return (
                    <button
                      key={lista.id}
                      type="button"
                      onClick={() => setFiltroListaId(filtroListaId === lista.id ? '' : lista.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        filtroListaId === lista.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-muted-foreground border-gray-200 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {lista.codigo} ({count})
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="flex-1 min-h-0">
          {loadingItems ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No hay items en las listas del proyecto</p>
            </div>
          ) : (
            <div className="max-h-[42vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="py-2 px-2 w-8">
                      <Checkbox
                        checked={itemsDisponibles.length === 0 && seleccionados.size > 0}
                        onCheckedChange={toggleSelectAll}
                        disabled={loadingItems}
                        className="h-3.5 w-3.5"
                      />
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground w-24">Código</th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground">Descripción</th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground w-20">Lista</th>
                    <th className="py-2 px-2 text-center font-medium text-muted-foreground w-14">Cant.</th>
                    <th className="py-2 px-2 text-center font-medium text-muted-foreground w-20">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ── Sección SELECCIONADOS ── */}
                  {itemsSeleccionadosData.length > 0 && (
                    <>
                      <tr className="bg-blue-50 border-b">
                        <td colSpan={6} className="py-1 px-3">
                          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                            Seleccionados ({itemsSeleccionadosData.length})
                          </span>
                        </td>
                      </tr>
                      {itemsSeleccionadosData.map(item => {
                        const status = getItemStatus(item)
                        return (
                          <tr
                            key={item.id}
                            className="border-b bg-blue-50/40 hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => toggleSeleccion(item.id)}
                          >
                            <td className="py-1.5 px-2">
                              <Checkbox checked onCheckedChange={() => toggleSeleccion(item.id)} className="h-3.5 w-3.5" />
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[11px]">{item.codigo}</td>
                            <td className="py-1.5 px-2 truncate max-w-[180px]" title={item.descripcion}>{item.descripcion}</td>
                            <td className="py-1.5 px-2">
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">{item.listaInfo?.codigo}</Badge>
                            </td>
                            <td className="py-1.5 px-2 text-center font-medium">{item.cantidad}</td>
                            <td className="py-1.5 px-2 text-center">
                              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${status.color}`}>{status.label}</Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  )}

                  {/* ── Sección DISPONIBLES ── */}
                  <tr className="bg-gray-50 border-b">
                    <td colSpan={6} className="py-1 px-3">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Disponibles ({itemsDisponibles.length}
                        {searchTerm ? ` — "${searchTerm}"` : ''}
                        {filtroListaId ? ` en ${listas.find(l => l.id === filtroListaId)?.codigo}` : ''})
                      </span>
                    </td>
                  </tr>
                  {itemsDisponibles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        {searchTerm ? (
                          <>
                            Sin resultados para &quot;{searchTerm}&quot;.{' '}
                            <button className="text-blue-600 underline" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button>
                          </>
                        ) : totalDisponibles === 0
                          ? 'Todos los items ya fueron agregados a esta cotización'
                          : 'No hay items disponibles con estos filtros'}
                      </td>
                    </tr>
                  ) : (
                    itemsDisponibles.map(item => {
                      const isSelected = seleccionados.has(item.id)
                      const status = getItemStatus(item)
                      return (
                        <tr
                          key={item.id}
                          className={`border-b cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleSeleccion(item.id)}
                        >
                          <td className="py-1.5 px-2">
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSeleccion(item.id)} className="h-3.5 w-3.5" />
                          </td>
                          <td className="py-1.5 px-2 font-mono text-[11px]">{item.codigo}</td>
                          <td className="py-1.5 px-2 truncate max-w-[180px]" title={item.descripcion}>{item.descripcion}</td>
                          <td className="py-1.5 px-2">
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">{item.listaInfo?.codigo}</Badge>
                          </td>
                          <td className="py-1.5 px-2 text-center font-medium">{item.cantidad}</td>
                          <td className="py-1.5 px-2 text-center">
                            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${status.color}`}>{status.label}</Badge>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              {seleccionados.size > 0 ? (
                <span className="text-blue-600 font-medium">{seleccionados.size} seleccionado(s)</span>
              ) : (
                <span className="text-muted-foreground">{totalDisponibles} disponibles · {yaAgregados.size} ya agregados</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="h-7 text-xs"
              >
                Cerrar
              </Button>
              {hasDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { resetForm(); onClose() }}
                  disabled={loading}
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Descartar
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleAgregar}
                disabled={loading || seleccionados.size === 0}
                className="h-7 text-xs min-w-[100px]"
              >
                {loading ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Agregando...</>
                ) : (
                  <><Plus className="h-3 w-3 mr-1" />Agregar ({seleccionados.size})</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
