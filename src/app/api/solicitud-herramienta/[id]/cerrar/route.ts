import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { crearNotificacion } from '@/lib/utils/notificaciones'

const ROLES_LOGISTICA = ['admin', 'gerente', 'coordinador_logistico', 'logistico']

/**
 * POST /api/solicitud-herramienta/[id]/cerrar
 * Logística cierra una solicitud atendida_parcial como 'atendida' aunque
 * no se haya surtido el 100% (p.ej. ya no habrá más stock, descatalogado).
 * Requiere nota explicando el motivo.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_LOGISTICA.includes(session.user.role)) {
    return NextResponse.json({ error: 'Solo logística puede cerrar solicitudes' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const nota: string = (body?.nota || '').trim()
  if (!nota) {
    return NextResponse.json({ error: 'La nota es obligatoria al cerrar una solicitud incompleta' }, { status: 400 })
  }

  const sol = await prisma.solicitudHerramienta.findUnique({
    where: { id },
    select: { id: true, estado: true, solicitanteId: true, numero: true },
  })
  if (!sol) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (sol.estado !== 'atendida_parcial') {
    return NextResponse.json(
      { error: `Solo se pueden cerrar solicitudes en estado atendida_parcial (actual: ${sol.estado})` },
      { status: 400 }
    )
  }

  const actualizada = await prisma.solicitudHerramienta.update({
    where: { id },
    data: {
      estado: 'atendida',
      atendidaPorId: session.user.id,
      fechaAtencion: new Date(),
      notaAtencion: nota,
    },
  })

  crearNotificacion(prisma, {
    usuarioId: sol.solicitanteId,
    titulo: `Solicitud ${sol.numero} cerrada por logística`,
    mensaje: `Logística marcó tu solicitud como completada aunque no se entregó todo. Motivo: ${nota}`,
    tipo: 'info',
    prioridad: 'media',
    entidadTipo: 'SolicitudHerramienta',
    entidadId: sol.id,
    accionUrl: `/mi-trabajo/herramientas/${sol.id}`,
    accionTexto: 'Ver solicitud',
  })

  return NextResponse.json(actualizada)
}
