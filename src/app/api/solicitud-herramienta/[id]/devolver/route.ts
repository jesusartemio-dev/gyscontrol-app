import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearNotificacion } from '@/lib/utils/notificaciones'

const ROLES_LOGISTICA = ['admin', 'gerente', 'coordinador_logistico', 'logistico']

/**
 * POST /api/solicitud-herramienta/[id]/devolver
 * Logística devuelve una solicitud enviada al solicitante con una nota para que la edite.
 * La solicitud vuelve a estado 'borrador' y se limpia fechaEnvio.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!ROLES_LOGISTICA.includes(session.user.role)) {
    return NextResponse.json({ error: 'Solo logística puede devolver solicitudes' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const nota: string = (body?.nota || '').trim()

  if (!nota) {
    return NextResponse.json({ error: 'La nota es obligatoria al devolver una solicitud' }, { status: 400 })
  }

  const solicitud = await prisma.solicitudHerramienta.findUnique({
    where: { id },
    select: { id: true, estado: true, solicitanteId: true, numero: true },
  })
  if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (solicitud.estado !== 'enviado') {
    return NextResponse.json(
      { error: `Solo se pueden devolver solicitudes enviadas (estado actual: ${solicitud.estado})` },
      { status: 400 }
    )
  }

  const actualizada = await prisma.solicitudHerramienta.update({
    where: { id },
    data: {
      estado: 'borrador',
      fechaEnvio: null,
      atendidaPorId: session.user.id,
      fechaAtencion: new Date(),
      notaAtencion: nota,
    },
  })

  // Notificar al solicitante
  crearNotificacion(prisma, {
    usuarioId: solicitud.solicitanteId,
    titulo: `Tu solicitud ${solicitud.numero} fue devuelta`,
    mensaje: `Logística te pidió ajustar algo. Revísala y vuelve a enviarla.`,
    tipo: 'warning',
    prioridad: 'media',
    entidadTipo: 'SolicitudHerramienta',
    entidadId: solicitud.id,
    accionUrl: `/mi-trabajo/herramientas/${solicitud.id}`,
    accionTexto: 'Ver y editar',
  })

  return NextResponse.json(actualizada)
}
