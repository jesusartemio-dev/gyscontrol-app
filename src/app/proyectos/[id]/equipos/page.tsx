'use client'

// ===================================================
// 📁 Página: /proyectos/[id]/equipos/page.tsx
// 📌 Descripción: Visualiza grupos de equipos con ítems anidados
// ===================================================

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getProyectoById } from '@/lib/services/proyecto'
import ProyectoEquipoAccordion from '@/components/proyectos/ProyectoEquipoAccordion'
import type { Proyecto } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function ProyectoEquiposPage() {
  const { id } = useParams()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getProyectoById(id as string)
      .then(setProyecto)
      .catch(() => toast.error('Error al obtener ítems de equipos del proyecto'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Skeleton className="h-32 w-full" />
  if (!proyecto) return <p>No se encontró el proyecto</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        🛠️ Equipos Técnicos del Proyecto: <span className="text-blue-600">{proyecto.nombre}</span>
      </h1>

      {proyecto.equipos.map((grupo) => (
        <ProyectoEquipoAccordion key={grupo.id} equipo={grupo} />
      ))}
    </div>
  )
}
