'use client'

import { useState } from 'react'
import { Proveedor, ProveedorUpdatePayload } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  data: Proveedor[]
  onUpdate: (id: string, payload: ProveedorUpdatePayload) => void
  onDelete: (id: string) => void
}

export default function ProveedorList({ data, onUpdate, onDelete }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, Partial<Proveedor>>>({})

  const handleChange = (id: string, key: keyof Proveedor, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }))
  }

  const handleSave = (id: string) => {
    const changes = editValues[id]
    if (!changes?.nombre?.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    onUpdate(id, changes as ProveedorUpdatePayload)
    setEditId(null)
    setEditValues((prev) => {
      const newState = { ...prev }
      delete newState[id]
      return newState
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">📋 Lista de Proveedores</h2>

      {data.map((proveedor) => {
        const isEditing = editId === proveedor.id
        const edited = editValues[proveedor.id] || {}

        return (
          <div
            key={proveedor.id}
            className="border rounded-md p-4 flex items-center justify-between gap-4 hover:shadow transition"
          >
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              {isEditing ? (
                <>
                  <Input
                    value={edited.nombre ?? proveedor.nombre}
                    onChange={(e) => handleChange(proveedor.id, 'nombre', e.target.value)}
                    placeholder="Nombre"
                  />
                  <Input
                    value={edited.ruc ?? proveedor.ruc ?? ''}
                    onChange={(e) => handleChange(proveedor.id, 'ruc', e.target.value)}
                    placeholder="RUC (opcional)"
                  />
                </>
              ) : (
                <>
                  <div>
                    <span className="font-semibold">{proveedor.nombre}</span>
                  </div>
                  <div className="text-sm text-gray-500">{proveedor.ruc || '—'}</div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={() => handleSave(proveedor.id)}
                    className="bg-blue-600 text-white"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => setEditId(null)} variant="outline">
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setEditId(proveedor.id)
                      setEditValues((prev) => ({
                        ...prev,
                        [proveedor.id]: {
                          nombre: proveedor.nombre,
                          ruc: proveedor.ruc ?? '',
                        },
                      }))
                    }}
                    variant="outline"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => onDelete(proveedor.id)}
                    variant="ghost"
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
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
