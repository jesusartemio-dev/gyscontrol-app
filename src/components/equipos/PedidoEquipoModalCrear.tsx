'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { PedidoEquipoPayload, ListaEquipo } from '@/types'

interface Props {
  listas: ListaEquipo[]
  proyectoId: string
  responsableId: string
  onCreated: (payload: PedidoEquipoPayload) => Promise<{ id: string } | null>
  onRefresh?: () => void
}

export default function PedidoEquipoModalCrear({
  listas,
  proyectoId,
  responsableId,
  onCreated,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false)
  const [listaId, setListaId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!listaId) return toast.error('Debes seleccionar una lista')

    try {
      setLoading(true)

      const payload: PedidoEquipoPayload = {
        proyectoId,
        responsableId,
        listaId,
        observacion,
        fechaNecesaria: new Date(fechaNecesaria).toISOString(),
      }

      const nuevo = await onCreated(payload)
      if (!nuevo?.id) throw new Error('No se creó el pedido')

      toast.success('✅ Pedido creado')
      onRefresh?.()
      setOpen(false)
      setListaId('')
      setObservacion('')
    } catch (err) {
      toast.error('Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 text-white">➕ Crear Pedido</Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>📦 Crear Pedido</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
          <div>
            <Label>📋 Lista Técnica</Label>
            <select
              value={listaId}
              onChange={(e) => setListaId(e.target.value)}
              className="border rounded px-3 py-2 w-full text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {listas.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  {lista.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>📅 Fecha Necesaria</Label>
            <Input
              type="date"
              value={fechaNecesaria}
              onChange={(e) => setFechaNecesaria(e.target.value)}
            />
          </div>

          <div>
            <Label>📝 Observación</Label>
            <Input
              placeholder="Opcional"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            className="bg-green-600 text-white"
            disabled={loading}
          >
            Crear Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
