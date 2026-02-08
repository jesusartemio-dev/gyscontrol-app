'use client'

import { useEffect, useState, useMemo } from 'react'
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
  Loader2,
  Search,
  Truck,
  X,
  CheckCircle,
  AlertCircle,
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
  const [proveedorId, setProveedorId] = useState('')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
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

  // Reset on close
  useEffect(() => {
    if (!open) {
      setProveedorId('')
      setSeleccionados(new Set())
      setSearchTerm('')
    }
  }, [open])

  const itemsFiltrados = useMemo(() => {
    if (!searchTerm) return items
    const term = searchTerm.toLowerCase()
    return items.filter(item =>
      item.descripcion?.toLowerCase().includes(term) ||
      item.codigo?.toLowerCase().includes(term)
    )
  }, [items, searchTerm])

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (seleccionados.size === itemsFiltrados.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(itemsFiltrados.map(i => i.id)))
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

  if (!open) return null

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
          </div>
        </DialogHeader>

        {/* Proveedor selector */}
        <div className="px-4 py-3 border-b bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Proveedor:
            </label>
            <Select value={proveedorId} onValueChange={setProveedorId} disabled={loadingData}>
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue placeholder="Seleccionar proveedor..." />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {seleccionados.size} de {itemsFiltrados.length} seleccionados
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
                        checked={seleccionados.size === itemsFiltrados.length && itemsFiltrados.length > 0}
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
                  {itemsFiltrados.map((item) => {
                    const isSelected = seleccionados.has(item.id)
                    const status = getItemStatus(item)

                    return (
                      <tr
                        key={item.id}
                        className={`border-b transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleSeleccion(item.id)}
                      >
                        <td className="py-1.5 px-2">
                          <Checkbox
                            checked={isSelected}
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
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${status.color}`}>
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
