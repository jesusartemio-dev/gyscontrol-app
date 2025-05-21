// ===================================================
// 📁 Archivo: RecursoList.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Lista editable de recursos
//
// 🧠 Uso: Permite editar y eliminar recursos inline
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

'use client'

import { useState } from 'react'
import { Recurso } from '@/types'
import { deleteRecurso, updateRecurso } from '@/lib/services/recurso'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'

interface Props {
  data?: Recurso[]
  onUpdate?: (r: Recurso) => void
  onDelete?: (id: string) => void
}

export default function RecursoList({ data, onUpdate, onDelete }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [costoHora, setCostoHora] = useState(0)

  const iniciarEdicion = (r: Recurso) => {
    setEditando(r.id)
    setNombre(r.nombre)
    setCostoHora(r.costoHora)
  }

  const guardar = async (id: string) => {
    try {
      const actualizado = await updateRecurso(id, { nombre, costoHora })
      toast.success('Actualizado')
      onUpdate?.(actualizado)
      setEditando(null)
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const eliminar = async (id: string) => {
    try {
      await deleteRecurso(id)
      toast.success('Eliminado')
      onDelete?.(id)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">📋 Recursos</h2>
      <ul className="space-y-2">
        {data?.map((r) => (
          <li key={r.id} className="flex items-center gap-2 bg-gray-100 p-3 rounded shadow">
            {editando === r.id ? (
              <>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="flex-1" />
                <Input
                  type="number"
                  value={costoHora}
                  onChange={(e) => setCostoHora(parseFloat(e.target.value))}
                  className="w-32"
                />
                <Button size="sm" onClick={() => guardar(r.id)}>Guardar</Button>
              </>
            ) : (
              <>
                <span className="flex-1">{r.nombre}</span>
                <span className="w-32 text-right">$ {r.costoHora.toFixed(2)}</span>
                <Button size="sm" onClick={() => iniciarEdicion(r)}>Editar</Button>
              </>
            )}
            <Button variant="destructive" size="sm" onClick={() => eliminar(r.id)}>Eliminar</Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
