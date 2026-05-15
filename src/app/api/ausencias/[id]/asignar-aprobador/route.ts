import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const ADMIN_ROLES = ['admin', 'administracion'] as const

const AsignarAprobadorSchema = z.object({
  aprobadorId: z.string().min(1),
  nivel: z.union([z.literal(1), z.literal(2)]),
})

// PATCH /api/ausencias/:id/asignar-aprobador
// Asigna manualmente un aprobador cuando la resolución automática falló.
// Body: { aprobadorId: string, nivel: 1 | 2 }
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = session.user.role as string
    if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: 'Solo admin/administración puede asignar aprobadores' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const parsed = AsignarAprobadorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { aprobadorId, nivel } = parsed.data

    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        solicitanteId: true,
        aprobador1Id: true,
        aprobador2Id: true,
        requiereAsignacionAprobador: true,
      },
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (solicitud.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `No se puede asignar aprobador en estado '${solicitud.estado}'` },
        { status: 422 },
      )
    }

    // Validate aprobador exists and is not the solicitante
    const aprobador = await prisma.user.findUnique({
      where: { id: aprobadorId },
      select: { id: true, name: true },
    })

    if (!aprobador) {
      return NextResponse.json({ error: 'Usuario aprobador no encontrado' }, { status: 404 })
    }
    if (aprobadorId === solicitud.solicitanteId) {
      return NextResponse.json(
        { error: 'El aprobador no puede ser el mismo que el solicitante' },
        { status: 422 },
      )
    }
    if (nivel === 2 && aprobadorId === solicitud.aprobador1Id) {
      return NextResponse.json(
        { error: 'El aprobador de nivel 2 no puede ser el mismo que el nivel 1' },
        { status: 422 },
      )
    }

    const now = new Date()
    const updateData =
      nivel === 1
        ? { aprobador1Id: aprobadorId, requiereAsignacionAprobador: false, updatedAt: now }
        : { aprobador2Id: aprobadorId, requiereAsignacionAprobador: false, updatedAt: now }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.solicitudAusencia.update({ where: { id }, data: updateData })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'SOLICITUD_AUSENCIA',
          entidadId: id,
          accion: `ausencia.aprobador${nivel}_asignado`,
          usuarioId: session.user.id,
          descripcion: `Aprobador nivel ${nivel} asignado manualmente: ${aprobadorId}`,
          cambios: JSON.stringify({ nivel, aprobadorId }),
        },
      })

      return result
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/ausencias/:id/asignar-aprobador]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
