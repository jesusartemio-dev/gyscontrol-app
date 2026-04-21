import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearNotificaciones } from '@/lib/utils/notificaciones'

const ROLES_LOGISTICA = ['admin', 'gerente', 'coordinador_logistico', 'logistico']

/**
 * POST /api/solicitud-herramienta/[id]/enviar
 * Pasa la solicitud de 'borrador' → 'enviado' y notifica a logística.
 * Solo el solicitante puede enviar su propia solicitud.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const solicitud = await prisma.solicitudHerramienta.findUnique({
    where: { id },
    include: {
      solicitante: { select: { name: true, email: true } },
      items: { select: { id: true } },
    },
  })
  if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (solicitud.solicitanteId !== session.user.id) {
    return NextResponse.json({ error: 'Solo el solicitante puede enviar' }, { status: 403 })
  }
  if (solicitud.estado !== 'borrador') {
    return NextResponse.json(
      { error: `Solo se puede enviar un borrador (estado actual: ${solicitud.estado})` },
      { status: 400 }
    )
  }
  if (solicitud.items.length === 0) {
    return NextResponse.json(
      { error: 'Agrega al menos una herramienta antes de enviar' },
      { status: 400 }
    )
  }
  if (!solicitud.fechaRequerida) {
    return NextResponse.json(
      { error: 'Indica para cuándo necesitas las herramientas antes de enviar' },
      { status: 400 }
    )
  }

  const actualizada = await prisma.solicitudHerramienta.update({
    where: { id },
    data: { estado: 'enviado', fechaEnvio: new Date() },
  })

  // Notificar a todos los roles de logística (fire-and-forget).
  const logisticos = await prisma.user.findMany({
    where: { role: { in: ROLES_LOGISTICA as any } },
    select: { id: true },
  })
  crearNotificaciones(
    prisma,
    logisticos.map(u => ({
      usuarioId: u.id,
      titulo: `Nueva solicitud de herramientas: ${solicitud.numero}`,
      mensaje: `${solicitud.solicitante.name || solicitud.solicitante.email} envió ${solicitud.items.length} ítem(s)`,
      tipo: 'info' as const,
      prioridad: 'media' as const,
      entidadTipo: 'SolicitudHerramienta',
      entidadId: solicitud.id,
      accionUrl: '/logistica/almacen/prestamos',
      accionTexto: 'Ver solicitudes',
    }))
  )

  return NextResponse.json(actualizada)
}
