import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearReporteAvanceSchema, estadoReporteAvanceEnum } from '@/lib/validators/reporteAvance'
import { obtenerOCrearReporte } from '@/lib/services/reporteAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const semanaIso = searchParams.get('semanaIso')
    const estadoParam = searchParams.get('estado')

    const where: Prisma.ReporteSemanalAvanceWhereInput = {}
    if (proyectoId) where.proyectoId = proyectoId
    if (semanaIso) where.semanaIso = semanaIso
    if (estadoParam) {
      const parsed = estadoReporteAvanceEnum.safeParse(estadoParam)
      if (parsed.success) where.estado = parsed.data
    }

    const reportes = await prisma.reporteSemanalAvance.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        autor: { select: { id: true, name: true } },
        aprobador: { select: { id: true, name: true } },
      },
      orderBy: [{ semanaIso: 'desc' }],
    })

    return NextResponse.json(reportes)
  } catch (e) {
    console.error('[GET /api/proyectos/reportes-semanales]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await req.json()
    const parsed = crearReporteAvanceSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })

    const { proyectoId, semanaIso } = parsed.data

    const yaExiste = await prisma.reporteSemanalAvance.findUnique({
      where: { proyectoId_semanaIso: { proyectoId, semanaIso } },
      select: { id: true },
    })

    const reporte = await obtenerOCrearReporte(proyectoId, semanaIso, session.user.id)
    return NextResponse.json(reporte, { status: yaExiste ? 200 : 201 })
  } catch (e) {
    console.error('[POST /api/proyectos/reportes-semanales]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
