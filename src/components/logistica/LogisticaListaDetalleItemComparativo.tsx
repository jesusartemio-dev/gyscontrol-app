'use client'

import { ListaEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getMonedaSymbol } from '@/lib/utils/currency'

interface Props {
  item: ListaEquipoItem
  onUpdated?: () => void
}

export default function LogisticaListaDetalleItemComparativo({ item, onUpdated }: Props) {
  const handleSeleccionar = async (cotizacionProveedorItemId: string) => {
    try {
      const res = await fetch(`/api/lista-equipo-item/${item.id}/seleccionar-cotizacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotizacionProveedorItemId }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.warningOC) {
          toast.warning(data.warningOC, { duration: 8000 })
        }
        toast.success('Cotización seleccionada correctamente')
        onUpdated?.()
      } else {
        const data = await res.json()
        toast.error(`Error: ${data.error || 'No se pudo seleccionar cotización'}`)
      }
    } catch (error) {
      toast.error('❌ Error inesperado al seleccionar cotización')
    }
  }

  return (
    <div className="mt-6 border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gray-100 p-2 text-sm font-semibold flex flex-col sm:flex-row sm:justify-between">
        <div>
          🧾 <span className="font-bold">{item.codigo}</span> — {item.descripcion}
        </div>
        <div className="text-gray-600 text-xs">
          Unidad: {item.unidad} • Cantidad: {item.cantidad}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-200 text-gray-700 text-left">
            <tr>
              <th className="p-2 border">Cotización</th>
              <th className="p-2 border">Proveedor</th>
              <th className="p-2 border text-right">Precio Unitario</th>
              <th className="p-2 border text-center">Cantidad</th>
              <th className="p-2 border text-right">Costo Total</th>
              <th className="p-2 border text-center">Entrega (días)</th>
              <th className="p-2 border text-center">Estado</th>
              <th className="p-2 border text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {item.cotizaciones.map((cot) => {
              const precio = cot.precioUnitario ?? 0
              const cantidad = cot.cantidad ?? 0
              const costoTotal = precio * cantidad
              const sym = getMonedaSymbol((cot.cotizacionProveedor as any)?.moneda)

              return (
                <tr key={cot.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 border">{cot.cotizacionProveedor?.codigo || '—'}</td>
                  <td className="p-2 border">{cot.cotizacionProveedor?.proveedor?.nombre || '—'}</td>
                  <td className="p-2 border text-right">{sym} {precio.toFixed(2)}</td>
                  <td className="p-2 border text-center">{cantidad}</td>
                  <td className="p-2 border text-right">{sym} {costoTotal.toFixed(2)}</td>
                  <td className="p-2 border text-center">{cot.tiempoEntrega || '—'}</td>
                  <td className="p-2 border text-center capitalize">{cot.estado}</td>
                  <td className="p-2 border text-center">
                    <Button
                      size="sm"
                      onClick={() => handleSeleccionar(cot.id)}
                      disabled={item.cotizacionSeleccionadaId === cot.id}
                      className={
                        item.cotizacionSeleccionadaId === cot.id
                          ? 'bg-gray-400 text-white'
                          : 'bg-green-600 text-white'
                      }
                    >
                      {item.cotizacionSeleccionadaId === cot.id ? '✅ Seleccionado' : '🏆 Seleccionar'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
