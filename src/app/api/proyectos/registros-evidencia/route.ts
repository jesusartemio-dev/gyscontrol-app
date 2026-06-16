import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearRegistroAvanceSchema, tipoRegistroAvanceEnum } from '@/lib/validators/registroAvance'
import { REGISTRO_AVANCE_INCLUDE } from '@/lib/services/registroAvance'
import { ROLES_PERMITIDOS, ROLES_BYPASS } from '@/lib/auth/rolesEvidenciaProyecto'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const tipoParam = searchParams.get('tipo')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const autorId = searchParams.get('autorId')
    const evidenciaId = searchParams.get('evidenciaId')
    const registroHorasCampoId = searchParams.get('registroHorasCampoId')
    const proyectoId = searchParams.get('proyectoId')

    const where: Prisma.RegistroAvanceWhereInput = {}

    if (tipoParam) {
      const parsed = tipoRegistroAvanceEnum.safeParse(tipoParam)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
      }
      where.tipo = parsed.data
    }

    if (evidenciaId) where.evidenciaAvanceId = evidenciaId
    if (autorId) where.autorId = autorId

    const evidenciaFilter: Prisma.EvidenciaAvanceWhereInput = {}
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

    const registros = await prisma.registroAvance.findMany({
      where,
      include: REGISTRO_AVANCE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(registros)
  } catch (error) {
    console.error('Error al listar registros de avance:', error)
    return NextResponse.json({ error: 'Error al listar registros' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = crearRegistroAvanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const {
      evidenciaAvanceId,
      tipo,
      descripcion,
      disciplina,
      proyectoTareaId,
      registroHorasCampoTareaId,
      porcentajeAvance,
      observaciones,
    } = parsed.data

    const evidencia = await prisma.evidenciaAvance.findUnique({
      where: { id: evidenciaAvanceId },
      select: {
        id: true,
        estado: true,
        jornada: { select: { id: true, estado: true } },
      },
    })
    if (!evidencia) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 })
    }

    const isBypass = (ROLES_BYPASS as readonly string[]).includes(session.user.role)
    if (!isBypass) {
      if (evidencia.estado !== 'abierta') {
        return NextResponse.json({ error: 'La evidencia está cerrada' }, { status: 400 })
      }
      if (!['iniciado', 'pendiente'].includes(evidencia.jornada.estado)) {
        return NextResponse.json(
          { error: 'No se pueden registrar actividades en jornadas no activas' },
          { status: 400 },
        )
      }
    }

    // Si se provee registroHorasCampoTareaId pero no proyectoTareaId, derivar del servidor
    let resolvedProyectoTareaId = proyectoTareaId ?? null
    if (registroHorasCampoTareaId && !proyectoTareaId) {
      const jornadaTarea = await prisma.registroHorasCampoTarea.findUnique({
        where: { id: registroHorasCampoTareaId },
        select: { proyectoTareaId: true },
      })
      resolvedProyectoTareaId = jornadaTarea?.proyectoTareaId ?? null
    }

    const creado = await prisma.registroAvance.create({
      data: {
        evidenciaAvanceId,
        autorId: session.user.id,
        tipo,
        descripcion,
        disciplina: disciplina ?? null,
        proyectoTareaId: resolvedProyectoTareaId,
        registroHorasCampoTareaId: registroHorasCampoTareaId ?? null,
        porcentajeAvance: porcentajeAvance ?? null,
        observaciones: observaciones ?? null,
      },
      include: REGISTRO_AVANCE_INCLUDE,
    })

    return NextResponse.json(creado, { status: 201 })
  } catch (error) {
    console.error('Error al crear registro de avance:', error)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}
