'use client'

import { useEffect, useState } from 'react'
import { getPlantillas, createPlantilla } from '@/lib/services/plantilla'
import PlantillaForm from './PlantillaForm'
import PlantillaList from './PlantillaList'
import type { Plantilla } from '@/types'

export default function PlantillaPageClient() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPlantillas()
      .then(setPlantillas)
      .catch(() => setError('Error al cargar plantillas.'))
  }, [])

  const handleCreated = (nueva: Plantilla) => {
    setPlantillas((prev) => [...prev, nueva])
  }

  const handleDelete = (id: string) => {
    setPlantillas((prev) => prev.filter(p => p.id !== id))
  }

  const handleUpdated = (actualizado: Plantilla) => {
    setPlantillas((prev) => prev.map(p => p.id === actualizado.id ? actualizado : p))
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">📦 Plantillas</h1>
      {error && <p className="text-red-500">{error}</p>}
      <PlantillaForm onCreated={handleCreated} />
      <PlantillaList 
        plantillas={plantillas} 
        onDelete={handleDelete}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
