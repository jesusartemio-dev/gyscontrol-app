// ===================================================
// 📁 Archivo: LogisticaListaDetalleItemTable.tsx
// 📌 Descripción: Tabla de ítems de la lista logística con opción de ver comparativo por ítem
// ===================================================

'use client'

import { useState } from 'react'
import { ListaEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LogisticaListaDetalleItemComparativo from './LogisticaListaDetalleItemComparativo'
import { ChevronDown, ChevronRight } from 'lucide-react'
import React from 'react'


interface Props {
  items: ListaEquipoItem[]
  onUpdated?: () => void // 🔄 Callback opcional que se ejecuta cuando hay una actualización
}

export default function LogisticaListaDetalleItemTable({ items, onUpdated }: Props) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // 🔄 Alternar expansión para mostrar/ocultar el comparativo de un ítem
  const toggleExpand = (itemId: string) => {
    setExpandedItemId(prev => (prev === itemId ? null : itemId))
  }

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-xs uppercase text-left">
          <tr className="whitespace-nowrap">
            <th className="px-2" />
            <th className="px-3">Código</th>
            <th className="px-3">Descripción</th>
            <th className="px-3">Unidad</th>
            <th className="text-right px-3">Cantidad</th>
            <th className="text-right px-3">Presupuesto Unit.</th>
            <th className="text-right px-3">Precio Elegido</th>
            <th className="text-right px-3">Costo Total</th>
            <th className="text-center px-3"># Cots</th>
            <th className="text-center px-3">Seleccionado</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const cotizacionesCount = item.cotizaciones.length
            const selectedCot = item.cotizaciones.find(c => c.id === item.cotizacionSeleccionadaId)

            return (
              // ✅ React.Fragment con key para evitar warning de "cada hijo debe tener una key única"
              <React.Fragment key={item.id}>
                {/* 🔽 Fila principal con datos del ítem */}
                <tr className="border-b whitespace-nowrap">
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpand(item.id)}
                    >
                      {expandedItemId === item.id
                        ? <ChevronDown size={16} />
                        : <ChevronRight size={16} />}
                    </Button>
                  </td>
                  <td className="font-semibold px-3">{item.codigo}</td>
                  <td className="px-3">{item.descripcion}</td>
                  <td className="px-3">{item.unidad}</td>
                  <td className="text-right px-3">{item.cantidad}</td>
                  <td className="text-right px-3">S/. {(item.presupuesto ?? 0).toFixed(2)}</td>
                  <td className="text-right px-3">S/. {(item.precioElegido ?? 0).toFixed(2)}</td>
                  <td className="text-right px-3">S/. {(item.costoElegido ?? 0).toFixed(2)}</td>
                  <td className="text-center px-3">
                    <Badge variant="outline">{cotizacionesCount}</Badge>
                  </td>
                  <td className="text-center px-3">
                    <Badge variant={selectedCot ? 'default' : 'outline'}>
                      {selectedCot ? '✅ Sí' : '—'}
                    </Badge>
                  </td>
                </tr>

                {/* 🔍 Fila expandida para mostrar comparativo, solo si está expandido */}
                {expandedItemId === item.id && (
                  <tr key={`${item.id}-expanded`}>
                    <td colSpan={10} className="p-2 bg-gray-50 border-b">
                      <LogisticaListaDetalleItemComparativo
                        item={item}
                        onUpdated={onUpdated}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
