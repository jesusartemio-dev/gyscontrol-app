import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { actualizarReporteSeguridadSchema } from '@/lib/validators/reporteSeguridad'
import { REPORTE_INCLUDE } from '@/lib/services/reporteSeguridad'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']
const ROLES_REVISION = ['admin', 'gerente']

function puedeEditar(role: string, ingenieroId: string, userId: string) {
  if (ROLES_REVISION.includes(role)) return true
  return ingenieroId === userId
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const reporte = await prisma.reporteSemanalSeguridad.findUnique({
      where: { id },
      include: REPORTE_INCLUDE,
    })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (
      session.user.role === 'seguridad' &&
      reporte.ingenieroId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json(reporte)
  } catch (e) {
    console.error('[GET /api/seguridad/reportes-semanales/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const reporte = await prisma.reporteSemanalSeguridad.findUnique({ where: { id } })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (!puedeEditar(session.user.role, reporte.ingenieroId, session.user.id))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    if (reporte.estado === 'aprobado')
      return NextResponse.json({ error: 'Un reporte aprobado no puede editarse' }, { status: 400 })

    const body = await req.json()
    const parsed = actualizarReporteSeguridadSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })

    const updated = await prisma.reporteSemanalSeguridad.update({
      where: { id },
      data: { ...parsed.data, updatedAt: new Date() },
      include: REPORTE_INCLUDE,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[PATCH /api/seguridad/reportes-semanales/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.user.role !== 'admin')
      return NextResponse.json({ error: 'Solo administradores pueden eliminar reportes' }, { status: 403 })

    const reporte = await prisma.reporteSemanalSeguridad.findUnique({ where: { id } })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.reporteSemanalSeguridad.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/seguridad/reportes-semanales/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
