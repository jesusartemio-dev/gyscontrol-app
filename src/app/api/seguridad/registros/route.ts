import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearRegistroSeguridadSchema, tipoRegistroSeguridadEnum } from '@/lib/validators/registroSeguridad'
import { REGISTRO_INCLUDE } from '@/lib/services/registroSeguridad'
import type { Prisma } from '@prisma/client'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad']
const ROLES_BYPASS = ['admin', 'gerente', 'gestor']

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
    const evidenciaId = searchParams.get('evidenciaId')
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

    if (evidenciaId) where.evidenciaSeguridadId = evidenciaId
    if (ingenieroId) where.ingenieroId = ingenieroId

    const evidenciaFilter: Prisma.EvidenciaSeguridadWhereInput = {}
    if (registroHorasCampoId) evidenciaFilter.registroHorasCampoId = registroHorasCampoId
    if (fechaDesde || fechaHasta || proyectoId) {
      const jornadaFilter: Prisma.RegistroHorasCampoWhereInput = {}
      if (proyectoId) jornadaFilter.proyectoId = proyectoId
      if (fechaDesde || fechaHasta) {
        jornadaFilter.fechaTrabajo = {}
        if (fechaDesde) jornadaFilter.fechaTrabajo.gte = new Date(fechaDesde)
        if (fechaHasta) {
          const hasta = new Date(fechaHasta)
          hasta.setHours(23, 59, 59, 999)
          jornadaFilter.fechaTrabajo.lte = hasta
        }
      }
      evidenciaFilter.jornada = jornadaFilter
    }
    if (Object.keys(evidenciaFilter).length > 0) {
      where.evidencia = evidenciaFilter
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

    const { evidenciaSeguridadId, tipo, descripcion, asistentes, observaciones } = parsed.data

    const evidencia = await prisma.evidenciaSeguridad.findUnique({
      where: { id: evidenciaSeguridadId },
      select: {
        id: true,
        estado: true,
        jornada: { select: { id: true, estado: true } },
      },
    })
    if (!evidencia) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 })
    }

    const isBypass = ROLES_BYPASS.includes(session.user.role)
    if (!isBypass) {
      if (evidencia.estado !== 'abierta') {
        return NextResponse.json(
          { error: 'La evidencia está cerrada' },
          { status: 400 },
        )
      }
      if (!['iniciado', 'pendiente'].includes(evidencia.jornada.estado)) {
        return NextResponse.json(
          { error: 'No se pueden registrar actividades en jornadas aprobadas o rechazadas' },
          { status: 400 },
        )
      }
    }

    const creado = await prisma.registroSeguridad.create({
      data: {
        evidenciaSeguridadId,
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
