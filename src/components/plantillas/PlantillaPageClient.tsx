'use client'

import { useEffect, useState } from 'react'
import { getPlantillas, createPlantilla } from '@/lib/services/plantilla'
import PlantillaForm from './PlantillaForm'
import PlantillaList from './PlantillaList'

interface Plantilla {
  id: string
  nombre: string
  totalCliente: number
}

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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">📦 Plantillas</h1>
      {error && <p className="text-red-500">{error}</p>}
      <PlantillaForm onCreated={handleCreated} />
      <PlantillaList plantillas={plantillas} />
    </div>
  )
}
