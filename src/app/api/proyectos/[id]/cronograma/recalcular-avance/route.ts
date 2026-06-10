import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProgresoService } from '@/lib/services/progresoService'

const ROLES = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

/**
 * POST /api/proyectos/[id]/cronograma/recalcular-avance?cronogramaId=...
 * Recalcula el avance almacenado (actividad/EDT/fase/proyecto) del cronograma indicado a
 * partir del % actual de las tareas. Si no se pasa cronogramaId, usa el de ejecución.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const cronogramaId = req.nextUrl.searchParams.get('cronogramaId')
    const cronograma = cronogramaId
      ? await prisma.proyectoCronograma.findFirst({ where: { id: cronogramaId, proyectoId: id }, select: { id: true } })
      : await prisma.proyectoCronograma.findFirst({ where: { proyectoId: id, tipo: 'ejecucion' }, select: { id: true } })

    if (!cronograma) return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })

    const res = await ProgresoService.recalcularAvanceCronograma(cronograma.id)
    return NextResponse.json({ ok: true, ...res })
  } catch (e) {
    console.error('[POST /api/proyectos/[id]/cronograma/recalcular-avance]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
