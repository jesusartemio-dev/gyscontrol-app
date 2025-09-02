'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface ItemTemporal {
  descripcion: string
  cantidad: number
  unidad: string
  precioUnitario?: number
  tiempoEntrega?: string
  listaEquipoItemId?: string // Asociado manualmente
}

export default function CotizacionProveedorItemImportar() {
  const [items, setItems] = useState<ItemTemporal[]>([])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return toast.warning('Selecciona un archivo primero')

    const reader = new FileReader()
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      // Convertir a objetos con claves
      const parsed: any[] = XLSX.utils.sheet_to_json(sheet, {
        header: ['descripcion', 'cantidad', 'unidad', 'precioUnitario', 'tiempoEntrega'],
        range: 1 // Ignora encabezado
      })

      const mapeados: ItemTemporal[] = parsed.map((fila) => ({
        descripcion: fila.descripcion,
        cantidad: parseFloat(fila.cantidad),
        unidad: fila.unidad,
        precioUnitario: parseFloat(fila.precioUnitario),
        tiempoEntrega: fila.tiempoEntrega,
      }))

      setItems(mapeados)
      toast.success('Archivo importado correctamente')
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="space-y-4 p-4 border rounded-xl shadow-sm bg-white">
      <Label htmlFor="file">Importar archivo PDF o Excel</Label>
      <Input type="file" accept=".xlsx, .xls" onChange={handleFile} />

      {items.length > 0 && (
        <div className="overflow-auto mt-4">
          <table className="min-w-full text-sm text-left border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1">Descripción</th>
                <th className="px-2 py-1">Cantidad</th>
                <th className="px-2 py-1">Unidad</th>
                <th className="px-2 py-1">Precio Unit.</th>
                <th className="px-2 py-1">Entrega</th>
                <th className="px-2 py-1">Asociar a Ítem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1">{item.descripcion}</td>
                  <td className="px-2 py-1">{item.cantidad}</td>
                  <td className="px-2 py-1">{item.unidad}</td>
                  <td className="px-2 py-1">$ {item.precioUnitario?.toFixed(2)}</td>
                  <td className="px-2 py-1">{item.tiempoEntrega}</td>
                  <td className="px-2 py-1">
                    <Input
                      type="text"
                      placeholder="ID ListaEquipoItem"
                      value={item.listaEquipoItemId || ''}
                      onChange={(e) => {
                        const nuevaLista = [...items]
                        nuevaLista[idx].listaEquipoItemId = e.target.value
                        setItems(nuevaLista)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <Button className="bg-green-600 text-white">Guardar cotizaciones</Button>
      )}
    </div>
  )
}
