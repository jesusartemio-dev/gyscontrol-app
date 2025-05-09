'use client'

import { useEffect, useState } from 'react'
import PlantillaForm from '@/components/plantillas/PlantillaForm'
import PlantillaList from '@/components/plantillas/PlantillaList'
import { getPlantillas } from '@/lib/services/plantilla'
import { calcularTotal } from '@/lib/utils/costos'
import type { Plantilla } from '@/types'

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlantillas()
      .then((data) => {
        const actualizadas = data.map((p) => ({
          ...p,
          ...calcularTotal(p) // 💡 recalcula subtotales locales por seguridad
        }))
        setPlantillas(actualizadas)
      })
      .catch(() => setError('Error al cargar plantillas.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (nueva: Plantilla) => {
    setPlantillas((prev) => [
      ...prev,
      { ...nueva, ...calcularTotal(nueva) }
    ])
  }

  const handleDelete = (id: string) => {
    setPlantillas((prev) => prev.filter((p) => p.id !== id))
  }

  const handleUpdated = (actualizada: Plantilla) => {
    setPlantillas((prev) =>
      prev.map((p) =>
        p.id === actualizada.id ? { ...actualizada, ...calcularTotal(actualizada) } : p
      )
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">📦 Gestión de Plantillas</h1>

      <PlantillaForm onCreated={handleCreated} />

      {error && <p className="text-red-500">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Cargando plantillas...</p>
      ) : (
        <PlantillaList
          plantillas={plantillas}
          onDelete={handleDelete}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
