import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { REPORTE_INCLUDE } from '@/lib/services/reporteSeguridad'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const reporte = await prisma.reporteSemanalSeguridad.findUnique({ where: { id } })
    if (!reporte) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (session.user.role === 'seguridad' && reporte.ingenieroId !== session.user.id)
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    if (reporte.estado !== 'borrador' && reporte.estado !== 'rechazado')
      return NextResponse.json({ error: `No se puede enviar un reporte en estado "${reporte.estado}"` }, { status: 400 })

    const updated = await prisma.reporteSemanalSeguridad.update({
      where: { id },
      data: { estado: 'enviado', enviadoAt: new Date(), updatedAt: new Date() },
      include: REPORTE_INCLUDE,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[POST /api/seguridad/reportes-semanales/[id]/enviar]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
