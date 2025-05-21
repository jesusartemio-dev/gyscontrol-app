'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { ProyectoEquipoItem } from '@/types'
import { createListaEquipoItemFromProyecto } from '@/lib/services/listaEquipoItem'
import { getProyectoEquipoItemsDisponibles } from '@/lib/services/proyectoEquipoItem'
import { toast } from 'sonner'

interface Props {
  proyectoId: string
  listaId: string
  onClose: () => void
  onCreated?: () => void
}

export default function ModalAgregarItemDesdeEquipo({ proyectoId, listaId, onClose, onCreated }: Props) {
  const [items, setItems] = useState<ProyectoEquipoItem[]>([])
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchDisponibles = async () => {
      const data = await getProyectoEquipoItemsDisponibles(proyectoId)
      setItems(data)
    }
    fetchDisponibles()
  }, [proyectoId])

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleAgregar = async () => {
    if (seleccionados.length === 0) {
      toast.warning('Debes seleccionar al menos un ítem.')
      return
    }

    try {
      setLoading(true)
      await Promise.all(
        seleccionados.map((itemId) =>
          createListaEquipoItemFromProyecto(listaId, itemId)
        )
      )
      toast.success('✅ Ítems agregados a la lista')
      onCreated?.()
      onClose()
    } catch {
      toast.error('❌ Error al agregar los ítems seleccionados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>➕ Agregar Equipos Técnicos a la Lista</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[450px]">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100 text-gray-800">
              <tr>
                <th className="p-2 text-center">✔</th>
                <th className="p-2 text-left">Código</th>
                <th className="p-2 text-left">Descripción</th>
                <th className="p-2 text-left">Unidad</th>
                <th className="p-2 text-center">Cantidad</th>
                <th className="p-2 text-left">Grupo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="text-center">
                    <Checkbox
                      checked={seleccionados.includes(item.id)}
                      onCheckedChange={() => toggleSeleccion(item.id)}
                    />
                  </td>
                  <td className="p-2 font-medium">{item.codigo}</td>
                  <td className="p-2 text-gray-700">{item.descripcion}</td>
                  <td className="p-2 text-center">{item.unidad}</td>
                  <td className="p-2 text-center">{item.cantidad}</td>
                  <td className="p-2 text-sm text-gray-600">
                    {item.proyectoEquipo?.nombre || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAgregar} disabled={loading}>
            {loading ? 'Agregando...' : 'Agregar a la Lista'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
