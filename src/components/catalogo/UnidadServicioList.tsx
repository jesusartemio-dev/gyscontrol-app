// ===================================================
// 📁 Archivo: UnidadServicioList.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Lista de unidades con edición inline y eliminación
//
// 🧠 Uso: Se muestra junto al formulario de creación
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-20
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { UnidadServicio } from '@/types'
import { getUnidadesServicio, deleteUnidadServicio, updateUnidadServicio } from '@/lib/services/unidadServicio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'

interface Props {
  data?: UnidadServicio[]
  onDelete?: (id: string) => void
  onUpdate?: (unidad: UnidadServicio) => void
  onRefresh?: () => void
}

export default function UnidadServicioList({ data, onDelete, onUpdate, onRefresh }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')

  const handleEditar = (unidad: UnidadServicio) => {
    setEditando(unidad.id)
    setNombreEditado(unidad.nombre)
  }

  const handleGuardar = async (id: string) => {
    try {
      const actualizado = await updateUnidadServicio(id, { nombre: nombreEditado })
      toast.success('Actualizado')
      onUpdate?.(actualizado)
      onRefresh?.()
      setEditando(null)
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await deleteUnidadServicio(id)
      toast.success('Eliminado')
      onDelete?.(id)
      onRefresh?.()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">📋 Lista de Unidades de Servicio</h2>
      <ul className="space-y-2">
        {data?.map((unidad) => (
          <li
            key={unidad.id}
            className="p-3 bg-gray-100 rounded shadow flex justify-between items-center gap-2"
          >
            {editando === unidad.id ? (
              <Input
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                className="flex-1"
              />
            ) : (
              <span className="flex-1">{unidad.nombre}</span>
            )}

            {editando === unidad.id ? (
              <Button size="sm" onClick={() => handleGuardar(unidad.id)}>
                Guardar
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleEditar(unidad)}>
                Editar
              </Button>
            )}

            <Button variant="destructive" size="sm" onClick={() => handleEliminar(unidad.id)}>
              Eliminar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
