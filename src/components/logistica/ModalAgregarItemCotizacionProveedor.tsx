'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { toast } from 'sonner'

import type {
  ListaEquipo,
  ListaEquipoItem,
  CotizacionProveedor,
} from '@/types'

import { getListaPorProyecto } from '@/lib/services/listaPorProyecto' // ✅ nuevo servicio
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'

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
  const [seleccionados, setSeleccionados] = useState<Record<string, ListaEquipoItem>>({})
  const [yaAgregados, setYaAgregados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cargarListas = async () => {
      console.log('🧪 proyectoId recibido en modal:', proyectoId)

      if (!proyectoId) {
        console.warn('⚠️ proyectoId está vacío')
        return
      }

      try {
        const data = await getListaPorProyecto(proyectoId)
        console.log('📦 Listas por proyecto:', data)
        setListas(data || [])
      } catch (error) {
        console.error('❌ Error al cargar listas por proyecto:', error)
        toast.error('Error al cargar listas del proyecto')
      }
    }

    if (open) {
      cargarListas()
    }
  }, [proyectoId, open])

  useEffect(() => {
    const cargarItems = async () => {
      if (!listaId) return

      const data = await getListaEquipoItemsByLista(listaId)
      setItems(data || [])

      const idsAgregados = new Set(
        cotizacion.items
          ?.map((i) => i.listaEquipoItemId)
          .filter((id): id is string => !!id)
      )
      setYaAgregados(idsAgregados)
    }

    cargarItems()
  }, [listaId, cotizacion])

  const toggleSeleccion = (item: ListaEquipoItem, checked: boolean) => {
    setSeleccionados((prev) => {
      const updated = { ...prev }
      if (checked) updated[item.id] = item
      else delete updated[item.id]
      return updated
    })
  }

  const handleAgregar = async () => {
    if (Object.keys(seleccionados).length === 0) return
    try {
      setLoading(true)
      const promises = Object.values(seleccionados).map((item) =>
        createCotizacionProveedorItem({
          cotizacionId: cotizacion.id,
          listaId: item.listaId || listaId,
          listaEquipoItemId: item.id,
        })
      )
      await Promise.all(promises)
      toast.success('✅ Ítems agregados correctamente')
      setSeleccionados({})
      onAdded?.()
      onClose()
    } catch (err) {
      toast.error('❌ Error al agregar ítems')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>➕ Agregar Ítems a Cotización</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={listaId} onValueChange={setListaId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar Lista de Equipos" />
            </SelectTrigger>
            <SelectContent>
              {listas.map((lista) => (
                <SelectItem key={lista.id} value={lista.id}>
                  {lista.codigo} - {lista.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ScrollArea className="h-64 border rounded-md p-2">
            <div className="space-y-2">
              {items.map((item) => {
                const yaAgregado = yaAgregados.has(item.id)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-2 py-1 rounded ${
                      yaAgregado ? 'bg-gray-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!seleccionados[item.id]}
                        onCheckedChange={(checked) =>
                          toggleSeleccion(item, !!checked)
                        }
                      />
                      <div>
                        <div className="font-semibold">{item.descripcion}</div>
                        <div className="text-xs text-gray-500">
                          {item.codigo} • {item.unidad}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      Cant: {item.cantidad}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <div className="bg-blue-50 p-3 rounded shadow-inner">
            <h2 className="text-sm font-bold mb-2">
              Resumen de Ítems Seleccionados:
            </h2>
            <ul className="list-disc list-inside text-sm">
              {Object.values(seleccionados).map((item) => (
                <li key={item.id}>
                  {item.descripcion} ({item.codigo})
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleAgregar}
              disabled={loading || Object.keys(seleccionados).length === 0}
            >
              {loading ? 'Agregando...' : 'Agregar Ítems Seleccionados'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
