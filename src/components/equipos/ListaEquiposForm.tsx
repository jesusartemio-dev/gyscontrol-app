// ===================================================
// 📁 Archivo: ListaEquiposForm.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Formulario para crear una nueva lista técnica de equipos
//
// 🧠 Uso: Se utiliza en la vista del proyecto para añadir nuevas listas técnicas de equipos.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-09
// ===================================================

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ListaEquiposPayload } from '@/types'

interface Props {
  proyectoId: string // ✅ Agregado
  onCreated: (payload: ListaEquiposPayload) => void
}

export default function ListaEquiposForm({ proyectoId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      setLoading(true)
      onCreated({
        proyectoId,        // ✅ Incluido en el payload
        nombre,
        descripcion,
      })
      setNombre('')
      setDescripcion('')
      toast.success('Lista creada correctamente')
    } catch (error) {
      toast.error('Error al crear lista')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-xl p-4 shadow-md space-y-4">
      <h2 className="text-lg font-semibold">➕ Nueva Lista Técnica</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la lista"
        />
        <Input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
        />
        <Button
          className="bg-green-600 text-white"
          disabled={loading}
          onClick={handleSubmit}
        >
          Crear Lista
        </Button>
      </div>
    </div>
  )
}
