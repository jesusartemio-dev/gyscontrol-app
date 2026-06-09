import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { actualizarReporteAvanceSchema } from '@/lib/validators/reporteAvance'
import { REPORTE_AVANCE_INCLUDE } from '@/lib/services/reporteAvance'
import { ROLES_PERMITIDOS, ROLES_BYPASS } from '@/lib/auth/rolesEvidenciaProyecto'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({
      where: { id },
      include: REPORTE_AVANCE_INCLUDE,
    })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json(reporte)
  } catch (e) {
    console.error('[GET /api/proyectos/reportes-semanales/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({ where: { id } })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const isBypass = (ROLES_BYPASS as readonly string[]).includes(session.user.role)
    const isEditable = reporte.estado === 'borrador' || reporte.estado === 'rechazado'
    if (!isEditable && !isBypass)
      return NextResponse.json(
        { error: `No se puede editar un reporte en estado "${reporte.estado}"` },
        { status: 409 },
      )

    const body = await req.json()
    const parsed = actualizarReporteAvanceSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })

    const d = parsed.data
    // Los campos Json se persisten tal cual; null → Prisma.DbNull (SQL NULL).
    const data: Prisma.ReporteSemanalAvanceUpdateInput = {
      ...(d.numero !== undefined ? { numero: d.numero } : {}),
      ...(d.alcanceTexto !== undefined ? { alcanceTexto: d.alcanceTexto } : {}),
      ...(d.resumenEjecutivo !== undefined ? { resumenEjecutivo: d.resumenEjecutivo } : {}),
      ...(d.comentariosHitos !== undefined
        ? { comentariosHitos: d.comentariosHitos === null ? Prisma.DbNull : (d.comentariosHitos as Prisma.InputJsonValue) }
        : {}),
      ...(d.variaciones !== undefined
        ? { variaciones: d.variaciones === null ? Prisma.DbNull : (d.variaciones as Prisma.InputJsonValue) }
        : {}),
      ...(d.impedimentos !== undefined
        ? { impedimentos: d.impedimentos === null ? Prisma.DbNull : (d.impedimentos as Prisma.InputJsonValue) }
        : {}),
    }

    const updated = await prisma.reporteSemanalAvance.update({
      where: { id },
      data,
      include: REPORTE_AVANCE_INCLUDE,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[PATCH /api/proyectos/reportes-semanales/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_BYPASS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Solo admin, gerente o gestor pueden eliminar reportes' }, { status: 403 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({ where: { id }, select: { id: true } })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.reporteSemanalAvance.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/proyectos/reportes-semanales/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
