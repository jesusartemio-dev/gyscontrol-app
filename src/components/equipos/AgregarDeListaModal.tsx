'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Search, List, Package, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListaEquipo {
  id: string
  codigo: string
  nombre: string
  estado: string
}

interface ListaItem {
  id: string
  codigo: string
  descripcion: string
  marca?: string
  unidad: string
  categoria?: string
  cantidad: number
  cantidadPedida: number
  cantidadEntregada?: number
  precioElegido?: number
  tiempoEntrega?: string
  tiempoEntregaDias?: number
  catalogoEquipoId?: string
  tipoItem?: string
}

interface Props {
  open: boolean
  onClose: () => void
  pedidoId: string
  proyectoId: string
  listaIdPrincipal?: string | null  // lista vinculada al pedido
  onCreated: () => void
}

export function AgregarDeListaModal({ open, onClose, pedidoId, proyectoId, listaIdPrincipal, onCreated }: Props) {
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [listaSeleccionadaId, setListaSeleccionadaId] = useState<string>('')
  const [items, setItems] = useState<ListaItem[]>([])
  const [loadingListas, setLoadingListas] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  // { [itemId]: cantidadPedida }
  const [seleccion, setSeleccion] = useState<Record<string, number>>({})

  // Cargar listas del proyecto al abrir
  useEffect(() => {
    if (!open) return
    setSeleccion({})
    setSearch('')
    setItems([])
    cargarListas()
  }, [open])

  // Cuando cambia la lista seleccionada, cargar sus items
  useEffect(() => {
    if (!listaSeleccionadaId) return
    setSeleccion({})
    setSearch('')
    cargarItems(listaSeleccionadaId)
  }, [listaSeleccionadaId])

  const cargarListas = async () => {
    setLoadingListas(true)
    try {
      const res = await fetch(`/api/lista-equipo?proyectoId=${proyectoId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const lista: ListaEquipo[] = Array.isArray(data) ? data : data.data || []
      setListas(lista)

      // Seleccionar la lista principal del pedido por defecto
      const defaultId = listaIdPrincipal && lista.find(l => l.id === listaIdPrincipal)
        ? listaIdPrincipal
        : lista[0]?.id || ''
      setListaSeleccionadaId(defaultId)
    } catch {
      toast.error('Error al cargar listas')
    } finally {
      setLoadingListas(false)
    }
  }

  const cargarItems = async (listaId: string) => {
    setLoadingItems(true)
    try {
      const res = await fetch(`/api/lista-equipo/${listaId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      // El API puede devolver la lista con sus items dentro
      const rawItems: any[] = data.items || data.listaEquipoItem || []
      setItems(rawItems)
    } catch {
      toast.error('Error al cargar items de la lista')
    } finally {
      setLoadingItems(false)
    }
  }

  const itemsConDisponible = useMemo(() => {
    return items.map(item => ({
      ...item,
      cantidadDisponible: Math.max(0, item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)),
    }))
  }, [items])

  const itemsFiltrados = useMemo(() => {
    const disponibles = itemsConDisponible.filter(i => i.cantidadDisponible > 0)
    if (!search.trim()) return disponibles
    const s = search.toLowerCase()
    return disponibles.filter(i =>
      i.codigo.toLowerCase().includes(s) ||
      i.descripcion.toLowerCase().includes(s) ||
      (i.marca || '').toLowerCase().includes(s) ||
      (i.categoria || '').toLowerCase().includes(s)
    )
  }, [itemsConDisponible, search])

  const totalSeleccionados = Object.values(seleccion).filter(v => v > 0).length

  const toggleItem = (itemId: string, cantidadDisponible: number) => {
    setSeleccion(prev => {
      if (prev[itemId]) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: cantidadDisponible }
    })
  }

  const setCantidad = (itemId: string, cantidad: number, max: number) => {
    const clamped = Math.min(Math.max(1, cantidad), max)
    setSeleccion(prev => ({ ...prev, [itemId]: clamped }))
  }

  const handleSubmit = async () => {
    const itemsAgregar = Object.entries(seleccion).filter(([, cant]) => cant > 0)
    if (itemsAgregar.length === 0) {
      toast.error('Selecciona al menos un item')
      return
    }

    setSubmitting(true)
    let creados = 0
    let errores = 0

    for (const [listaEquipoItemId, cantidadPedida] of itemsAgregar) {
      const item = itemsConDisponible.find(i => i.id === listaEquipoItemId)
      if (!item) continue

      const precioUnitario = item.precioElegido || null
      const costoTotal = precioUnitario ? precioUnitario * cantidadPedida : null

      const res = await fetch('/api/pedido-equipo-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          listaEquipoItemId,
          listaId: listaSeleccionadaId,
          cantidadPedida,
          precioUnitario,
          costoTotal,
          codigo: item.codigo,
          descripcion: item.descripcion,
          unidad: item.unidad,
          categoria: item.categoria || null,
          marca: item.marca || null,
          tipoItem: item.tipoItem || 'equipo',
          tiempoEntrega: item.tiempoEntrega || null,
          tiempoEntregaDias: item.tiempoEntregaDias || null,
          catalogoEquipoId: item.catalogoEquipoId || null,
          estado: 'pendiente',
        }),
      })

      if (res.ok) {
        creados++
      } else {
        errores++
        const err = await res.json().catch(() => ({}))
        console.error('Error agregando item:', err)
      }
    }

    setSubmitting(false)

    if (creados > 0) {
      toast.success(`${creados} item${creados > 1 ? 's' : ''} agregado${creados > 1 ? 's' : ''} al pedido`)
      onCreated()
      onClose()
    }
    if (errores > 0) {
      toast.error(`${errores} item${errores > 1 ? 's' : ''} no se pudo${errores > 1 ? 'ieron' : ''} agregar`)
    }
  }

  const listaActual = listas.find(l => l.id === listaSeleccionadaId)
  const esPrincipal = listaSeleccionadaId === listaIdPrincipal

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <List className="h-4 w-4 text-blue-600" />
            Agregar items de lista
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-5 pt-3 pb-2">
          {/* Selector de lista */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Lista:</span>
            {loadingListas ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Select value={listaSeleccionadaId} onValueChange={setListaSeleccionadaId}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Seleccionar lista..." />
                </SelectTrigger>
                <SelectContent>
                  {listas.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px]">{l.codigo}</span>
                        <span>{l.nombre || l.codigo}</span>
                        {l.id === listaIdPrincipal && (
                          <Badge className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 border-blue-200">
                            principal
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {listaActual && (
              <Badge
                variant="outline"
                className={cn('text-[9px] px-1.5 shrink-0', esPrincipal ? 'border-blue-300 text-blue-600' : '')}
              >
                {esPrincipal ? 'Lista del pedido' : 'Otra lista'}
              </Badge>
            )}
          </div>

          {/* Buscador */}
          {listaSeleccionadaId && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descripción, marca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0" style={{ maxHeight: '420px' }}>
          {loadingItems ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : !listaSeleccionadaId ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground text-sm">
              <List className="h-8 w-8 mb-2 text-gray-300" />
              Selecciona una lista
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground text-sm">
              <Package className="h-8 w-8 mb-2 text-gray-300" />
              {search ? 'Sin resultados para la búsqueda' : 'No hay items disponibles en esta lista'}
            </div>
          ) : (
            <div className="divide-y border rounded-md">
              {itemsFiltrados.map(item => {
                const selected = !!seleccion[item.id]
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                      selected ? 'bg-blue-50' : 'hover:bg-gray-50/80'
                    )}
                    onClick={() => !selected && toggleItem(item.id, item.cantidadDisponible)}
                  >
                    {/* Checkbox visual */}
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleItem(item.id, item.cantidadDisponible) }}
                      className={cn(
                        'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                        selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      )}
                    >
                      {selected && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>

                    {/* Info item */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-medium text-gray-700">{item.codigo}</span>
                        {item.categoria && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">{item.categoria}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 truncate">{item.descripcion}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{item.unidad}</span>
                        {item.marca && <span className="text-[10px] text-muted-foreground">· {item.marca}</span>}
                        <span className="text-[10px] text-blue-600 font-medium">
                          Disp: {item.cantidadDisponible}
                        </span>
                        {item.precioElegido && (
                          <span className="text-[10px] text-emerald-600">
                            S/ {item.precioElegido.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Input cantidad (solo si seleccionado) */}
                    {selected && (
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          className="w-5 h-5 rounded border flex items-center justify-center text-xs hover:bg-gray-100"
                          onClick={() => setCantidad(item.id, (seleccion[item.id] || 1) - 1, item.cantidadDisponible)}
                        >−</button>
                        <Input
                          type="number"
                          min={1}
                          max={item.cantidadDisponible}
                          value={seleccion[item.id] || 1}
                          onChange={e => setCantidad(item.id, Number(e.target.value), item.cantidadDisponible)}
                          className="w-14 h-6 text-xs text-center px-1"
                        />
                        <button
                          className="w-5 h-5 rounded border flex items-center justify-center text-xs hover:bg-gray-100"
                          onClick={() => setCantidad(item.id, (seleccion[item.id] || 1) + 1, item.cantidadDisponible)}
                        >+</button>
                      </div>
                    )}

                    {!selected && (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {totalSeleccionados > 0
              ? `${totalSeleccionados} item${totalSeleccionados > 1 ? 's' : ''} seleccionado${totalSeleccionados > 1 ? 's' : ''}`
              : 'Haz clic en un item para seleccionarlo'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || totalSeleccionados === 0}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Agregar al pedido
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
