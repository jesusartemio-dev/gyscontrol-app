'use client'

// ===================================================
// 📁 Archivo: CategoriaServicioList.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Lista de categorías de servicio con edición inline y eliminación
// ===================================================

import { useState } from 'react'
import { Edt } from '@/types'
import { deleteEdt, updateEdt } from '@/lib/services/edt'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'

interface Props {
  data?: Edt[]
  onDelete?: (id: string) => void
  onUpdate?: (actualizada: Edt) => void
}

export default function EdtList({ data, onDelete, onUpdate }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')

  const handleEditar = (edt: Edt) => {
    setEditando(edt.id)
    setNombreEditado(edt.nombre)
  }

  const handleGuardar = async (id: string) => {
    try {
      const actualizada = await updateEdt(id, { nombre: nombreEditado })
      toast.success('EDT actualizado')
      onUpdate?.(actualizada)
      setEditando(null)
    } catch (error) {
      console.error('❌ Error al actualizar EDT', error)
      toast.error('Error al actualizar')
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await deleteEdt(id)
      toast.success('EDT eliminado')
      onDelete?.(id)
    } catch (error) {
      console.error('❌ Error al eliminar EDT', error)
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">📂 Lista de EDTs</h2>
      <ul className="space-y-2">
        {data?.map((edt) => (
          <li
            key={edt.id}
            className="p-3 bg-gray-100 rounded shadow flex justify-between items-center gap-2"
          >
            {editando === edt.id ? (
              <Input
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                className="flex-1"
              />
            ) : (
              <span className="flex-1">{edt.nombre}</span>
            )}

            {editando === edt.id ? (
              <Button size="sm" onClick={() => handleGuardar(edt.id)}>
                Guardar
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleEditar(edt)}>
                Editar
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleEliminar(edt.id)}
            >
              Eliminar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
