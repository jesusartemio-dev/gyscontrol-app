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

type GrupoItem = {
  codigo: string
  descripcion: string
  items: ItemConLista[]          // non-added items across all listas
  itemsAgregados: ItemConLista[] // already in cotizacion (yaAgregados)
  totalCantidad: number          // sum of cantidad for non-added items
  hasCotizacion: boolean         // any non-added item has cotizaciones
}

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
  const [seleccionadosCodigos, setSeleccionadosCodigos] = useState<Set<string>>(new Set())
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
    setSeleccionadosCodigos(new Set())
    setSearchTerm('')
    setFiltroListaId('')
  }

  // Agrupa todos los items por codigo
  const allGrupos = useMemo((): GrupoItem[] => {
    const map = new Map<string, GrupoItem>()
    for (const item of allItems) {
      const key = item.codigo || ''
      if (!map.has(key)) {
        map.set(key, {
          codigo: key,
          descripcion: item.descripcion || '',
          items: [],
          itemsAgregados: [],
          totalCantidad: 0,
          hasCotizacion: false,
        })
      }
      const grupo = map.get(key)!
      if (yaAgregados.has(item.id)) {
        grupo.itemsAgregados.push(item)
      } else {
        grupo.items.push(item)
        grupo.totalCantidad += item.cantidad ?? 0
        if (item.cotizaciones && item.cotizaciones.length > 0) {
          grupo.hasCotizacion = true
        }
      }
    }
    return Array.from(map.values())
  }, [allItems, yaAgregados])

  // Grupos con items no agregados, filtrados por lista y búsqueda
  const gruposDisponibles = useMemo(() => {
    let result = allGrupos.filter(g => g.items.length > 0)
    if (filtroListaId) {
      result = result.filter(g => g.items.some(i => i.listaInfo?.id === filtroListaId))
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(g =>
        g.codigo.toLowerCase().includes(term) ||
        g.descripcion.toLowerCase().includes(term)
      )
    }
    return result
  }, [allGrupos, filtroListaId, searchTerm])

  // Grupos seleccionados (siempre visibles arriba)
  const gruposSeleccionados = useMemo(
    () => allGrupos.filter(g => seleccionadosCodigos.has(g.codigo)),
    [allGrupos, seleccionadosCodigos]
  )

  const toggleGrupo = (grupo: GrupoItem) => {
    setSeleccionadosCodigos(prev => {
      const next = new Set(prev)
      if (next.has(grupo.codigo)) next.delete(grupo.codigo)
      else next.add(grupo.codigo)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (gruposDisponibles.length === 0) return
    setSeleccionadosCodigos(prev => {
      const next = new Set(prev)
      const allSelected = gruposDisponibles.every(g => next.has(g.codigo))
      if (allSelected) {
        gruposDisponibles.forEach(g => next.delete(g.codigo))
      } else {
        gruposDisponibles.forEach(g => next.add(g.codigo))
      }
      return next
    })
  }

  const handleAgregar = async () => {
    if (seleccionadosCodigos.size === 0) return
    try {
      setLoading(true)
      // Resolve codigos → item IDs (non-added items only)
      const itemIds: string[] = []
      for (const grupo of allGrupos) {
        if (seleccionadosCodigos.has(grupo.codigo)) {
          itemIds.push(...grupo.items.map(i => i.id))
        }
      }
      const promises = itemIds.map(itemId => {
        const item = allItems.find(i => i.id === itemId)
        return createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: item?.listaInfo?.id || '',
          listaEquipoItemId: itemId,
        })
      })
      await Promise.all(promises)
      toast.success(`${itemIds.length} item(s) agregado(s)`)
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

  const hasDraft = seleccionadosCodigos.size > 0
  const totalGruposDisponibles = allGrupos.filter(g => g.items.length > 0).length

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
                  Todas ({totalGruposDisponibles})
                </button>
                {listas.map(lista => {
                  const count = allGrupos.filter(
                    g => g.items.some(i => i.listaInfo?.id === lista.id)
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
                        checked={
                          gruposDisponibles.length > 0 &&
                          gruposDisponibles.every(g => seleccionadosCodigos.has(g.codigo))
                        }
                        onCheckedChange={toggleSelectAll}
                        disabled={loadingItems || gruposDisponibles.length === 0}
                        className="h-3.5 w-3.5"
                      />
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground w-24">Código</th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground">Descripción</th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground">Listas</th>
                    <th className="py-2 px-2 text-center font-medium text-muted-foreground w-14">Cant.</th>
                    <th className="py-2 px-2 text-center font-medium text-muted-foreground w-20">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ── Sección SELECCIONADOS ── */}
                  {gruposSeleccionados.length > 0 && (
                    <>
                      <tr className="bg-blue-50 border-b">
                        <td colSpan={6} className="py-1 px-3">
                          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                            Seleccionados ({gruposSeleccionados.length})
                          </span>
                        </td>
                      </tr>
                      {gruposSeleccionados.map(grupo => (
                        <tr
                          key={grupo.codigo}
                          className="border-b bg-blue-50/40 hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => toggleGrupo(grupo)}
                        >
                          <td className="py-1.5 px-2">
                            <Checkbox checked onCheckedChange={() => toggleGrupo(grupo)} className="h-3.5 w-3.5" />
                          </td>
                          <td className="py-1.5 px-2 font-mono text-[11px]">{grupo.codigo}</td>
                          <td className="py-1.5 px-2 truncate max-w-[150px]" title={grupo.descripcion}>{grupo.descripcion}</td>
                          <td className="py-1.5 px-2">
                            <div className="flex flex-wrap gap-1">
                              {grupo.items.map(item => (
                                <Badge key={item.id} variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                  {item.listaInfo?.codigo} {item.cantidad}u
                                </Badge>
                              ))}
                              {grupo.itemsAgregados.map(item => (
                                <Badge key={item.id} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal opacity-50 line-through">
                                  {item.listaInfo?.codigo} {item.cantidad}u
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-center font-medium">{grupo.totalCantidad}</td>
                          <td className="py-1.5 px-2 text-center">
                            {grupo.itemsAgregados.length > 0 && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-300">
                                Parcial
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* ── Sección DISPONIBLES ── */}
                  <tr className="bg-gray-50 border-b">
                    <td colSpan={6} className="py-1 px-3">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Disponibles ({gruposDisponibles.length}
                        {searchTerm ? ` — "${searchTerm}"` : ''}
                        {filtroListaId ? ` en ${listas.find(l => l.id === filtroListaId)?.codigo}` : ''})
                      </span>
                    </td>
                  </tr>
                  {gruposDisponibles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        {searchTerm ? (
                          <>
                            Sin resultados para &quot;{searchTerm}&quot;.{' '}
                            <button className="text-blue-600 underline" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button>
                          </>
                        ) : totalGruposDisponibles === 0
                          ? 'Todos los items ya fueron agregados a esta cotización'
                          : 'No hay items disponibles con estos filtros'}
                      </td>
                    </tr>
                  ) : (
                    gruposDisponibles.map(grupo => {
                      const isSelected = seleccionadosCodigos.has(grupo.codigo)
                      return (
                        <tr
                          key={grupo.codigo}
                          className={`border-b cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleGrupo(grupo)}
                        >
                          <td className="py-1.5 px-2">
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleGrupo(grupo)} className="h-3.5 w-3.5" />
                          </td>
                          <td className="py-1.5 px-2 font-mono text-[11px]">{grupo.codigo}</td>
                          <td className="py-1.5 px-2 truncate max-w-[150px]" title={grupo.descripcion}>{grupo.descripcion}</td>
                          <td className="py-1.5 px-2">
                            <div className="flex flex-wrap gap-1">
                              {grupo.items.map(item => (
                                <Badge key={item.id} variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                  {item.listaInfo?.codigo} {item.cantidad}u
                                </Badge>
                              ))}
                              {grupo.itemsAgregados.map(item => (
                                <Badge key={item.id} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal opacity-50 line-through">
                                  {item.listaInfo?.codigo} {item.cantidad}u
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-center font-medium">{grupo.totalCantidad}</td>
                          <td className="py-1.5 px-2 text-center">
                            {grupo.itemsAgregados.length > 0 ? (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-300">
                                Parcial
                              </Badge>
                            ) : grupo.hasCotizacion ? (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-600">
                                Cotizado
                              </Badge>
                            ) : null}
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
              {seleccionadosCodigos.size > 0 ? (
                <span className="text-blue-600 font-medium">{seleccionadosCodigos.size} grupo(s) seleccionado(s)</span>
              ) : (
                <span className="text-muted-foreground">{totalGruposDisponibles} disponibles · {yaAgregados.size} ya agregados</span>
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
                disabled={loading || seleccionadosCodigos.size === 0}
                className="h-7 text-xs min-w-[100px]"
              >
                {loading ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Agregando...</>
                ) : (
                  <><Plus className="h-3 w-3 mr-1" />Agregar ({seleccionadosCodigos.size})</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
