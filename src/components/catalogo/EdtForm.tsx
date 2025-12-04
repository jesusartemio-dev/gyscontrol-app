// ===================================================
// 📁 Archivo: EdtForm.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Formulario para crear o editar EDT
//
// 🧠 Uso: Usado para agregar nuevos EDTs en el sistema GYS
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 🗓 Última actualización: 2025-10-15
// ===================================================

'use client'

import { useState } from 'react'
import { Edt, EdtPayload } from '@/types'
import { createEdt } from '@/lib/services/edt'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'

interface Props {
  onCreated?: (nueva: Edt) => void
}

export default function EdtForm({ onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: EdtPayload = {
        nombre,
        descripcion: descripcion.trim() || undefined
      }
      const nueva = await createEdt(payload)
      toast.success('EDT creado correctamente')
      setNombre('')
      setDescripcion('')
      onCreated?.(nueva)
    } catch (error) {
      toast.error('Error al crear EDT')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">➕ Nuevo EDT</h2>

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre *</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Instalación y Montaje"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción (Opcional)</Label>
        <Textarea
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Describe brevemente qué tipo de servicios incluye este EDT..."
          disabled={loading}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear EDT'}
      </Button>
    </form>
  )
}
