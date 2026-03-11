'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  Truck,
  X,
  CheckCircle,
  AlertCircle,
  ChevronsUpDown,
  Check,
} from 'lucide-react'

import type {
  ListaEquipo,
  ListaEquipoItem,
  Proyecto,
  Proveedor,
} from '@/types'

import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedor } from '@/lib/services/cotizacionProveedor'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import { getProveedores } from '@/lib/services/proveedor'

interface Props {
  open: boolean
  onClose: () => void
  lista: ListaEquipo
  proyecto: Proyecto
  onCreated?: () => void
}

export default function ModalCrearCotizacionDesdeLista({
  open,
  onClose,
  lista,
  proyecto,
  onCreated,
}: Props) {
  const router = useRouter()
  const proveedorInputRef = useRef<HTMLInputElement>(null)
  const [proveedorId, setProveedorId] = useState('')
  const [proveedorSearch, setProveedorSearch] = useState('')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [comboOpen, setComboOpen] = useState(false)
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Load data
  useEffect(() => {
    if (!open) return

    const loadData = async () => {
      try {
        setLoadingData(true)
        const [proveedoresData, itemsData] = await Promise.all([
          getProveedores(),
          getListaEquipoItemsByLista(lista.id),
        ])
        setProveedores(proveedoresData || [])
        setItems(itemsData || [])
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Error al cargar datos')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [open, lista?.id])

  // Reset when lista changes (different lista = fresh state)
  useEffect(() => {
    setProveedorId('')
    setProveedorSearch('')
    setComboOpen(false)
    setSeleccionados(new Set())
    setSearchTerm('')
  }, [lista?.id])

  // After items reload, remove stale selections
  useEffect(() => {
    if (items.length === 0) return
    const validIds = new Set(items.map(i => i.id))
    setSeleccionados(prev => {
      const filtered = new Set([...prev].filter(id => validIds.has(id)))
      return filtered.size === prev.size ? prev : filtered
    })
  }, [items])

  const resetForm = () => {
    setProveedorId('')
    setProveedorSearch('')
    setComboOpen(false)
    setSeleccionados(new Set())
    setSearchTerm('')
  }

  const handleCancelar = () => {
    resetForm()
    onClose()
  }

  const proveedoresFiltrados = useMemo(() => {
    if (!proveedorSearch) return proveedores
    const term = proveedorSearch.toLowerCase()
    return proveedores.filter(p => p.nombre.toLowerCase().includes(term))
  }, [proveedores, proveedorSearch])

  // Siempre visible, sin filtro
  const itemsSeleccionadosData = useMemo(
    () => items.filter(item => seleccionados.has(item.id)),
    [items, seleccionados]
  )

  // No seleccionados, filtrados por búsqueda
  const itemsDisponibles = useMemo(() => {
    const noSel = items.filter(item => !seleccionados.has(item.id))
    if (!searchTerm) return noSel
    const term = searchTerm.toLowerCase()
    return noSel.filter(item =>
      item.descripcion?.toLowerCase().includes(term) ||
      item.codigo?.toLowerCase().includes(term)
    )
  }, [items, seleccionados, searchTerm])

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (itemsDisponibles.length === 0) {
      // todos seleccionados → deseleccionar todo
      setSeleccionados(new Set())
    } else {
      // seleccionar todos los disponibles (filtrados)
      setSeleccionados(prev => {
        const next = new Set(prev)
        itemsDisponibles.forEach(i => next.add(i.id))
        return next
      })
    }
  }

  const handleCrear = async () => {
    if (!proveedorId) {
      toast.warning('Selecciona un proveedor')
      return
    }

    if (seleccionados.size === 0) {
      toast.warning('Selecciona al menos un item')
      return
    }

    try {
      setLoading(true)

      const cotizacion = await createCotizacionProveedor({
        proyectoId: proyecto.id,
        proveedorId,
      })

      if (!cotizacion) {
        throw new Error('No se pudo crear la cotización')
      }

      const promises = Array.from(seleccionados).map((itemId) =>
        createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: lista.id,
          listaEquipoItemId: itemId,
        })
      )

      await Promise.all(promises)

      toast.success(`Cotización creada con ${seleccionados.size} items`)
      onCreated?.()
      resetForm()
      onClose()
      router.push(`/logistica/cotizaciones/${cotizacion.id}`)
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al crear la cotización')
    } finally {
      setLoading(false)
    }
  }

  const getItemStatus = (item: ListaEquipoItem) => {
    const count = item.cotizaciones?.length || 0
    const MIN_COT = 3
    if (count >= MIN_COT) {
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: `${count}/${MIN_COT}` }
    }
    if (count > 0) {
      return { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: `${count}/${MIN_COT}` }
    }
    return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: `0/${MIN_COT}` }
  }

  const hasDraft = seleccionados.size > 0 || !!proveedorId

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 pr-10 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-purple-600" />
            <DialogTitle className="text-sm font-semibold">
              Nueva Cotización
            </DialogTitle>
            <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
              {lista.codigo}
            </Badge>
            {hasDraft && (
              <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-300 bg-amber-50">
                borrador guardado
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Proveedor selector */}
        <div className="px-4 py-3 border-b bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Proveedor:
            </label>
            <div className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  ref={proveedorInputRef}
                  placeholder="Buscar proveedor..."
                  value={comboOpen ? proveedorSearch : (proveedores.find(p => p.id === proveedorId)?.nombre ?? '')}
                  onChange={(e) => {
                    setProveedorSearch(e.target.value)
                    setComboOpen(true)
                  }}
                  onFocus={() => {
                    setProveedorSearch('')
                    setComboOpen(true)
                  }}
                  onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                  disabled={loadingData}
                  className="h-7 text-xs pl-7 pr-6"
                  autoComplete="off"
                />
                {proveedorId ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onMouseDown={(e) => { e.preventDefault(); setProveedorId(''); setProveedorSearch('') }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                )}
              </div>
              {comboOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {proveedoresFiltrados.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No se encontró ningún proveedor.
                    </div>
                  ) : (
                    proveedoresFiltrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center gap-2 ${proveedorId === p.id ? 'bg-accent font-medium' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setProveedorId(p.id)
                          setProveedorSearch('')
                          setComboOpen(false)
                        }}
                      >
                        <Check className={`h-3.5 w-3.5 shrink-0 ${proveedorId === p.id ? 'opacity-100' : 'opacity-0'}`} />
                        {p.nombre}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and count */}
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
          <div className="text-[10px] text-muted-foreground ml-auto">
            {itemsDisponibles.length} disponibles
          </div>
        </div>

        {/* Items table */}
        <div className="flex-1 min-h-0">
          {loadingData ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No hay items</p>
            </div>
          ) : (
            <div className="max-h-[45vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="py-2 px-2 w-8">
                      <Checkbox
                        checked={items.length > 0 && itemsDisponibles.length === 0}
                        onCheckedChange={toggleSelectAll}
                        className="h-3.5 w-3.5"
                      />
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground w-28">
                      Código
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground">
                      Descripción
                    </th>
                    <th className="py-2 px-2 text-center font-medium text-muted-foreground w-16">
                      Cant.
                    </th>
                    <th className="py-2 px-2 text-center font-medium text-muted-foreground w-20">
                      Cot.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* ── Sección SELECCIONADOS ── */}
                  {itemsSeleccionadosData.length > 0 && (
                    <>
                      <tr className="bg-blue-50 border-b">
                        <td colSpan={5} className="py-1 px-3">
                          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                            Seleccionados ({itemsSeleccionadosData.length})
                          </span>
                        </td>
                      </tr>
                      {itemsSeleccionadosData.map((item) => {
                        const status = getItemStatus(item)
                        return (
                          <tr
                            key={item.id}
                            className="border-b bg-blue-50/40 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => toggleSeleccion(item.id)}
                          >
                            <td className="py-1.5 px-2">
                              <Checkbox checked onCheckedChange={() => toggleSeleccion(item.id)} className="h-3.5 w-3.5" />
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[11px]">{item.codigo}</td>
                            <td className="py-1.5 px-2 truncate max-w-xs" title={item.descripcion}>{item.descripcion}</td>
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
                    <td colSpan={5} className="py-1 px-3">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Disponibles ({itemsDisponibles.length}
                        {searchTerm ? ` — "${searchTerm}"` : ''})
                      </span>
                    </td>
                  </tr>
                  {itemsDisponibles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                        {searchTerm ? (
                          <>
                            Sin resultados para &quot;{searchTerm}&quot;.{' '}
                            <button className="text-blue-600 underline" onClick={() => setSearchTerm('')}>Limpiar</button>
                          </>
                        ) : 'Todos los items están seleccionados'}
                      </td>
                    </tr>
                  ) : (
                    itemsDisponibles.map((item) => {
                      const status = getItemStatus(item)
                      return (
                        <tr
                          key={item.id}
                          className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => toggleSeleccion(item.id)}
                        >
                          <td className="py-1.5 px-2">
                            <Checkbox checked={false} onCheckedChange={() => toggleSeleccion(item.id)} className="h-3.5 w-3.5" />
                          </td>
                          <td className="py-1.5 px-2 font-mono text-[11px]">{item.codigo}</td>
                          <td className="py-1.5 px-2 truncate max-w-xs" title={item.descripcion}>{item.descripcion}</td>
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
            <div className="text-xs text-muted-foreground space-y-0.5">
              {seleccionados.size > 0 && (
                <div className="text-blue-600 font-medium">
                  {seleccionados.size} items seleccionados
                </div>
              )}
              {items.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>{items.filter(i => (i.cotizaciones?.length || 0) >= 3).length}/{items.length} con 3+ cot.</span>
                </div>
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
                  onClick={handleCancelar}
                  disabled={loading}
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Descartar
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleCrear}
                disabled={loading || !proveedorId || seleccionados.size === 0}
                className="h-7 text-xs min-w-[120px] bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Crear ({seleccionados.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
