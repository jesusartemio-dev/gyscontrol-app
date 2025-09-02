// ===================================================
// 📁 Archivo: CotizacionProveedorItemList.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Lista de ítems cotizados con opción para marcar oferta ganadora
//
// 🧠 Uso: Usado dentro de un accordion o panel para seleccionar proveedor ganador
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { CotizacionProveedorItem } from '@/types'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  items: CotizacionProveedorItem[]
  onUpdated?: () => void
}

export default function CotizacionProveedorItemList({ items, onUpdated }: Props) {
  const handleSeleccionar = async (itemId: string) => {
    try {
      const res = await updateCotizacionProveedorItem(itemId, { esSeleccionada: true })
      if (res) {
        toast.success('✔️ Oferta marcada como ganadora')
        onUpdated?.()
      }
    } catch {
      toast.error('Error al seleccionar oferta')
    }
  }

  return (
    <div className="border rounded-xl p-4 shadow-sm space-y-2">
      <h3 className="font-semibold text-sm text-gray-700 mb-2">📦 Ofertas Cotizadas</h3>

      <div className="grid grid-cols-1 md:grid-cols-6 font-semibold text-xs text-gray-500 border-b pb-1">
        <div className="col-span-2">Descripción</div>
        <div>Código</div>
        <div className="text-right">Precio</div>
        <div className="text-right">Cantidad</div>
        <div className="text-right">Acción</div>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'grid grid-cols-1 md:grid-cols-6 items-center py-2 text-sm border-b last:border-0',
            item.esSeleccionada ? 'bg-green-50' : ''
          )}
        >
          <div className="col-span-2">
            {item.listaEquipoItem?.descripcion || 'Sin descripción'}
            <div className="text-xs text-gray-500">{item.listaEquipoItem?.unidad || 'N/A'}</div>
          </div>
          <div>{item.listaEquipoItem?.codigo || 'N/A'}</div>
          <div className="text-right">$ {(item.precioUnitario || 0).toFixed(2)}</div>
          <div className="text-right">{item.cantidad || 0}</div>
          <div className="text-right">
            {item.esSeleccionada ? (
              <span className="text-green-600 font-semibold flex items-center justify-end gap-1">
                <CheckCircle2 size={16} /> Seleccionado
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleSeleccionar(item.id)}>
                Seleccionar
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
