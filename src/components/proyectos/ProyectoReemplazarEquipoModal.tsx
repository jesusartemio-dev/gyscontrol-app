'use client'

import { useState } from 'react'
import { updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'
import { ProyectoEquipoItem } from '@/types'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onClose: () => void
  equipo: ProyectoEquipoItem
  onUpdated?: () => void
}

export default function ProyectoReemplazarEquipoModal({ open, onClose, equipo, onUpdated }: Props) {
  const [motivo, setMotivo] = useState('')
  const [nuevoPrecio, setNuevoPrecio] = useState<number>(equipo.precioInterno)
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(equipo.cantidad)
  const [loading, setLoading] = useState(false)

  const costoReal = nuevoPrecio * nuevaCantidad
  const puedeGuardar = motivo.trim() !== ''

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setLoading(true)

    try {
      await updateProyectoEquipoItem(equipo.id, {
        estado: 'reemplazado',
        motivoCambio: motivo,
        precioReal: nuevoPrecio,
        cantidadReal: nuevaCantidad,
        costoReal,
      })

      toast.success('Equipo reemplazado correctamente')
      onClose()
      onUpdated?.()
    } catch (err) {
      console.error('❌ Error al reemplazar equipo:', err)
      toast.error('Error al reemplazar equipo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🔁 Reemplazar Equipo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Motivo del cambio</label>
            <Input
              placeholder="Ej: No disponible en stock"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nuevo Precio Unitario</label>
              <Input
                type="number"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Nueva Cantidad</label>
              <Input
                type="number"
                value={nuevaCantidad}
                onChange={(e) => setNuevaCantidad(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <p className="text-sm text-gray-600">Costo real calculado: <strong>S/ {costoReal.toFixed(2)}</strong></p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button disabled={!puedeGuardar || loading} onClick={handleGuardar}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
