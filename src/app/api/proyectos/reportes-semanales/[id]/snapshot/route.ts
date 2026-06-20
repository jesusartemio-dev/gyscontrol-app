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
 * DELETE /api/proyectos/reportes-semanales/[id]/snapshot
 * Elimina el snapshot semanal de avance del proyecto del reporte [id].
 * Las filas hijas (ProyectoAvanceSnapshotTarea) se borran por CASCADE.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para borrar snapshot' }, { status: 403 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({
      where: { id },
      select: { proyectoId: true, semanaIso: true },
    })
    if (!reporte) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })

    try {
      await prisma.proyectoAvanceSnapshot.delete({
        where: { proyectoId_semanaIso: { proyectoId: reporte.proyectoId, semanaIso: reporte.semanaIso } },
      })
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2025')
        return NextResponse.json({ error: 'No existe snapshot para esta semana' }, { status: 404 })
      throw e
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/proyectos/reportes-semanales/[id]/snapshot]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PUT /api/proyectos/reportes-semanales/[id]/snapshot
 * Corrige manualmente el progresoGeneral del snapshot existente (backfill manual).
 * No toca las filas hijas; solo ajusta el número global de la curva S.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para editar snapshot' }, { status: 403 })

    const body = await req.json()
    const { progresoGeneral } = body
    if (typeof progresoGeneral !== 'number' || progresoGeneral < 0 || progresoGeneral > 100)
      return NextResponse.json({ error: 'progresoGeneral debe ser un número entre 0 y 100' }, { status: 400 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({
      where: { id },
      select: { proyectoId: true, semanaIso: true },
    })
    if (!reporte) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })

    let snapshot
    try {
      snapshot = await prisma.proyectoAvanceSnapshot.update({
        where: { proyectoId_semanaIso: { proyectoId: reporte.proyectoId, semanaIso: reporte.semanaIso } },
        data: { progresoGeneral },
        select: { progresoGeneral: true },
      })
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2025')
        return NextResponse.json({ error: 'No existe snapshot para esta semana; tómalo primero' }, { status: 404 })
      throw e
    }

    return NextResponse.json({ ok: true, progresoGeneral: snapshot.progresoGeneral })
  } catch (e) {
    console.error('[PUT /api/proyectos/reportes-semanales/[id]/snapshot]', e)
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
