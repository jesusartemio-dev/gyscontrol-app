'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProyectoById, updateProyecto } from '@/lib/services/proyecto'
import type { Proyecto, ProyectoEquipo, ProyectoEquipoItem } from '@/types'
import ProyectoEquipoList from '@/components/proyectos/equipos/ProyectoEquipoList'

export default function ProyectoDetallePage() {
  const { id } = useParams()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof id === 'string') {
      getProyectoById(id)
        .then(setProyecto)
        .catch(() => setError('Error al cargar proyecto'))
    }
  }, [id])

  const handleEquipoItemChange = (equipoId: string, items: ProyectoEquipoItem[]) => {
    if (!proyecto) return
    const nuevosEquipos = proyecto.equipos.map(eq =>
      eq.id === equipoId ? { ...eq, items } : eq
    )
    setProyecto({ ...proyecto, equipos: nuevosEquipos })
  }

  const handleActualizarNombreEquipo = (equipoId: string, nuevo: string) => {
    if (!proyecto) return
    const nuevosEquipos = proyecto.equipos.map(eq =>
      eq.id === equipoId ? { ...eq, nombre: nuevo } : eq
    )
    setProyecto({ ...proyecto, equipos: nuevosEquipos })
  }

  const handleEliminarGrupoEquipo = (equipoId: string) => {
    if (!proyecto) return
    const nuevosEquipos = proyecto.equipos.filter(eq => eq.id !== equipoId)
    setProyecto({ ...proyecto, equipos: nuevosEquipos })
  }

  const handleEquipoChange = (equipoId: string, changes: Partial<ProyectoEquipo>) => {
    if (!proyecto) return
    const nuevosEquipos = proyecto.equipos.map(eq =>
      eq.id === equipoId ? { ...eq, ...changes } : eq
    )
    setProyecto({ ...proyecto, equipos: nuevosEquipos })
  }

  if (error) return <p className="text-red-500">{error}</p>
  if (!proyecto) return <p className="text-gray-500">Cargando proyecto...</p>

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{proyecto.nombre}</h1>
        <p className="text-sm text-gray-500">Código: {proyecto.codigo} | Estado: {proyecto.estado}</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Equipos</h2>
        <ProyectoEquipoList
          equipos={proyecto.equipos}
          onItemChange={handleEquipoItemChange}
          onUpdatedNombre={handleActualizarNombreEquipo}
          onDeletedGrupo={handleEliminarGrupoEquipo}
          onChange={handleEquipoChange}
        />
      </section>
    </div>
  )
}
