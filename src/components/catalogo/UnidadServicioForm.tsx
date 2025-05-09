// ===================================================
// 📁 Archivo: UnidadServicioForm.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Formulario para crear o editar Unidad de Servicio
//
// 🧠 Uso: Utilizado en páginas de catálogo. Enviar props onCreated/onUpdated
// ✍️ Autor: Jesús Artemio (Master Experto)
// 📅 Última actualización: 2025-04-20
// ===================================================

'use client'

import { useState } from 'react'
import { UnidadServicio, UnidadServicioPayload } from '@/types'
import { createUnidadServicio, updateUnidadServicio } from '@/lib/services/unidadServicio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'

interface Props {
  onCreated?: (unidad: UnidadServicio) => void
  onUpdated?: (unidad: UnidadServicio) => void
  defaultValue?: UnidadServicio
  isEditMode?: boolean
}

export default function UnidadServicioForm({
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

    const payload: UnidadServicioPayload = { nombre }

    try {
      let response
      if (isEditMode && defaultValue?.id) {
        response = await updateUnidadServicio(defaultValue.id, payload)
        toast.success('Unidad actualizada')
        onUpdated?.(response)
      } else {
        response = await createUnidadServicio(payload)
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
        {isEditMode ? '✏️ Editar Unidad' : '➕ Nueva Unidad de Servicio'}
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
