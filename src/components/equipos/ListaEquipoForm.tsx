'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ListaEquipoPayload } from '@/types'
import { PlusCircle, X } from 'lucide-react'

interface Props {
  proyectoId: string
  onCreated: (payload: ListaEquipoPayload) => void
}

export default function ListaEquipoForm({ proyectoId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      setLoading(true)

      onCreated({
        proyectoId,
        nombre,
        codigo: undefined,          // generado en backend
        numeroSecuencia: undefined, // generado en backend
      })

      setNombre('')
      setVisible(false)
      toast.success('Lista creada correctamente')
    } catch {
      toast.error('Error al crear lista')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!visible && (
        <Button
          onClick={() => setVisible(true)}
          className="bg-green-600 text-white"
        >
          <PlusCircle className="w-4 h-4 mr-2" /> Nueva Lista Técnica
        </Button>
      )}

      {visible && (
        <div className="border rounded-xl p-4 shadow-md space-y-4 bg-white">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              ➕ Crear Nueva Lista Técnica
            </h2>
            <Button variant="ghost" onClick={() => setVisible(false)}>
              <X className="w-5 h-5 text-red-500" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la lista"
              className="w-full"
            />
            <Button
              className="bg-blue-600 text-white"
              disabled={loading}
              onClick={handleSubmit}
            >
              Crear Lista
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
