import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_LOGISTICA = ['admin', 'gerente', 'coordinador_logistico', 'logistico']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const nota: string | undefined = body?.nota

  const solicitud = await prisma.solicitudHerramienta.findUnique({
    where: { id },
    select: { id: true, estado: true, solicitanteId: true, numero: true },
  })
  if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

  // Solicitante o logística pueden cancelar; solicitante solo si aún está pendiente.
  const esLogistica = ROLES_LOGISTICA.includes(session.user.role)
  const esSolicitante = solicitud.solicitanteId === session.user.id
  if (!esLogistica && !esSolicitante) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (solicitud.estado !== 'borrador' && solicitud.estado !== 'enviado') {
    return NextResponse.json(
      { error: `No se puede cancelar una solicitud en estado "${solicitud.estado}"` },
      { status: 400 }
    )
  }

  const actualizada = await prisma.solicitudHerramienta.update({
    where: { id },
    data: {
      estado: 'cancelada',
      atendidaPorId: esLogistica ? session.user.id : null,
      fechaAtencion: esLogistica ? new Date() : null,
      notaAtencion: nota?.trim() || null,
    },
  })

  return NextResponse.json(actualizada)
}
