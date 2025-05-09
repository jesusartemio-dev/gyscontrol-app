'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createPlantillaGastoItem } from '@/lib/services/plantillaGastoItem'
import type { PlantillaGastoItemPayload, PlantillaGastoItem } from '@/types'

interface Props {
  gastoId: string
  onCreated?: (item: PlantillaGastoItem) => void
}

export default function PlantillaGastoItemForm({ gastoId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [precioUnitario, setPrecioUnitario] = useState(0)
  const [factorSeguridad, setFactorSeguridad] = useState(1)
  const [margen, setMargen] = useState(1)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!nombre || cantidad <= 0 || precioUnitario <= 0) {
      toast.error('Completa los campos obligatorios')
      return
    }

    try {
      setLoading(true)

      const payload: PlantillaGastoItemPayload = {
        gastoId,
        nombre,
        descripcion,
        cantidad,
        precioUnitario,
        factorSeguridad,
        margen,
        costoInterno: cantidad * precioUnitario * factorSeguridad,
        costoCliente: cantidad * precioUnitario * factorSeguridad * margen
      }

      const nuevo = await createPlantillaGastoItem(payload)
      toast.success('Ítem agregado')
      if (nuevo) {
        onCreated?.(nuevo)
      }

      setNombre('')
      setDescripcion('')
      setCantidad(1)
      setPrecioUnitario(0)
      setFactorSeguridad(1)
      setMargen(1)
    } catch (err) {
      console.error(err)
      toast.error('Error al agregar ítem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
    >
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <Input
          placeholder="Ej: Transporte"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <Input
          placeholder="Detalle opcional"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Cantidad</label>
        <Input
          type="number"
          placeholder="1"
          value={cantidad}
          onChange={(e) => setCantidad(parseFloat(e.target.value))}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Precio unitario ($)</label>
        <Input
          type="number"
          placeholder="0.00"
          value={precioUnitario}
          onChange={(e) => setPrecioUnitario(parseFloat(e.target.value))}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Factor de seguridad</label>
        <Input
          type="number"
          placeholder="1.0"
          value={factorSeguridad}
          onChange={(e) => setFactorSeguridad(parseFloat(e.target.value))}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Margen</label>
        <Input
          type="number"
          placeholder="1.0"
          value={margen}
          onChange={(e) => setMargen(parseFloat(e.target.value))}
        />
      </div>

      <Button
        disabled={loading}
        type="submit"
        className="col-span-1 md:col-span-3 bg-green-600 text-white"
      >
        {loading ? 'Agregando...' : '➕ Agregar ítem'}
      </Button>
    </form>
  )
}
