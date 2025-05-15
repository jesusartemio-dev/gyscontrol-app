'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListaEquiposItemPayload } from '@/types'
import { toast } from 'sonner'

interface Props {
  listaId: string
  onCreated: (item: ListaEquiposItemPayload) => void
}

export default function ListaEquiposItemForm({ listaId, onCreated }: Props) {
  const [form, setForm] = useState<ListaEquiposItemPayload>({
    listaId,
    codigo: '',
    descripcion: '',
    unidad: '',
    cantidad: 1,
    precioReferencial: undefined,
  })

  const handleChange = (field: keyof ListaEquiposItemPayload, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.codigo.trim() || !form.descripcion.trim() || !form.unidad.trim()) {
      toast.warning('Todos los campos son obligatorios')
      return
    }

    const payload: ListaEquiposItemPayload = {
      ...form,
      cantidad: form.cantidad || 1,
      precioReferencial: form.precioReferencial ?? 0,
    }

    onCreated(payload)

    setForm({
      listaId,
      codigo: '',
      descripcion: '',
      unidad: '',
      cantidad: 1,
      precioReferencial: undefined,
    })

    toast.success('✅ Ítem agregado a la lista')
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
      <Input
        placeholder="Código"
        value={form.codigo}
        onChange={(e) => handleChange('codigo', e.target.value)}
      />
      <Input
        placeholder="Descripción"
        value={form.descripcion}
        onChange={(e) => handleChange('descripcion', e.target.value)}
      />
      <Input
        placeholder="Unidad"
        value={form.unidad}
        onChange={(e) => handleChange('unidad', e.target.value)}
      />
      <Input
        type="number"
        placeholder="Cantidad"
        value={form.cantidad}
        onChange={(e) =>
          handleChange('cantidad', parseFloat(e.target.value) || 0)
        }
      />
      <Input
        type="number"
        placeholder="Precio Referencial"
        value={form.precioReferencial ?? ''}
        onChange={(e) =>
          handleChange('precioReferencial', parseFloat(e.target.value) || 0)
        }
      />
      <div className="col-span-1 md:col-span-5 text-right">
        <Button type="submit" className="bg-green-600 text-white">➕ Agregar</Button>
      </div>
    </form>
  )
}
