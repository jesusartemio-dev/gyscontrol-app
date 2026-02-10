import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ESTADOS_ACTIVOS = [
  'inicio',
  'contacto_cliente',
  'validacion_tecnica',
  'validacion_comercial',
  'negociacion',
] as const

const ESTADOS_GANADOS = ['seguimiento_proyecto', 'cerrada_ganada'] as const

interface OportunidadForecast {
  id: string
  nombre: string
  cliente: { nombre: string }
  valorEstimado: number
  probabilidad: number
  estado: string
  fechaCierreEstimada: Date | null
}

interface MesBucket {
  mes: string
  mesLabel: string
  count: number
  valorBruto: number
  valorPonderado: number
  oportunidades: OportunidadForecast[]
}

function formatMesLabel(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())
}

function getMesKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userRole = (session.user as any).role || 'comercial'
    const rolesConAccesoTotal = ['admin', 'gerente', 'coordinador']
    const esComercial = !rolesConAccesoTotal.includes(userRole)

    const { searchParams } = new URL(req.url)
    const comercialId = searchParams.get('comercialId') || undefined
    const meses = parseInt(searchParams.get('meses') || '6', 10)

    // Calculate the date range: from now to N months forward
    const now = new Date()
    const limiteSuper = new Date(now.getFullYear(), now.getMonth() + meses + 1, 0, 23, 59, 59)

    // Build where clause for active opportunities with valorEstimado > 0
    // RBAC: comercial solo ve sus propias oportunidades
    const where: any = {
      estado: { in: ESTADOS_ACTIVOS as any },
      valorEstimado: { not: null, gt: 0 },
    }
    if (esComercial) {
      where.comercialId = session.user.id
    } else if (comercialId) {
      where.comercialId = comercialId
    }

    // Query active opportunities
    const oportunidades = await prisma.crmOportunidad.findMany({
      where,
      include: {
        cliente: {
          select: { nombre: true },
        },
      },
      orderBy: { fechaCierreEstimada: 'asc' },
    })

    // Generate month keys for the range
    const monthKeys = new Set<string>()
    for (let i = 0; i <= meses; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      monthKeys.add(getMesKey(d))
    }

    // Group by month bucket
    const bucketsMap = new Map<string, MesBucket>()
    const sinFechaOps: OportunidadForecast[] = []

    for (const op of oportunidades) {
      const opData: OportunidadForecast = {
        id: op.id,
        nombre: op.nombre,
        cliente: { nombre: op.cliente.nombre },
        valorEstimado: op.valorEstimado!,
        probabilidad: op.probabilidad,
        estado: op.estado,
        fechaCierreEstimada: op.fechaCierreEstimada,
      }

      if (!op.fechaCierreEstimada) {
        sinFechaOps.push(opData)
        continue
      }

      const mesKey = getMesKey(op.fechaCierreEstimada)

      // Only include if within the forward-looking range
      if (!monthKeys.has(mesKey)) {
        continue
      }

      if (!bucketsMap.has(mesKey)) {
        bucketsMap.set(mesKey, {
          mes: mesKey,
          mesLabel: formatMesLabel(op.fechaCierreEstimada),
          count: 0,
          valorBruto: 0,
          valorPonderado: 0,
          oportunidades: [],
        })
      }

      const bucket = bucketsMap.get(mesKey)!
      bucket.count += 1
      bucket.valorBruto += op.valorEstimado!
      bucket.valorPonderado += (op.valorEstimado! * op.probabilidad) / 100
      bucket.oportunidades.push(opData)
    }

    // Sort chronologically
    const forecast: MesBucket[] = Array.from(bucketsMap.values()).sort((a, b) =>
      a.mes.localeCompare(b.mes)
    )

    // Add "Sin Fecha" bucket at the end if there are any
    if (sinFechaOps.length > 0) {
      forecast.push({
        mes: 'Sin Fecha',
        mesLabel: 'Sin Fecha',
        count: sinFechaOps.length,
        valorBruto: sinFechaOps.reduce((sum, op) => sum + op.valorEstimado, 0),
        valorPonderado: sinFechaOps.reduce(
          (sum, op) => sum + (op.valorEstimado * op.probabilidad) / 100,
          0
        ),
        oportunidades: sinFechaOps,
      })
    }

    // Calculate historical precision: won opportunities in the last 3 months
    const tresMesesAtras = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const ganadasWhere: any = {
      estado: { in: ESTADOS_GANADOS as any },
      fechaCierre: {
        gte: tresMesesAtras,
        lte: now,
      },
      valorEstimado: { not: null, gt: 0 },
    }
    if (esComercial) {
      ganadasWhere.comercialId = session.user.id
    }
    const ganadas = await prisma.crmOportunidad.findMany({
      where: ganadasWhere,
      select: { valorEstimado: true },
    })
    const valorRealGanado = ganadas.reduce((sum, op) => sum + (op.valorEstimado || 0), 0)

    // Calculate resumen
    const totalBruto = forecast.reduce((sum, b) => sum + b.valorBruto, 0)
    const totalPonderado = forecast.reduce((sum, b) => sum + b.valorPonderado, 0)
    const oportunidadesActivas = forecast.reduce((sum, b) => sum + b.count, 0)

    const resumen = {
      totalBruto,
      totalPonderado,
      oportunidadesActivas,
      valorRealGanado,
      precisionEstimada: (totalPonderado > 0 && valorRealGanado > 0)
        ? Math.min(100, Math.round((valorRealGanado / totalPonderado) * 100))
        : null,
    }

    // Query comerciales for filter dropdown: users with relevant roles that have active opportunities
    const comerciales = await prisma.user.findMany({
      where: {
        role: { in: ['comercial', 'coordinador', 'gerente', 'admin'] as any },
        crmOportunidadComercial: {
          some: {
            estado: { in: ESTADOS_ACTIVOS as any },
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      forecast,
      resumen,
      comerciales,
    })
  } catch (error) {
    console.error('Error al obtener reporte de forecast:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
