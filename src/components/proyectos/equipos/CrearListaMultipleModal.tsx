'use client'

import { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  Package,
  CheckCircle2,
  Loader2,
  Search,
  X,
  Calendar,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@prisma/client'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

interface Props {
  isOpen: boolean
  onClose: () => void
  proyectoEquipo: ProyectoEquipoCotizado & { items: ProyectoEquipoCotizadoItem[] }
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
  const [busqueda, setBusqueda] = useState('')
  const [codigoLista, setCodigoLista] = useState('')
  const [fechaRequerida, setFechaRequerida] = useState('')
  const router = useRouter()

  const cargarItemsDisponibles = async () => {
    try {
      const response = await fetch(`/api/proyecto-equipo-item/from-proyecto/${proyectoId}?soloDisponibles=true`)
      if (response.ok) {
        const items = await response.json()
        const itemsDeEsteEquipo = items.filter((item: ProyectoEquipoCotizadoItem) =>
          item.proyectoEquipoId === proyectoEquipo.id
        )
        setItemsDisponibles(itemsDeEsteEquipo)
      } else {
        const itemsSinAsignar = proyectoEquipo.items?.filter((item) => !item.listaId) || []
        setItemsDisponibles(itemsSinAsignar)
      }
    } catch {
      const itemsSinAsignar = proyectoEquipo.items?.filter((item) => !item.listaId) || []
      setItemsDisponibles(itemsSinAsignar)
    }
  }

  const obtenerCodigoListaPreview = async () => {
    try {
      const proyectoResponse = await fetch(`/api/proyecto/${proyectoId}`)
      if (!proyectoResponse.ok) throw new Error()
      const proyecto = await proyectoResponse.json()

      const listasResponse = await fetch(`/api/lista-equipo?proyectoId=${proyectoId}`)
      let nextSequence = 1

      if (listasResponse.ok) {
        const listas = await listasResponse.json()
        if (listas.length > 0) {
          const maxSequence = Math.max(...listas.map((lista: { numeroSecuencia?: number }) => lista.numeroSecuencia || 0))
          nextSequence = maxSequence + 1
        }
      }

      setCodigoLista(`${proyecto.codigo}-LST-${String(nextSequence).padStart(3, '0')}`)
    } catch {
      setCodigoLista('CÓDIGO-PENDIENTE')
    }
  }

  useEffect(() => {
    if (isOpen) {
      cargarItemsDisponibles()
      obtenerCodigoListaPreview()
      setItemsSeleccionados([])
      setNombreLista(proyectoEquipo.nombre || 'Nueva Lista Técnica')
      setBusqueda('')
      setFechaRequerida('')
    }
  }, [isOpen, proyectoEquipo.id, proyectoId])

  const toggleItemSeleccion = (itemId: string) => {
    setItemsSeleccionados(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }

  const seleccionarTodos = () => {
    const ids = itemsFiltrados.map(item => item.id)
    setItemsSeleccionados(prev => [...new Set([...prev, ...ids])])
  }

  const deseleccionarTodos = () => {
    setItemsSeleccionados([])
  }

  const itemsFiltrados = itemsDisponibles.filter(item => {
    if (!busqueda) return true
    const term = busqueda.toLowerCase()
    return (
      item.descripcion?.toLowerCase().includes(term) ||
      item.codigo?.toLowerCase().includes(term) ||
      item.marca?.toLowerCase().includes(term) ||
      item.categoria?.toLowerCase().includes(term)
    )
  })

  const totalSeleccionado = itemsSeleccionados.reduce((sum, id) => {
    const item = itemsDisponibles.find(i => i.id === id)
    return sum + (item ? item.cantidad * (item.precioCliente || 0) : 0)
  }, 0)

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

      const response = await fetch('/api/lista-equipo/from-proyecto-equipo/distribuir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId,
          proyectoEquipoId: proyectoEquipo.id,
          nombre: nombreLista.trim(),
          descripcion: '',
          fechaNecesaria: fechaRequerida,
          itemsIds: itemsSeleccionados
        })
      })

      if (!response.ok) throw new Error('Error creando la lista')

      const listaCreada = await response.json()
      toast.success(`Lista "${nombreLista}" creada con ${itemsSeleccionados.length} items`)
      router.push(`/proyectos/${proyectoId}/equipos/listas/${listaCreada.id}`)

    } catch {
      toast.error('Error al crear la lista')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            <DialogTitle className="text-base font-semibold">Crear Lista de Equipos</DialogTitle>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal ml-2">
              {proyectoEquipo.nombre}
            </Badge>
          </div>
        </DialogHeader>

        <div className="px-4 py-3 space-y-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Form Fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">Nombre *</Label>
              <Input
                value={nombreLista}
                onChange={(e) => setNombreLista(e.target.value)}
                placeholder="Nombre de la lista"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Código</Label>
              <div className="relative mt-1">
                <FileText className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  value={codigoLista}
                  readOnly
                  className="h-8 text-sm pl-7 bg-gray-50 font-mono text-gray-600"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Fecha Necesaria *</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  type="date"
                  value={fechaRequerida}
                  onChange={(e) => setFechaRequerida(e.target.value)}
                  className="h-8 text-sm pl-7"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar items..."
                className="h-7 text-xs pl-7"
              />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={seleccionarTodos}
                disabled={itemsFiltrados.length === 0}
                className="h-7 text-xs px-2"
              >
                Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deseleccionarTodos}
                disabled={itemsSeleccionados.length === 0}
                className="h-7 text-xs px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {itemsSeleccionados.length} de {itemsDisponibles.length} seleccionados
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b">
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-8"></th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-24">Código</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Descripción</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-24">Marca</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14">Cant.</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-12">Und.</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-24">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {itemsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        {busqueda ? 'No se encontraron items' : 'No hay items disponibles'}
                      </td>
                    </tr>
                  ) : (
                    itemsFiltrados.map((item, idx) => {
                      const isSelected = itemsSeleccionados.includes(item.id)
                      const subtotal = item.cantidad * (item.precioCliente || 0)

                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleItemSeleccion(item.id)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            isSelected
                              ? 'bg-orange-50 hover:bg-orange-100'
                              : idx % 2 === 0
                                ? 'bg-white hover:bg-gray-50'
                                : 'bg-gray-50/30 hover:bg-gray-50'
                          )}
                        >
                          <td className="px-2 py-1.5 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleItemSeleccion(item.id)}
                              className="pointer-events-none"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="font-mono text-gray-600">{item.codigo}</span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="line-clamp-1" title={item.descripcion}>
                              {item.descripcion}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="line-clamp-1 text-gray-600" title={item.marca || ''}>
                              {item.marca || '-'}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-center font-medium">{item.cantidad}</td>
                          <td className="px-2 py-1.5 text-center text-gray-500">{item.unidad}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-gray-700">
                            {formatCurrency(subtotal)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {itemsSeleccionados.length > 0 && (
            <div className="flex items-center justify-between text-xs bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-900">
                  {itemsSeleccionados.length} items seleccionados
                </span>
              </div>
              <span className="font-mono font-semibold text-orange-700">
                Total: {formatCurrency(totalSeleccionado)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 py-3 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} size="sm" className="h-8">
            Cancelar
          </Button>
          <Button
            onClick={crearLista}
            disabled={cargando || itemsSeleccionados.length === 0 || !nombreLista.trim() || !fechaRequerida}
            size="sm"
            className="h-8 bg-orange-600 hover:bg-orange-700"
          >
            {cargando ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Creando...
              </>
            ) : (
              <>Crear Lista ({itemsSeleccionados.length})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
