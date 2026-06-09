import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { REPORTE_AVANCE_INCLUDE } from '@/lib/services/reporteAvance'

const ROLES_REVISION = ['admin', 'gerente', 'gestor']

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_REVISION.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos para aprobar' }, { status: 403 })

    const reporte = await prisma.reporteSemanalAvance.findUnique({ where: { id } })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (reporte.estado !== 'enviado')
      return NextResponse.json(
        { error: 'Solo se pueden aprobar reportes en estado "enviado"' },
        { status: 409 },
      )

    const updated = await prisma.reporteSemanalAvance.update({
      where: { id },
      data: {
        estado: 'aprobado',
        aprobadorId: session.user.id,
        aprobadoAt: new Date(),
        rechazadoAt: null,
        notasRevision: null,
      },
      include: REPORTE_AVANCE_INCLUDE,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[POST /api/proyectos/reportes-semanales/[id]/aprobar]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
