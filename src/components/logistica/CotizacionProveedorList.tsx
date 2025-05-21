// ===================================================
// 📁 Archivo: CotizacionProveedorList.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Lista de cotizaciones por proveedor con edición inline
//
// 🧠 Uso: Mostrar las cotizaciones por proyecto, con posibilidad de editar nombre y fecha
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { useState } from 'react'
import { CotizacionProveedor, CotizacionProveedorUpdatePayload } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  data: CotizacionProveedor[]
  onUpdate: (id: string, payload: CotizacionProveedorUpdatePayload) => void
  onDelete: (id: string) => void
}

export default function CotizacionProveedorList({ data, onUpdate, onDelete }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<CotizacionProveedor>>({})

  const handleChange = (key: keyof CotizacionProveedor, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = (id: string) => {
    if (!editValues.nombre || !editValues.fecha) {
      toast.error('Nombre y fecha son obligatorios')
      return
    }

    onUpdate(id, {
      nombre: editValues.nombre,
      fecha: editValues.fecha,
    })
    setEditId(null)
    setEditValues({})
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">📄 Cotizaciones de Proveedor</h2>
      {data.map((cot) => {
        const isEdit = editId === cot.id
        return (
          <div
            key={cot.id}
            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {isEdit ? (
                <>
                  <Input
                    className="w-full"
                    value={editValues.nombre || ''}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                  />
                  <Input
                    type="date"
                    value={editValues.fecha?.slice(0, 10) || ''}
                    onChange={(e) => handleChange('fecha', e.target.value)}
                  />
                </>
              ) : (
                <>
                  <div>
                    <strong>{cot.nombre}</strong>
                    <p className="text-xs text-gray-500">{cot.fecha?.slice(0, 10)}</p>
                  </div>
                  <div className="text-sm text-gray-700 italic">
                    🧾 {cot.proveedor?.nombre || 'Proveedor no definido'}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              {isEdit ? (
                <>
                  <Button onClick={() => handleSave(cot.id)} className="bg-blue-600 text-white">
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setEditId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditId(cot.id)
                      setEditValues({
                        nombre: cot.nombre,
                        fecha: cot.fecha,
                      })
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDelete(cot.id)}
                    className="text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
