// ===================================================
// 📁 Archivo: CotizacionProveedorAccordion.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Acordeón para mostrar una cotización y sus ítems cotizados
//
// 🧠 Uso: Se usa para expandir y visualizar detalle de ítems en cada cotización
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { CotizacionProveedor, CotizacionProveedorUpdatePayload } from '@/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

interface Props {
  cotizacion: CotizacionProveedor
  onUpdate?: (id: string, payload: CotizacionProveedorUpdatePayload) => void
  onDelete?: (id: string) => void
}

export default function CotizacionProveedorAccordion({
  cotizacion,
  onUpdate,
  onDelete,
}: Props) {
  return (
    <Accordion type="single" collapsible className="w-full border rounded-xl shadow-md">
      <AccordionItem value={cotizacion.id}>
        <AccordionTrigger className="p-4 text-left">
          <div className="flex justify-between w-full">
            <span className="font-semibold">
              {cotizacion.nombre} • {cotizacion.proveedor?.nombre}
            </span>
            <span className="text-sm text-gray-500">{cotizacion.fecha?.slice(0, 10)}</span>
          </div>
        </AccordionTrigger>

        <AccordionContent className="bg-gray-50 px-4 py-2 space-y-2">
          {cotizacion.items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center border-b py-2 text-sm"
            >
              <div className="col-span-2">
                <strong>{item.listaEquipoItem.descripcion}</strong>
                <div className="text-xs text-gray-600">
                  {item.listaEquipoItem.codigo} • {item.listaEquipoItem.unidad}
                </div>
              </div>
              <div>S/. {item.precioUnitario.toFixed(2)}</div>
              <div>{item.cantidad} {item.listaEquipoItem.unidad}</div>
              <div className="text-right text-gray-600">
                ⏱️ {item.tiempoEntrega || 'N/D'}
              </div>
            </div>
          ))}

          {(onUpdate || onDelete) && (
            <div className="flex justify-end gap-2 pt-2">
              {onUpdate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdate(cotizacion.id, {
                    nombre: cotizacion.nombre,
                    fecha: cotizacion.fecha,
                  })}
                >
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => onDelete(cotizacion.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                </Button>
              )}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
