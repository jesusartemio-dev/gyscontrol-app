import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { SolicitudAusenciaUpdateSchema } from '@/lib/validators/ausencias'

const SOLICITUD_INCLUDE = {
  tipoAusencia: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      color: true,
      descuentaSaldo: true,
      requiereDocumento: true,
      requiereAprobacion2: true,
      diasUmbralAprobacion2: true,
    },
  },
  solicitante: { select: { id: true, name: true, email: true } },
  aprobador1: { select: { id: true, name: true, email: true } },
  aprobador2: { select: { id: true, name: true, email: true } },
  adjuntos: {
    select: {
      id: true,
      nombreArchivo: true,
      urlArchivo: true,
      driveFileId: true,
      tipoArchivo: true,
      tamano: true,
      createdAt: true,
    },
  },
} as const

type Ctx = { params: Promise<{ id: string }> }

// GET /api/ausencias/:id
export async function GET(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      include: SOLICITUD_INCLUDE,
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const role = (session.user as any).role as string
    const esAdmin = ['admin', 'administracion'].includes(role)
    const esSolicitante = solicitud.solicitanteId === session.user.id
    const esAprobador =
      solicitud.aprobador1Id === session.user.id ||
      solicitud.aprobador2Id === session.user.id

    if (!esAdmin && !esSolicitante && !esAprobador) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json(solicitud)
  } catch (error) {
    console.error('[GET /api/ausencias/:id]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PUT /api/ausencias/:id — solicitante, solo si estado=borrador
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const solicitud = await prisma.solicitudAusencia.findUnique({ where: { id } })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.solicitanteId !== session.user.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    if (solicitud.estado !== 'borrador') {
      return NextResponse.json(
        { error: `Solo se puede editar una solicitud en borrador (estado actual: ${solicitud.estado})` },
        { status: 422 },
      )
    }

    const body = await request.json()
    const data = SolicitudAusenciaUpdateSchema.parse(body)

    // Validate new tipo if changed
    if (data.tipoAusenciaId) {
      const tipo = await prisma.tipoAusencia.findUnique({
        where: { id: data.tipoAusenciaId },
      })
      if (!tipo) {
        return NextResponse.json({ error: 'Tipo de ausencia no encontrado' }, { status: 404 })
      }
      if (!tipo.activo) {
        return NextResponse.json({ error: 'El tipo de ausencia está inactivo' }, { status: 422 })
      }
    }

    const updated = await prisma.solicitudAusencia.update({
      where: { id },
      data: {
        ...(data.tipoAusenciaId && { tipoAusenciaId: data.tipoAusenciaId }),
        ...(data.fechaInicio && { fechaInicio: new Date(data.fechaInicio) }),
        ...(data.fechaFin && { fechaFin: new Date(data.fechaFin) }),
        ...(data.turnoInicio && { turnoInicio: data.turnoInicio }),
        ...(data.turnoFin && { turnoFin: data.turnoFin }),
        ...(data.motivo !== undefined && { motivo: data.motivo ?? null }),
        updatedAt: new Date(),
      },
      include: SOLICITUD_INCLUDE,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[PUT /api/ausencias/:id]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE /api/ausencias/:id — solicitante, solo si estado=borrador
export async function DELETE(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const solicitud = await prisma.solicitudAusencia.findUnique({ where: { id } })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.solicitanteId !== session.user.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    if (solicitud.estado !== 'borrador') {
      return NextResponse.json(
        { error: `Solo se puede eliminar una solicitud en borrador (estado actual: ${solicitud.estado})` },
        { status: 422 },
      )
    }

    // Cascade deletes adjuntos via DB constraint
    await prisma.solicitudAusencia.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/ausencias/:id]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
