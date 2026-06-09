import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'
import { tomarSnapshot } from '@/lib/services/avanceSnapshot'

/**
 * POST /api/proyectos/reportes-semanales/[id]/snapshot
 * Toma (o actualiza) el snapshot semanal de avance del proyecto del reporte [id],
 * usando su (proyectoId, semanaIso, fechaCorte).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para tomar snapshot' }, { status: 403 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({
      where: { id },
      select: { proyectoId: true, semanaIso: true, fechaCorte: true },
    })
    if (!reporte) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })

    const res = await tomarSnapshot(reporte.proyectoId, reporte.semanaIso, reporte.fechaCorte, session.user.id)
    return NextResponse.json({
      ok: true,
      tareasCapturadas: res.tareasCapturadas,
      progresoGeneral: res.progresoGeneral,
    })
  } catch (e) {
    console.error('[POST /api/proyectos/reportes-semanales/[id]/snapshot]', e)
    const msg = e instanceof Error ? e.message : 'Error interno'
    if (msg.includes('cronograma de ejecución')) return NextResponse.json({ error: msg }, { status: 409 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * GET /api/proyectos/reportes-semanales/[id]/snapshot
 * Indica si ya existe un snapshot para la semana del reporte (para el texto del botón).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({
      where: { id },
      select: { proyectoId: true, semanaIso: true },
    })
    if (!reporte) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })

    const snap = await prisma.proyectoAvanceSnapshot.findUnique({
      where: { proyectoId_semanaIso: { proyectoId: reporte.proyectoId, semanaIso: reporte.semanaIso } },
      select: { id: true, progresoGeneral: true, updatedAt: true, _count: { select: { tareas: true } } },
    })

    return NextResponse.json({
      existe: !!snap,
      progresoGeneral: snap?.progresoGeneral ?? null,
      tareasCapturadas: snap?._count.tareas ?? 0,
      actualizadoAt: snap?.updatedAt ?? null,
    })
  } catch (e) {
    console.error('[GET /api/proyectos/reportes-semanales/[id]/snapshot]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
