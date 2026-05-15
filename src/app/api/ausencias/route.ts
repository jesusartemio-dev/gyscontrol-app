import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { SolicitudAusenciaCreateSchema } from '@/lib/validators/ausencias'

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

// GET /api/ausencias
// ?vista=propia        → solo las del solicitante logueado (default para no-admin)
// ?vista=aprobador     → solo donde el user es aprobador1 o aprobador2
// ?estado=...&tipoAusenciaId=...  → filtros adicionales
// Admin/administracion sin vista especificada → todas.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const role = (session.user as any).role as string
    const esAdmin = ['admin', 'administracion'].includes(role)
    const userId = session.user.id

    const vista = searchParams.get('vista') // 'propia' | 'aprobador'
    const solicitanteIdParam = searchParams.get('solicitanteId')
    const estadoParam = searchParams.get('estado')
    const tipoParam = searchParams.get('tipoAusenciaId')

    const where: Record<string, unknown> = {}

    if (vista === 'aprobador') {
      // Solicitudes donde el usuario es aprobador asignado (cualquier rol)
      where.OR = [
        { aprobador1Id: userId },
        { aprobador2Id: userId },
      ]
    } else if (esAdmin && !vista) {
      // Admin sin filtro de vista: ve todas; permite filtrar por solicitante
      if (solicitanteIdParam) where.solicitanteId = solicitanteIdParam
    } else {
      // Default: solo las propias del solicitante
      where.solicitanteId = userId
    }

    if (estadoParam) where.estado = estadoParam
    if (tipoParam) where.tipoAusenciaId = tipoParam

    const solicitudes = await prisma.solicitudAusencia.findMany({
      where,
      include: SOLICITUD_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(solicitudes)
  } catch (error) {
    console.error('[GET /api/ausencias]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/ausencias — crea solicitud en estado borrador
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = SolicitudAusenciaCreateSchema.parse(body)

    // El solicitante debe tener un Empleado activo
    const empleado = await prisma.empleado.findUnique({
      where: { userId: session.user.id },
    })
    if (!empleado || !empleado.activo) {
      return NextResponse.json(
        { error: 'Solo los empleados activos pueden solicitar ausencias' },
        { status: 422 },
      )
    }

    // El tipo de ausencia debe estar activo
    const tipoAusencia = await prisma.tipoAusencia.findUnique({
      where: { id: data.tipoAusenciaId },
    })
    if (!tipoAusencia) {
      return NextResponse.json({ error: 'Tipo de ausencia no encontrado' }, { status: 404 })
    }
    if (!tipoAusencia.activo) {
      return NextResponse.json(
        { error: 'El tipo de ausencia está inactivo y no se puede usar' },
        { status: 422 },
      )
    }

    const solicitud = await prisma.solicitudAusencia.create({
      data: {
        tipoAusenciaId: data.tipoAusenciaId,
        solicitanteId: session.user.id,
        empleadoId: empleado.id,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
        turnoInicio: data.turnoInicio,
        turnoFin: data.turnoFin,
        motivo: data.motivo ?? null,
        estado: 'borrador',
        updatedAt: new Date(),
      },
      include: SOLICITUD_INCLUDE,
    })

    return NextResponse.json(solicitud, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/ausencias]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
