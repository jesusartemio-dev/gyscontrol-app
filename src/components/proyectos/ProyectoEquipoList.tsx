// ===================================================
// 📁 Archivo: ProyectoEquipoList.tsx
// 📍 Ubicación: src/components/proyectos/
// 🔧 Descripción: Lista de grupos de equipos técnicos del proyecto
//
// 🧠 Uso: Se muestra dentro de /proyectos/[id]/equipos/page.tsx
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import type { ProyectoEquipo } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  proyectoId: string
  onSelect?: (equipoId: string) => void
  onCreated?: () => void
}

export default function ProyectoEquipoList({ proyectoId, onSelect, onCreated }: Props) {
  const [equipos, setEquipos] = useState<ProyectoEquipo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProyectoEquipos(proyectoId)
      .then(setEquipos)
      .finally(() => setLoading(false))
  }, [proyectoId, onCreated])

  return (
    <div className="space-y-4">
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))
      ) : (
        equipos.map((grupo) => (
          <Card
            key={grupo.id}
            className="hover:bg-gray-100 cursor-pointer"
            onClick={() => onSelect?.(grupo.id)}
          >
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-gray-800">
                ⚙️ {grupo.nombre}
              </h3>
              {grupo.descripcion && (
                <p className="text-sm text-gray-500">{grupo.descripcion}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
