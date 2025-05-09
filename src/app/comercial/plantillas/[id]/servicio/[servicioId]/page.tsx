// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: /app/comercial/plantillas/[id]/servicio/[servicioId]/page.tsx
// 🔧 Descripción: Vista de detalle de los ítems de un grupo de servicio en una plantilla
// 🧠 Uso: Permite editar, eliminar y listar los PlantillaServicioItem dentro de un PlantillaServicio
// ✍️ Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-22
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  getPlantillaServicioById
} from '@/lib/services/plantillaServicio'
import {
  createPlantillaServicioItem,
  deletePlantillaServicioItem,
  updatePlantillaServicioItem
} from '@/lib/services/plantillaServicioItem'
import { recalcularTotalesPlantilla } from '@/lib/utils/recalculoPlantilla'
import PlantillaServicioItemList from '@/components/plantillas/PlantillaServicioItemList'
import { calcularSubtotal } from '@/lib/utils/costos'
import type { PlantillaServicio, PlantillaServicioItem } from '@/types'

export default function ServicioDetallePage() {
  const { servicioId, id: plantillaId } = useParams()
  const [grupo, setGrupo] = useState<PlantillaServicio | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof servicioId === 'string') {
      getPlantillaServicioById(servicioId)
        .then(setGrupo)
        .catch(() => setError('Error al cargar el grupo de servicios'))
    }
  }, [servicioId])

  const actualizarItems = async (callback: (items: PlantillaServicioItem[]) => PlantillaServicioItem[]) => {
    if (!grupo || typeof plantillaId !== 'string') return
    const nuevosItems = callback(grupo.items)
    const nuevosTotales = calcularSubtotal(nuevosItems)
    setGrupo({ ...grupo, items: nuevosItems, ...nuevosTotales })

    // ✅ Recalcula y guarda los totales globales
    await recalcularTotalesPlantilla(plantillaId)
  }

  if (error) return <p className="text-red-500">{error}</p>
  if (!grupo) return <p className="text-gray-600">Cargando grupo de servicios...</p>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">
        {grupo.nombre}
        <span className="ml-2 text-sm text-gray-500 italic">({grupo.items[0]?.categoria})</span>
      </h1>

      <PlantillaServicioItemList
        items={grupo.items}
        onDeleted={(id) => actualizarItems(items => items.filter(i => i.id !== id))}
        onUpdated={(item) => actualizarItems(items => items.map(i => i.id === item.id ? item : i))}
      />
    </div>
  )
}
