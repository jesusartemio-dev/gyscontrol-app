// ===================================================
// 📁 Archivo: UnidadForm.tsx
// 📌 Descripción: Formulario para crear o editar Unidad
// ===================================================

'use client'

import { useState } from 'react'
import { Unidad, UnidadPayload } from '@/types'
import { createUnidad, updateUnidad } from '@/lib/services/unidad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'

interface Props {
  onCreated?: (unidad: Unidad) => void
  onUpdated?: (unidad: Unidad) => void
  defaultValue?: Unidad
  isEditMode?: boolean
}

export default function UnidadForm({
  onCreated,
  onUpdated,
  defaultValue,
  isEditMode = false,
}: Props) {
  const [nombre, setNombre] = useState(defaultValue?.nombre || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload: UnidadPayload = { nombre }

    try {
      let response
      if (isEditMode && defaultValue?.id) {
        response = await updateUnidad(defaultValue.id, payload)
        toast.success('Unidad actualizada')
        onUpdated?.(response)
      } else {
        response = await createUnidad(payload)
        toast.success('Unidad creada')
        onCreated?.(response)
        setNombre('')
      }
    } catch (error) {
      toast.error('Error al guardar')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">
        {isEditMode ? '✏️ Editar Unidad' : '➕ Nueva Unidad'}
      </h2>

      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de la unidad"
        required
        disabled={loading}
      />

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
      </Button>
    </form>
  )
}