import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'
import { tomarSnapshot } from '@/lib/services/avanceSnapshot'
import { parsearSemanaIso, rangoSemanaIso } from '@/lib/utils/isoWeek'

const ROLES = ROLES_PERMITIDOS as readonly string[]

type RouteContext = { params: Promise<{ id: string }> }

function validarSemanaIso(semanaIso: unknown): semanaIso is string {
  if (typeof semanaIso !== 'string') return false
  try {
    parsearSemanaIso(semanaIso)
    return true
  } catch {
    return false
  }
}

/**
 * POST /api/proyectos/[id]/snapshot
 * Toma (o re-toma) el snapshot semanal de avance. body: { semanaIso }
 * Usa fechaFin de la semana como fechaCorte.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para tomar snapshot' }, { status: 403 })

    const body = await req.json()
    const { semanaIso } = body
    if (!validarSemanaIso(semanaIso))
      return NextResponse.json({ error: 'semanaIso inválido (formato: YYYY-Www)' }, { status: 400 })

    const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const { fechaFin } = rangoSemanaIso(semanaIso)
    const res = await tomarSnapshot(proyectoId, semanaIso, fechaFin, session.user.id)

    return NextResponse.json({
      ok: true,
      progresoGeneral: res.progresoGeneral,
      tareasCapturadas: res.tareasCapturadas,
    })
  } catch (e) {
    console.error('[POST /api/proyectos/[id]/snapshot]', e)
    const msg = e instanceof Error ? e.message : 'Error interno'
    if (msg.includes('cronograma de ejecución'))
      return NextResponse.json({ error: msg }, { status: 409 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PUT /api/proyectos/[id]/snapshot
 * Edita manualmente el progresoGeneral de un snapshot existente.
 * body: { semanaIso, progresoGeneral }
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para editar snapshot' }, { status: 403 })

    const body = await req.json()
    const { semanaIso, progresoGeneral } = body
    if (!validarSemanaIso(semanaIso))
      return NextResponse.json({ error: 'semanaIso inválido (formato: YYYY-Www)' }, { status: 400 })
    if (typeof progresoGeneral !== 'number' || progresoGeneral < 0 || progresoGeneral > 100)
      return NextResponse.json({ error: 'progresoGeneral debe ser un número entre 0 y 100' }, { status: 400 })

    const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    let snapshot
    try {
      snapshot = await prisma.proyectoAvanceSnapshot.update({
        where: { proyectoId_semanaIso: { proyectoId, semanaIso } },
        data: { progresoGeneral },
        select: { progresoGeneral: true },
      })
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2025')
        return NextResponse.json(
          { error: 'No existe snapshot para esa semana; tómalo primero' },
          { status: 404 },
        )
      throw e
    }

    return NextResponse.json({ ok: true, progresoGeneral: snapshot.progresoGeneral })
  } catch (e) {
    console.error('[PUT /api/proyectos/[id]/snapshot]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/proyectos/[id]/snapshot?semanaIso=YYYY-Www
 * Borra el snapshot de la semana indicada (CASCADE borra las filas hijas).
 * semanaIso se pasa como query param para evitar body en DELETE.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para borrar snapshot' }, { status: 403 })

    const semanaIso = req.nextUrl.searchParams.get('semanaIso')
    if (!validarSemanaIso(semanaIso))
      return NextResponse.json({ error: 'semanaIso inválido (formato: YYYY-Www)' }, { status: 400 })

    const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true } })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    try {
      await prisma.proyectoAvanceSnapshot.delete({
        where: { proyectoId_semanaIso: { proyectoId, semanaIso } },
      })
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2025')
        return NextResponse.json({ error: 'No existe snapshot para esa semana' }, { status: 404 })
      throw e
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/proyectos/[id]/snapshot]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
