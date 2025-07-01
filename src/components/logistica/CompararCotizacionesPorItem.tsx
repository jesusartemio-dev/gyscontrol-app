// ===================================================
// 📁 Archivo: CompararCotizacionesPorItem.tsx
// 🖌️ Descripción: Vista para comparar cotizaciones por cada ítem técnico
// 🛠️ Uso: Logística selecciona la mejor oferta por ListaEquipoItem
// ✍️ Autor: IA GYS + Jesús Artemio
// 🗓️ Última actualización: 2025-05-23
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { CotizacionProveedorItem, ListaEquipoItem } from '@/types'
import {
  getCotizacionProveedorItems,
  updateCotizacionProveedorItem,
} from '@/lib/services/cotizacionProveedorItem'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function CompararCotizacionesPorItem() {
  const [agrupados, setAgrupados] = useState<{
    [itemId: string]: {
      item: ListaEquipoItem
      cotizaciones: CotizacionProveedorItem[]
    }
  }>({})

  useEffect(() => {
    const cargar = async () => {
      const data = await getCotizacionProveedorItems()
      if (!data) return toast.error('Error al cargar cotizaciones')

      const agrupado: typeof agrupados = {}
      for (const c of data) {
        const id = c.listaEquipoItemId
        if (!agrupado[id]) {
          agrupado[id] = {
            item: c.listaEquipoItem,
            cotizaciones: [],
          }
        }
        agrupado[id].cotizaciones.push(c)
      }
      setAgrupados(agrupado)
    }
    cargar()
  }, [])

  const seleccionar = async (idSeleccionado: string, grupo: CotizacionProveedorItem[]) => {
    for (const c of grupo) {
      await updateCotizacionProveedorItem(c.id, {
        esSeleccionada: c.id === idSeleccionado,
      })
    }
    toast.success('Oferta seleccionada')
    location.reload()
  }

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-2xl font-bold">Comparar Cotizaciones</h1>
      {Object.entries(agrupados).map(([itemId, { item, cotizaciones }]) => (
        <div key={itemId} className="border rounded-xl p-4 bg-white shadow-sm">
          <h2 className="font-semibold text-lg">
            {item.descripcion} <span className="text-gray-500">({item.codigo})</span>
          </h2>

          <table className="w-full mt-2 text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Proveedor</th>
                <th className="p-2 text-right">Precio Unitario</th>
                <th className="p-2 text-right">Cantidad</th>
                <th className="p-2 text-right">Entrega</th>
                <th className="p-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.cotizacion.proveedor.nombre}</td>
                  <td className="p-2 text-right">S/. {c.precioUnitario?.toFixed(2)}</td>
                  <td className="p-2 text-right">{c.cantidad}</td>
                  <td className="p-2 text-right">{c.tiempoEntrega}</td>
                  <td className="p-2 text-center">
                    <Button
                      size="sm"
                      variant={c.esSeleccionada ? 'default' : 'outline'}
                      onClick={() => seleccionar(c.id, cotizaciones)}
                    >
                      {c.esSeleccionada ? '✅ Seleccionado' : 'Seleccionar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
