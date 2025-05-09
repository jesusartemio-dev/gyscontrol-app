// ===================================================
// 📁 Archivo: PlantillaServicioItemForm.tsx
// 🔍 Ubicación: src/components/plantillas/
// 🔧 Descripción: Formulario para agregar ítems a una sección de servicios de plantilla
//
// 🧠 Uso: Selecciona un servicio del catálogo y lo agrega a la sección de plantilla correspondiente
// 📝 Autor: Asistente IA GYS
// 🗓️ Última actualización: 2025-04-23
// ===================================================

'use client'

import { useState } from 'react'
import { calcularHoras } from '@/lib/utils/formulas'
import { createPlantillaServicioItem } from '@/lib/services/plantillaServicioItem'
import type { PlantillaServicioItemPayload, TipoFormula } from '@/types'

interface Props {
  grupoId: string
  catalogoId: string
  nombre: string
  descripcion: string
  categoria: string
  formula: TipoFormula
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  unidadServicioNombre: string
  recursoNombre: string
  unidadServicioId: string
  recursoId: string
  costoHora: number
  onCreated: () => void
}

export default function PlantillaServicioItemForm({
  grupoId,
  catalogoId,
  nombre,
  descripcion,
  categoria,
  formula,
  horaBase,
  horaRepetido,
  horaUnidad,
  horaFijo,
  unidadServicioNombre,
  recursoNombre,
  unidadServicioId,
  recursoId,
  costoHora,
  onCreated
}: Props) {
  const [cantidad, setCantidad] = useState(1)
  const [factorSeguridad, setFactorSeguridad] = useState(1)
  const [margen, setMargen] = useState(1.35)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const horas = calcularHoras({
    formula,
    cantidad,
    horaBase,
    horaRepetido,
    horaUnidad,
    horaFijo
  })

  const costoInterno = horas * costoHora * factorSeguridad
  const costoCliente = costoInterno * margen

  const handleAdd = async () => {
    setLoading(true)
    try {
      const payload: PlantillaServicioItemPayload = {
        plantillaServicioId: grupoId,
        catalogoServicioId: catalogoId,
        unidadServicioId,
        recursoId,
        nombre,
        descripcion,
        categoria,
        formula,
        horaBase,
        horaRepetido,
        horaUnidad,
        horaFijo,
        unidadServicioNombre,
        recursoNombre,
        costoHora,
        cantidad,
        horaTotal: horas,
        factorSeguridad,
        margen,
        costoInterno,
        costoCliente
      }

      await createPlantillaServicioItem(payload)
      onCreated()
    } catch (err) {
      setError('Error al agregar ítem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border p-4 rounded-lg bg-white shadow-md space-y-2">
      <div className="text-sm font-semibold text-gray-800">{nombre}</div>
      <div className="text-xs text-gray-600 italic">{descripcion}</div>
      <div className="text-xs text-gray-500">{recursoNombre} • {unidadServicioNombre}</div>
      <div className="text-xs text-gray-500">Categoría: {categoria}</div>
      <div className="text-xs text-gray-500">Fórmula: {formula}</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
        <div>
          <label className="text-xs text-gray-500">Cantidad</label>
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))}
            className="border px-2 py-1 rounded text-sm w-full"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">FS</label>
          <input
            type="number"
            step={0.1}
            value={factorSeguridad}
            onChange={(e) => setFactorSeguridad(parseFloat(e.target.value))}
            className="border px-2 py-1 rounded text-sm w-full"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Margen</label>
          <input
            type="number"
            step={0.01}
            value={margen}
            onChange={(e) => setMargen(parseFloat(e.target.value))}
            className="border px-2 py-1 rounded text-sm w-full"
          />
        </div>
        <div className="text-xs text-gray-500 pt-5">
          Horas: {horas} • Cliente: S/ {costoCliente.toFixed(2)}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleAdd}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
        >
          {loading ? 'Agregando...' : '✅ Agregar'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
