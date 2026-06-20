import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirCurvaAvance } from '@/lib/utils/curvaAvance'
import { calcularPesosFase } from '@/lib/services/pesoFase'

const ROLES = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

/**
 * GET /api/proyectos/[id]/curva-avance
 * Curva S de avance físico (% 0-100): planeado del baseline (planificacion) vs real de los
 * snapshots semanales. Read-only, sin params extra. No toca la curva de costos.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, codigo: true, nombre: true },
    })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    // Cronograma planificacion (esBaseline) para el plan; ejecucion solo como metadato.
    const cronoPlan = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id, tipo: 'planificacion', esBaseline: true },
      select: { id: true },
    })
    const cronoEjec = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id, tipo: 'ejecucion' },
      select: { id: true },
    })

    const tareasPlan = cronoPlan
      ? await prisma.proyectoTarea.findMany({
          where: { proyectoCronogramaId: cronoPlan.id },
          select: {
            fechaInicio: true,
            fechaFin: true,
            horasEstimadas: true,
            proyectoEdt: { select: { proyectoFase: { select: { nombre: true } } } },
          },
        })
      : []

    const [snapshots, pesos] = await Promise.all([
      prisma.proyectoAvanceSnapshot.findMany({
        where: { proyectoId: id },
        orderBy: { semanaIso: 'asc' },
        select: { semanaIso: true, fechaCorte: true, progresoGeneral: true },
      }),
      calcularPesosFase(id),
    ])

    const baselineTareas = tareasPlan.map((t) => ({
      faseNombre: t.proyectoEdt?.proyectoFase?.nombre ?? null,
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      horasEstimadas: Number(t.horasEstimadas ?? 0),
    }))
    const pesosFase = pesos.fases.map((f) => ({ faseNombre: f.nombre, pesoEfectivo: f.pesoEfectivo }))

    const curva = construirCurvaAvance(baselineTareas, snapshots, pesosFase)

    return NextResponse.json({
      weeks: curva.weeks,
      hasBaseline: curva.hasBaseline,
      tieneSnapshots: curva.tieneSnapshots,
      cronogramaPlanId: cronoPlan?.id ?? null,
      cronogramaEjecId: cronoEjec?.id ?? null,
      proyecto,
      snapshots: snapshots.map((s) => ({ semanaIso: s.semanaIso, progresoGeneral: s.progresoGeneral })),
    })
  } catch (e) {
    console.error('[GET /api/proyectos/[id]/curva-avance]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
