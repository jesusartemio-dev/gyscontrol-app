import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const REGEX_ALTO_RIESGO = /ejecuci|montaje|obra|instalaci|construcci|comisionamiento/i

function esFaseAltoRiesgo(nombre: string): boolean {
  const n = nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return REGEX_ALTO_RIESGO.test(n)
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const cronograma = await prisma.proyectoCronograma.findUnique({
    where: { proyectoId_tipo: { proyectoId, tipo: 'planificacion' } },
    select: { id: true },
  })

  if (!cronograma) {
    return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
  }

  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    select: {
      id: true,
      nombre: true,
      orden: true,
      proyectoEdt: {
        select: {
          id: true,
          nombre: true,
          orden: true,
          _count: { select: { proyectoTarea: true } },
        },
        orderBy: { orden: 'asc' },
      },
    },
    orderBy: { orden: 'asc' },
  })

  const result = fases.map(fase => {
    const esEjecucion = esFaseAltoRiesgo(fase.nombre)
    return {
      fase: { id: fase.id, nombre: fase.nombre, orden: fase.orden, esEjecucion },
      edts: fase.proyectoEdt.map(edt => ({
        id: edt.id,
        nombre: edt.nombre,
        orden: edt.orden,
        totalTareas: edt._count.proyectoTarea,
        recomendado: esEjecucion && edt._count.proyectoTarea > 0,
      })),
    }
  })

  return NextResponse.json({ data: result })
}
