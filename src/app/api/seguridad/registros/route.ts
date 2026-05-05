import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearRegistroSeguridadSchema, tipoRegistroSeguridadEnum } from '@/lib/validators/registroSeguridad'
import { REGISTRO_INCLUDE } from '@/lib/services/registroSeguridad'
import type { Prisma } from '@prisma/client'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const tipoParam = searchParams.get('tipo')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const ingenieroId = searchParams.get('ingenieroId')
    const registroHorasCampoId = searchParams.get('registroHorasCampoId')
    const proyectoId = searchParams.get('proyectoId')

    const where: Prisma.RegistroSeguridadWhereInput = {}

    if (tipoParam) {
      const parsed = tipoRegistroSeguridadEnum.safeParse(tipoParam)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
      }
      where.tipo = parsed.data
    }

    if (registroHorasCampoId) where.registroHorasCampoId = registroHorasCampoId
    if (ingenieroId) where.ingenieroId = ingenieroId

    if (fechaDesde || fechaHasta || proyectoId) {
      where.jornada = {}
      if (proyectoId) where.jornada.proyectoId = proyectoId
      if (fechaDesde || fechaHasta) {
        where.jornada.fechaTrabajo = {}
        if (fechaDesde) where.jornada.fechaTrabajo.gte = new Date(fechaDesde)
        if (fechaHasta) {
          const hasta = new Date(fechaHasta)
          hasta.setHours(23, 59, 59, 999)
          where.jornada.fechaTrabajo.lte = hasta
        }
      }
    }

    const registros = await prisma.registroSeguridad.findMany({
      where,
      include: REGISTRO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(registros)
  } catch (error) {
    console.error('Error al listar registros de seguridad:', error)
    return NextResponse.json({ error: 'Error al listar registros' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = crearRegistroSeguridadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { registroHorasCampoId, tipo, descripcion, asistentes, observaciones } = parsed.data

    const jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: registroHorasCampoId },
      select: { id: true, estado: true },
    })
    if (!jornada) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 })
    }
    if (!['iniciado', 'pendiente'].includes(jornada.estado)) {
      return NextResponse.json(
        { error: 'No se pueden registrar actividades en jornadas aprobadas o rechazadas' },
        { status: 400 },
      )
    }

    const creado = await prisma.registroSeguridad.create({
      data: {
        registroHorasCampoId,
        ingenieroId: session.user.id,
        tipo,
        descripcion,
        asistentes: tipo === 'charla' ? (asistentes ?? null) : null,
        observaciones: observaciones ?? null,
      },
      include: REGISTRO_INCLUDE,
    })

    return NextResponse.json(creado, { status: 201 })
  } catch (error) {
    console.error('Error al crear registro de seguridad:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}
