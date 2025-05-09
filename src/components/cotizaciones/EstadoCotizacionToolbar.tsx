'use client'

import { Cotizacion } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateCotizacion } from '@/lib/services/cotizacion'

interface Props {
  cotizacion: Cotizacion
  onUpdated: (estado: string, etapa: string) => void
}

const etapas = ['nuevo', 'enviado', 'seguimiento', 'negociacion', 'cerrado', 'perdido']
const estados = ['borrador', 'enviada', 'aprobada', 'rechazada']

export default function EstadoCotizacionToolbar({ cotizacion, onUpdated }: Props) {
  const handleEstadoChange = async (nuevoEstado: string) => {
    try {
      await updateCotizacion(cotizacion.id, { estado: nuevoEstado })
      onUpdated(nuevoEstado, cotizacion.etapa)
      toast.success(`Estado actualizado a ${nuevoEstado}`)
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  const handleEtapaChange = async (nuevaEtapa: string) => {
    try {
      await updateCotizacion(cotizacion.id, { etapa: nuevaEtapa })
      onUpdated(cotizacion.estado, nuevaEtapa)
      toast.success(`Etapa CRM actualizada a ${nuevaEtapa}`)
    } catch {
      toast.error('Error al actualizar etapa')
    }
  }

  return (
    <div className="border p-4 rounded-lg bg-gray-50 mb-4 space-y-2">
      <div>
        <h3 className="font-semibold mb-1">Estado actual: <span className="text-blue-600">{cotizacion.estado}</span></h3>
        <div className="flex gap-2 flex-wrap">
          {estados.map(e => (
            <Button
              key={e}
              variant={cotizacion.estado === e ? 'default' : 'outline'}
              onClick={() => handleEstadoChange(e)}
              size="sm"
            >
              {e}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-1">Etapa CRM: <span className="text-blue-600">{cotizacion.etapa}</span></h3>
        <div className="flex gap-2 flex-wrap">
          {etapas.map(e => (
            <Button
              key={e}
              variant={cotizacion.etapa === e ? 'default' : 'outline'}
              onClick={() => handleEtapaChange(e)}
              size="sm"
            >
              {e}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
