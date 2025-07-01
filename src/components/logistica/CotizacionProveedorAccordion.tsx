import { useState, useEffect } from 'react'
import { CotizacionProveedor, CotizacionProveedorUpdatePayload, EstadoCotizacionProveedor } from '@/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import CotizacionEnviarCorreoButton from './CotizacionEnviarCorreoButton'
import CotizacionProveedorTabla from './CotizacionProveedorTabla'
import { getCotizacionProveedorById } from '@/lib/services/cotizacionProveedor'

interface Props {
  cotizacion: CotizacionProveedor
  onUpdate?: (id: string, payload: CotizacionProveedorUpdatePayload) => void
  onDelete?: (id: string) => void
  onUpdatedItem?: () => void
}

const ESTADOS: EstadoCotizacionProveedor[] = [
  'pendiente',
  'solicitado',
  'cotizado',
  'rechazado',
  'seleccionado',
]

export default function CotizacionProveedorAccordion({
  cotizacion,
  onUpdate,
  onDelete,
  onUpdatedItem,
}: Props) {
  const [cotizacionData, setCotizacionData] = useState(cotizacion)

  useEffect(() => {
    setCotizacionData(cotizacion)
  }, [cotizacion])

  const handleChangeEstado = (nuevoEstado: EstadoCotizacionProveedor) => {
    if (onUpdate) {
      onUpdate(cotizacionData.id, { estado: nuevoEstado })
    }
  }

  const handleRefetch = async () => {
    try {
      const updated = await getCotizacionProveedorById(cotizacion.id)
      if (updated) {
        setCotizacionData(updated)
        onUpdatedItem?.()
      } else {
        console.warn('⚠️ No se encontró la cotización actualizada.')
      }
    } catch (error) {
      console.error('❌ Error al hacer refetch de cotización:', error)
    }
  }

  return (
    <Accordion type="single" collapsible className="w-full border rounded-xl shadow-md">
      <AccordionItem value={cotizacionData.id}>
        <AccordionTrigger className="p-4 text-left">
          <div className="flex flex-col md:flex-row md:justify-between w-full">
            <div className="flex flex-col">
              <span className="font-semibold">
                {cotizacionData.codigo} • {cotizacionData.proveedor?.nombre}
              </span>
              <span className="text-sm text-gray-500">
                Estado: {cotizacionData.estado?.toUpperCase() || 'N/A'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {cotizacionData.fecha?.slice(0, 10)}
            </span>
          </div>
        </AccordionTrigger>

        <AccordionContent className="bg-gray-50 px-4 py-4 space-y-4">
          {cotizacionData.items.length > 0 ? (
            <CotizacionProveedorTabla
              items={cotizacionData.items}
              onUpdated={() => {
                handleRefetch()
                onUpdatedItem?.()
              }}
            />
          ) : (
            <p className="text-sm text-gray-500">
              No hay ítems en esta cotización.
            </p>
          )}

          {/* 🏆 Submenú de estados */}
          <div className="flex flex-wrap gap-2 pt-4">
            {ESTADOS.map((estado) => (
              <Button
                key={estado}
                size="sm"
                className={
                  cotizacionData.estado === estado
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }
                onClick={() => handleChangeEstado(estado)}
              >
                {estado.toUpperCase()}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-4">
            <CotizacionEnviarCorreoButton cotizacion={cotizacionData} />

            {onUpdate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onUpdate(cotizacionData.id, {
                    codigo: cotizacionData.codigo,
                    fecha: cotizacionData.fecha,
                  })
                }
              >
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
            )}

            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={() => onDelete(cotizacionData.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
