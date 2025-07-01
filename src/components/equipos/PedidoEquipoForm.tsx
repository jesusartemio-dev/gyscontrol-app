'use client'

import { useState } from 'react'
import { PedidoEquipoPayload, ListaEquipo, ListaEquipoItem } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Label } from '@/components/ui/label'

interface Props {
  listas: ListaEquipo[]
  proyectoId: string
  responsableId: string
  onCreated: (payload: PedidoEquipoPayload) => void
  onRefreshListas?: () => void
}

export default function PedidoEquipoForm({
  listas,
  proyectoId,
  responsableId,
  onCreated,
  onRefreshListas,
}: Props) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [listaId, setListaId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  const listaSeleccionada = listas.find((l) => l.id === listaId)

  const handleCantidadChange = (itemId: string, value: number) => {
    setCantidades((prev) => ({ ...prev, [itemId]: value }))
  }

  const calcularCostoTotal = (item: ListaEquipoItem) => {
    const cantidad = cantidades[item.id] || 0
    return cantidad * (item.precioElegido || 0)
  }

  const tieneItemsPendientes = listaSeleccionada
    ? listaSeleccionada.items.some(
        (item) => (item.cantidad - (item.cantidadPedida || 0)) > 0
      )
    : false

  const handleSubmit = async () => {
    if (!listaId) {
      toast.error('Debe seleccionar una lista técnica')
      return
    }

    const excedidos = listaSeleccionada?.items.some((item) => {
      const requerido = item.cantidad
      const yaPedido = item.cantidadPedida || 0
      const pendiente = requerido - yaPedido
      const aPedir = cantidades[item.id] || 0
      return aPedir > pendiente
    })

    if (excedidos) {
      toast.error('No puedes pedir más cantidad de la disponible')
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
      await onCreated(payload)
      toast.success('Pedido creado correctamente')
      setListaId('')
      setObservacion('')
      setCantidades({})
      setMostrarFormulario(false)
      onRefreshListas?.()
    } catch (err) {
      toast.error('Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  if (!mostrarFormulario) {
    return (
      <Button
        className="bg-blue-600 text-white"
        onClick={() => setMostrarFormulario(true)}
      >
        ➕ Crear Pedido de Equipos
      </Button>
    )
  }

  return (
    <div className="border rounded-xl p-4 shadow-md space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-blue-600">📦 Crear Pedido de Equipos</h2>
        <Button
          variant="outline"
          onClick={() => setMostrarFormulario(false)}
        >
          Cancelar
        </Button>
      </div>

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

        <div>
          <Label>📅 Fecha Necesaria</Label>
          <Input
            type="date"
            value={fechaNecesaria}
            onChange={(e) => setFechaNecesaria(e.target.value)}
            className="text-sm"
          />
        </div>

        <Input
          placeholder="Observación (opcional)"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />

        <Button
          className="bg-green-600 text-white"
          disabled={loading || !tieneItemsPendientes}
          onClick={handleSubmit}
        >
          Crear Pedido
        </Button>
      </div>

      {listaSeleccionada && (
        <div className="mt-6">
          <h3 className="text-md font-semibold text-gray-800">📝 Ítems de la Lista</h3>
          <table className="w-full mt-2 text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Descripción</th>
                <th>Unidad</th>
                <th>Requerido</th>
                <th>Ya Pedido</th>
                <th>Pendiente</th>
                <th>Cantidad a Pedir</th>
                <th>Precio Unitario</th>
                <th>Costo Total</th>
              </tr>
            </thead>
            <tbody>
              {listaSeleccionada.items.map((item) => {
                const requerido = item.cantidad
                const yaPedido = item.cantidadPedida || 0
                const pendiente = requerido - yaPedido
                const cantidad = cantidades[item.id] || 0
                const precio = item.precioElegido || 0
                return (
                  <tr key={item.id} className="border-t text-center">
                    <td>{item.descripcion}</td>
                    <td>{item.unidad}</td>
                    <td>{requerido}</td>
                    <td>{yaPedido}</td>
                    <td>{pendiente}</td>
                    <td>
                      <Input
                        type="number"
                        value={cantidad || ''}
                        min={0}
                        max={pendiente}
                        onChange={(e) =>
                          handleCantidadChange(item.id, parseFloat(e.target.value))
                        }
                      />
                    </td>
                    <td>S/. {precio.toFixed(2)}</td>
                    <td>S/. {calcularCostoTotal(item).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
