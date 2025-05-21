'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ProveedorPayload } from '@/types'

interface Props {
  onCreated?: (payload: ProveedorPayload) => void
}

export default function ProveedorForm({ onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      setLoading(true)
      const payload: ProveedorPayload = { nombre, ruc }
      onCreated?.(payload)
      setNombre('')
      setRuc('')
    } catch (err) {
      toast.error('Error al crear proveedor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-xl p-4 shadow space-y-4">
      <h2 className="text-lg font-semibold">➕ Nuevo Proveedor</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del proveedor"
        />
        <Input
          value={ruc}
          onChange={(e) => setRuc(e.target.value)}
          placeholder="RUC (opcional)"
        />
        <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white">
          Crear
        </Button>
      </div>
    </div>
  )
}
