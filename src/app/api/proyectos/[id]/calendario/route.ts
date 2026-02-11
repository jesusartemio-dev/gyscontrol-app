import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET: obtener calendario asignado al proyecto
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params

    // Buscar configuración de calendario para este proyecto
    const config = await prisma.configuracionCalendario.findFirst({
      where: { entidadTipo: 'proyecto', entidadId: proyectoId },
      include: { calendarioLaboral: true },
    })

    // Listar todos los calendarios activos para el selector
    const calendarios = await prisma.calendarioLaboral.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        horasPorDia: true,
        diasLaborables: true,
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({
      calendarioAsignado: config ? {
        id: config.calendarioLaboral.id,
        nombre: config.calendarioLaboral.nombre,
        horasPorDia: config.calendarioLaboral.horasPorDia,
      } : null,
      calendarios,
    })
  } catch (error) {
    logger.error('[ERROR proyecto/calendario GET]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error del servidor' },
      { status: 500 }
    )
  }
}

// PUT: asignar o cambiar calendario del proyecto
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params
    const { calendarioId } = await request.json()

    if (!calendarioId) {
      // Desasignar: eliminar la configuración si existe
      await prisma.configuracionCalendario.deleteMany({
        where: { entidadTipo: 'proyecto', entidadId: proyectoId },
      })
      return NextResponse.json({ success: true, calendarioAsignado: null })
    }

    // Verificar que el calendario existe
    const calendario = await prisma.calendarioLaboral.findUnique({
      where: { id: calendarioId },
    })
    if (!calendario) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 })
    }

    // Upsert: crear o actualizar la asignación
    const config = await prisma.configuracionCalendario.upsert({
      where: {
        entidadTipo_entidadId: {
          entidadTipo: 'proyecto',
          entidadId: proyectoId,
        },
      },
      update: {
        calendarioLaboralId: calendarioId,
      },
      create: {
        id: crypto.randomUUID(),
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        calendarioLaboralId: calendarioId,
      },
      include: { calendarioLaboral: true },
    })

    return NextResponse.json({
      success: true,
      calendarioAsignado: {
        id: config.calendarioLaboral.id,
        nombre: config.calendarioLaboral.nombre,
        horasPorDia: config.calendarioLaboral.horasPorDia,
      },
    })
  } catch (error) {
    logger.error('[ERROR proyecto/calendario PUT]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error del servidor' },
      { status: 500 }
    )
  }
}
