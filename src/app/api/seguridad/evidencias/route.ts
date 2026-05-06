import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearEvidenciaSeguridadSchema, estadoEvidenciaSeguridadEnum } from '@/lib/validators/evidenciaSeguridad'
import { obtenerOCrearEvidencia } from '@/lib/services/evidenciaSeguridad'
import type { Prisma } from '@prisma/client'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId') ?? undefined
    const estadoParam = searchParams.get('estado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const creadoPorId = searchParams.get('creadoPorId') ?? undefined

    const where: Prisma.EvidenciaSeguridadWhereInput = {}

    if (estadoParam) {
      const parsed = estadoEvidenciaSeguridadEnum.safeParse(estadoParam)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
      }
      where.estado = parsed.data
    }

    if (creadoPorId) where.creadoPorId = creadoPorId

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
      where.jornada = jornadaFilter
    }

    const evidencias = await prisma.evidenciaSeguridad.findMany({
      where,
      include: {
        jornada: {
          select: {
            id: true,
            fechaTrabajo: true,
            estado: true,
            ubicacion: true,
            proyecto: { select: { id: true, codigo: true, nombre: true } },
            supervisor: { select: { id: true, name: true } },
          },
        },
        creadoPor: { select: { id: true, name: true } },
        registros: {
          select: {
            id: true,
            tipo: true,
            _count: { select: { fotos: true } },
          },
        },
      },
      orderBy: { jornada: { fechaTrabajo: 'desc' } },
    })

    // Resumen liviano para la lista
    const resumen = evidencias.map((ev) => {
      const tipoCount: Record<string, number> = {}
      let fotosCount = 0
      for (const r of ev.registros) {
        tipoCount[r.tipo] = (tipoCount[r.tipo] ?? 0) + 1
        fotosCount += r._count.fotos
      }
      return {
        id: ev.id,
        estado: ev.estado,
        observaciones: ev.observaciones,
        fechaCierre: ev.fechaCierre,
        createdAt: ev.createdAt,
        updatedAt: ev.updatedAt,
        jornada: ev.jornada,
        creadoPor: ev.creadoPor,
        registrosCount: ev.registros.length,
        fotosCount,
        tipoCount,
      }
    })

    return NextResponse.json(resumen)
  } catch (error) {
    console.error('Error al listar evidencias:', error)
    return NextResponse.json({ error: 'Error al listar evidencias' }, { status: 500 })
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
    const parsed = crearEvidenciaSeguridadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const yaExistia = await prisma.evidenciaSeguridad.findUnique({
      where: { registroHorasCampoId: parsed.data.registroHorasCampoId },
      select: { id: true },
    })

    try {
      const evidencia = await obtenerOCrearEvidencia(
        parsed.data.registroHorasCampoId,
        session.user.id,
        parsed.data.observaciones,
      )
      return NextResponse.json(evidencia, { status: yaExistia ? 200 : 201 })
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al abrir evidencia'
      return NextResponse.json({ error: mensaje }, { status: 400 })
    }
  } catch (error) {
    console.error('Error al crear evidencia de seguridad:', error)
    return NextResponse.json({ error: 'Error al crear evidencia' }, { status: 500 })
  }
}
