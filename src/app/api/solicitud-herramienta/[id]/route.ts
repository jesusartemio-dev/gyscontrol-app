import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_LOGISTICA = ['admin', 'gerente', 'coordinador_logistico', 'logistico']

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const solicitud = await prisma.solicitudHerramienta.findUnique({
    where: { id },
    include: {
      solicitante: { select: { id: true, name: true, email: true } },
      proyecto: { select: { id: true, codigo: true, nombre: true } },
      atendidaPor: { select: { id: true, name: true, email: true } },
      prestamo: { select: { id: true, fechaPrestamo: true, estado: true } },
      items: {
        include: {
          catalogoHerramienta: {
            select: {
              id: true, codigo: true, nombre: true, unidadMedida: true,
              stock: { select: { cantidadDisponible: true } },
            },
          },
        },
      },
    },
  })
  if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

  // Solo el solicitante o roles de logística pueden ver el detalle
  const esLogistica = ROLES_LOGISTICA.includes(session.user.role)
  if (!esLogistica && solicitud.solicitanteId !== session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  return NextResponse.json(solicitud)
}

/**
 * DELETE /api/solicitud-herramienta/[id]
 * Elimina físicamente una solicitud. Solo el solicitante y solo si está en `borrador`.
 * Para solicitudes ya enviadas, usa POST /[id]/cancelar (soft delete).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const solicitud = await prisma.solicitudHerramienta.findUnique({
    where: { id },
    select: { id: true, estado: true, solicitanteId: true },
  })
  if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (solicitud.solicitanteId !== session.user.id) {
    return NextResponse.json({ error: 'Solo el solicitante puede eliminar' }, { status: 403 })
  }
  if (solicitud.estado !== 'borrador') {
    return NextResponse.json(
      { error: 'Solo se pueden eliminar solicitudes en estado borrador. Cancélala desde el detalle.' },
      { status: 400 }
    )
  }

  // Cascade en items está definido en el schema; borra la solicitud y sus items.
  await prisma.solicitudHerramienta.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
