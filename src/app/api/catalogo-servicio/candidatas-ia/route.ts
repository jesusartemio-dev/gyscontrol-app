import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Solo lectura — NUNCA escribe en CatalogoServicio. Agrupa
 * CronogramaIASugerenciaAceptada por (tipo, nombreNormalizado) y devuelve
 * solo los grupos aceptados en 2+ proyectos distintos: un aviso
 * informativo para que el usuario decida si agrega la familia/tarea al
 * catálogo real, a mano, por el formulario "Nuevo servicio" de esta misma
 * página — ver project_catalogo_cronograma_boundary.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const filas = await prisma.cronogramaIASugerenciaAceptada.findMany({
    select: { tipo: true, nombre: true, nombreNormalizado: true, proyectoId: true, aceptadaEn: true },
    orderBy: { aceptadaEn: 'desc' },
  })

  const grupos = new Map<string, { tipo: string; nombre: string; proyectos: Set<string> }>()
  for (const fila of filas) {
    const clave = `${fila.tipo}::${fila.nombreNormalizado}`
    if (!grupos.has(clave)) {
      grupos.set(clave, { tipo: fila.tipo, nombre: fila.nombre, proyectos: new Set() })
    }
    grupos.get(clave)!.proyectos.add(fila.proyectoId)
  }

  const candidatas = Array.from(grupos.values())
    .filter(g => g.proyectos.size >= 2)
    .map(g => ({ tipo: g.tipo, nombre: g.nombre, proyectos: g.proyectos.size }))
    .sort((a, b) => b.proyectos - a.proyectos)

  return NextResponse.json({ candidatas })
}
