'use client'

import { useState } from 'react'
import { Proyecto, ListaEquipo } from '@/types'
import { Badge } from '@/components/ui/badge'

interface Props {
  proyectos: Proyecto[]
  listas: ListaEquipo[]
  onFilterChange: (proyectoId: string) => void
}

export default function LogisticaListaTecnicaResumen({
  proyectos,
  listas,
  onFilterChange,
}: Props) {
  const [selectedProyecto, setSelectedProyecto] = useState('')

  const totalListas = listas.length
  const totalPorCotizar = listas.filter((l) => l.estado === 'por_cotizar').length
  const totalPorValidar = listas.filter((l) => l.estado === 'por_validar').length
  const totalAprobadas = listas.filter((l) => l.estado === 'aprobada').length
  const totalRechazadas = listas.filter((l) => l.estado === 'rechazada').length

  const handleProyectoChange = (proyectoId: string) => {
    setSelectedProyecto(proyectoId)
    onFilterChange(proyectoId)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedProyecto === '' ? 'default' : 'outline'}
          onClick={() => handleProyectoChange('')}
          className="cursor-pointer"
        >
          Todos los proyectos
        </Badge>
        {proyectos.map((p) => (
          <Badge
            key={p.id}
            variant={selectedProyecto === p.id ? 'default' : 'outline'}
            onClick={() => handleProyectoChange(p.id)}
            className="cursor-pointer"
          >
            {p.nombre}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="bg-gray-100 px-3 py-1 rounded">
          Total listas: <strong>{totalListas}</strong>
        </div>
        <div className="bg-yellow-100 px-3 py-1 rounded">
          Por cotizar: <strong>{totalPorCotizar}</strong>
        </div>
        <div className="bg-blue-100 px-3 py-1 rounded">
          Por validar: <strong>{totalPorValidar}</strong>
        </div>
        <div className="bg-green-100 px-3 py-1 rounded">
          Aprobadas: <strong>{totalAprobadas}</strong>
        </div>
        <div className="bg-red-100 px-3 py-1 rounded">
          Rechazadas: <strong>{totalRechazadas}</strong>
        </div>
      </div>
    </div>
  )
}
