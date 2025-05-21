// ===================================================
// 📁 Archivo: PedidoEquipoForm.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Formulario para crear un nuevo pedido de equipos desde proyectos
//
// 🧠 Uso: Usado en la vista del proyecto para solicitar pedidos vinculados a listas técnicas
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { useState } from 'react'
import { PedidoEquipoPayload, ListaEquipo } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props {
  listas: ListaEquipo[]
  proyectoId: string
  responsableId: string
  onCreated: (payload: PedidoEquipoPayload) => void
}

export default function PedidoEquipoForm({
  listas,
  proyectoId,
  responsableId,
  onCreated,
}: Props) {
  const [listaId, setListaId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!listaId) {
      toast.error('Debe seleccionar una lista técnica')
      return
    }

    try {
      setLoading(true)
      const payload: PedidoEquipoPayload = {
        proyectoId,
        responsableId,
        listaId,
        observacion,
        fechaEntregaEstimada: fechaNecesaria,
      }
      onCreated(payload)
      toast.success('Pedido creado correctamente')
      setListaId('')
      setObservacion('')
    } catch (err) {
      toast.error('Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-xl p-4 shadow-md space-y-4">
      <h2 className="text-lg font-semibold text-blue-600">📦 Crear Pedido de Equipos</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={listaId}
          onChange={(e) => setListaId(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Seleccionar lista técnica...</option>
          {listas.map((lista) => (
            <option key={lista.id} value={lista.id}>
              {lista.nombre}
            </option>
          ))}
        </select>

        <Input
          type="date"
          value={fechaNecesaria}
          onChange={(e) => setFechaNecesaria(e.target.value)}
          className="text-sm"
        />

        <Input
          placeholder="Observación (opcional)"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />

        <Button
          className="bg-green-600 text-white"
          disabled={loading}
          onClick={handleSubmit}
        >
          Crear Pedido
        </Button>
      </div>
    </div>
  )
}
