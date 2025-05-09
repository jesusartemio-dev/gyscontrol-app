'use client'

// ===================================================
// 📁 Archivo: PlantillaEquipoItemForm.tsx
// 📌 Ubicación: src/components/plantillas/
// 🔧 Agrega ítems de equipos a la plantilla con selección desde modal
// ===================================================

import { useState } from 'react'
import { createPlantillaEquipoItem } from '@/lib/services/plantillaEquipoItem'
import type { CatalogoEquipo, PlantillaEquipoItem, PlantillaEquipoItemPayload } from '@/types'
import EquipoCatalogoModal from '@/components/catalogo/EquipoCatalogoModal'

interface Props {
  plantillaEquipoId: string
  onCreated: (item: PlantillaEquipoItem) => void
}

export default function PlantillaEquipoItemForm({ plantillaEquipoId, onCreated }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [equipo, setEquipo] = useState<CatalogoEquipo | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!equipo) {
      setError('Selecciona un equipo antes de agregar.')
      return
    }

    if (!equipo.categoria?.nombre || !equipo.unidad?.nombre) {
      setError('Este equipo no tiene categoría o unidad asignada.')
      return
    }

    try {
      setLoading(true)

      const payload: PlantillaEquipoItemPayload = {
        plantillaEquipoId,
        catalogoEquipoId: equipo.id,
        codigo: equipo.codigo,
        descripcion: equipo.descripcion,
        categoria: equipo.categoria.nombre,
        unidad: equipo.unidad.nombre,
        marca: equipo.marca,
        precioInterno: equipo.precioInterno,
        precioCliente: equipo.precioVenta,
        cantidad,
        costoInterno: cantidad * equipo.precioInterno,
        costoCliente: cantidad * equipo.precioVenta
      }

      const creado = await createPlantillaEquipoItem(payload)
      onCreated(creado)
      setCantidad(1)
      setEquipo(null)
    } catch (err) {
      console.error(err)
      setError('Error al crear ítem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center w-full">
        {error && <p className="text-red-500 text-sm sm:col-span-4">{error}</p>}

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="border px-3 py-2 rounded text-sm text-left bg-white hover:bg-gray-50"
        >
          {equipo ? `${equipo.codigo} - ${equipo.descripcion}` : '🔍 Seleccionar equipo del catálogo'}
        </button>

        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className="border px-3 py-2 rounded text-sm w-full ring-1 ring-gray-300 focus:outline-none focus:ring-blue-500"
          placeholder="Cantidad"
          disabled={loading}
        />

        <div className="text-gray-600 text-sm px-2">
          {equipo && <>💰 S/ {equipo.precioVenta.toFixed(2)}</>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Agregando...' : '➕ Agregar'}
        </button>
      </form>

      <EquipoCatalogoModal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSeleccionar={(eq) => setEquipo(eq)}
      />
    </>
  )
}
