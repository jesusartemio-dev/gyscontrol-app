'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPlantillaEquipoById } from '@/lib/services/plantillaEquipo'
import {
  createPlantillaEquipoItem,
  deletePlantillaEquipoItem,
  updatePlantillaEquipoItem
} from '@/lib/services/plantillaEquipoItem'
import PlantillaEquipoItemForm from '@/components/plantillas/PlantillaEquipoItemForm'
import PlantillaEquipoItemList from '@/components/plantillas/PlantillaEquipoItemList'
import { PlantillaEquipo, PlantillaEquipoItem } from '@/types/modelos'

export default function PlantillaEquipoDetallePage() {
  const { equipoId } = useParams()
  const [equipo, setEquipo] = useState<PlantillaEquipo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof equipoId !== 'string') return

    getPlantillaEquipoById(equipoId)
      .then(data => {
        setEquipo(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Error al cargar la sección de equipo.')
        setLoading(false)
      })
  }, [equipoId])

  const handleCreated = (nuevo: PlantillaEquipoItem) => {
    if (!equipo) return
    setEquipo({ ...equipo, items: [...equipo.items, nuevo] })
  }

  const handleUpdated = (updated: PlantillaEquipoItem) => {
    if (!equipo) return
    setEquipo({
      ...equipo,
      items: equipo.items.map(i => (i.id === updated.id ? updated : i)),
    })
  }

  const handleDeleted = (id: string) => {
    if (!equipo) return
    setEquipo({
      ...equipo,
      items: equipo.items.filter(i => i.id !== id),
    })
  }

  if (loading) return <p className="p-4">Cargando sección de equipo...</p>
  if (error) return <p className="text-red-500 p-4">{error}</p>
  if (!equipo) return <p className="p-4">Sección no encontrada.</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Sección: {equipo.nombre}</h1>

      <PlantillaEquipoItemForm
        plantillaEquipoId={equipo.id}
        onCreated={handleCreated}
      />

      <PlantillaEquipoItemList
        items={equipo.items}
        onDeleted={handleDeleted}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
