'use client'

import { useEffect, useState } from 'react'
import type { Plantilla } from '@/types'
import DashboardCardPlantilla from '@/components/plantillas/DashboardCardPlantilla'
import { getPlantillas } from '@/lib/services/plantilla'

const estados = ['todos', 'borrador', 'revisado', 'aprobado', 'rechazado']

export default function DashboardPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [estadoFiltro, setEstadoFiltro] = useState('todos')

  useEffect(() => {
    getPlantillas()
      .then(data => setPlantillas(data))
      .catch(err => console.error('❌ Error al cargar plantillas:', err))
  }, [])

  const plantillasFiltradas =
    estadoFiltro === 'todos'
      ? plantillas
      : plantillas.filter(p => p.estado === estadoFiltro)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📊 Dashboard de Plantillas</h1>

        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="border px-2 py-1 text-sm rounded"
        >
          {estados.map(e => (
            <option key={e} value={e}>
              {e[0].toUpperCase() + e.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plantillasFiltradas.map(p => (
          <DashboardCardPlantilla key={p.id} plantilla={p} />
        ))}
      </div>
    </div>
  )
}
