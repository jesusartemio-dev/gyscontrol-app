import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { REPORTE_AVANCE_INCLUDE } from '@/lib/services/reporteAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({ where: { id } })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (reporte.estado !== 'borrador' && reporte.estado !== 'rechazado')
      return NextResponse.json(
        { error: `No se puede enviar un reporte en estado "${reporte.estado}"` },
        { status: 409 },
      )

    const updated = await prisma.reporteSemanalAvance.update({
      where: { id },
      data: { estado: 'enviado', enviadoAt: new Date() },
      include: REPORTE_AVANCE_INCLUDE,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[POST /api/proyectos/reportes-semanales/[id]/enviar]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
