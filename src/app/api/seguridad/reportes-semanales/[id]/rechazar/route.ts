import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rechazarReporteSeguridadSchema } from '@/lib/validators/reporteSeguridad'
import { REPORTE_INCLUDE } from '@/lib/services/reporteSeguridad'

const ROLES_REVISION = ['admin', 'gerente', 'gestor']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_REVISION.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para rechazar' }, { status: 403 })

    const reporte = await prisma.reporteSemanalSeguridad.findUnique({ where: { id } })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (reporte.estado !== 'enviado')
      return NextResponse.json({ error: 'Solo se pueden rechazar reportes en estado "enviado"' }, { status: 400 })

    const body = await req.json()
    const parsed = rechazarReporteSeguridadSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })

    const updated = await prisma.reporteSemanalSeguridad.update({
      where: { id },
      data: {
        estado: 'rechazado',
        aprobadorId: session.user.id,
        notasRevision: parsed.data.notasRevision,
        rechazadoAt: new Date(),
        aprobadoAt: null,
        updatedAt: new Date(),
      },
      include: REPORTE_INCLUDE,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[POST /api/seguridad/reportes-semanales/[id]/rechazar]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
