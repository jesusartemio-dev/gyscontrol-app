'use client'

import { useState } from 'react'
import { CotizacionProveedorItem, ListaEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { seleccionarCotizacion } from '@/lib/services/listaEquipoItem'

interface Props {
  item: ListaEquipoItem
  onSelected?: () => void
  onUpdated?: () => void
  onClose?: () => void
}

export default function SeleccionarCotizacionPorItem({
  item,
  onSelected,
  onUpdated,
  onClose,
}: Props) {
  const [loadingId, setLoadingId] = useState<string>('')

  const handleSeleccionar = async (cotizacion: CotizacionProveedorItem) => {
    try {
      setLoadingId(cotizacion.id)
      await seleccionarCotizacion(item.id, cotizacion.id)
      toast.success('Cotización seleccionada correctamente')
      onSelected?.()
      onUpdated?.()
    } catch {
      toast.error('Error al seleccionar cotización')
    } finally {
      setLoadingId('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Comparar Cotizaciones</h3>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            ✖ Cerrar
          </Button>
        )}
      </div>

      {item.cotizaciones.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No hay cotizaciones registradas para este ítem.
        </p>
      ) : (
        <div className="space-y-2">
          {item.cotizaciones.map((cot) => (
            <div
              key={cot.id}
              className="border p-3 rounded-xl bg-gray-50"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                <div>
                  <strong>Proveedor:</strong>{' '}
                  {cot.cotizacion?.proveedor?.nombre || 'Desconocido'}
                </div>
                <div>
                  <strong>Precio:</strong>{' '}
                  S/. {cot.precioUnitario?.toFixed(2) || '-'}
                </div>
                <div>
                  <strong>Cantidad:</strong> {cot.cantidad || '-'}
                </div>
                <div>
                  <strong>Entrega:</strong> {cot.tiempoEntrega || '-'}
                </div>
                <div>
                  <Button
                    disabled={loadingId === cot.id}
                    onClick={() => handleSeleccionar(cot)}
                    className={
                      item.cotizacionSeleccionadaId === cot.id
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white'
                    }
                  >
                    {loadingId === cot.id
                      ? 'Procesando...'
                      : item.cotizacionSeleccionadaId === cot.id
                      ? 'Seleccionada'
                      : 'Seleccionar'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
