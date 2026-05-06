import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  crearReporteSeguridadSchema,
  rangoSemanaIso,
  estadoReporteSeguridadEnum,
} from '@/lib/validators/reporteSeguridad'
import { REPORTE_INCLUDE } from '@/lib/services/reporteSeguridad'
import type { Prisma } from '@prisma/client'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const semanaIso = searchParams.get('semanaIso')
    const estadoParam = searchParams.get('estado')
    const ingenieroId = searchParams.get('ingenieroId')

    const where: Prisma.ReporteSemanalSeguridadWhereInput = {}

    if (proyectoId) where.proyectoId = proyectoId
    if (semanaIso) where.semanaIso = semanaIso
    if (estadoParam) {
      const parsed = estadoReporteSeguridadEnum.safeParse(estadoParam)
      if (parsed.success) where.estado = parsed.data
    }
    if (ingenieroId) {
      where.ingenieroId = ingenieroId
    } else if (session.user.role === 'seguridad') {
      where.ingenieroId = session.user.id
    }

    // Paginación
    const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSizeRaw = parseInt(searchParams.get('pageSize') ?? '20', 10)
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 && pageSizeRaw <= 100 ? pageSizeRaw : 20

    const [total, reportes] = await Promise.all([
      prisma.reporteSemanalSeguridad.count({ where }),
      prisma.reporteSemanalSeguridad.findMany({
        where,
        include: REPORTE_INCLUDE,
        orderBy: [{ semanaIso: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      data: reportes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    })
  } catch (e) {
    console.error('[GET /api/seguridad/reportes-semanales]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await req.json()
    const parsed = crearReporteSeguridadSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })

    const { proyectoId, semanaIso } = parsed.data

    const existing = await prisma.reporteSemanalSeguridad.findUnique({
      where: { proyectoId_semanaIso: { proyectoId, semanaIso } },
      include: REPORTE_INCLUDE,
    })
    if (existing) return NextResponse.json(existing, { status: 200 })

    const { fechaInicio, fechaFin } = rangoSemanaIso(semanaIso)

    const reporte = await prisma.reporteSemanalSeguridad.create({
      data: {
        proyectoId,
        ingenieroId: session.user.id,
        semanaIso,
        fechaInicio,
        fechaFin,
        updatedAt: new Date(),
      },
      include: REPORTE_INCLUDE,
    })

    return NextResponse.json(reporte, { status: 201 })
  } catch (e) {
    console.error('[POST /api/seguridad/reportes-semanales]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
