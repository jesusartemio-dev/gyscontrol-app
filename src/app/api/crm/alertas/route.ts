// ===================================================
// Archivo: route.ts
// Ubicacion: /api/crm/alertas/
// Descripcion: API para alertas del sistema CRM
// GET: Obtener alertas activas de oportunidades
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Obtener alertas CRM
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let comercialId = searchParams.get('comercialId') || undefined

    // Role-based filtering: comercial users can only see their own alerts
    const userRole = (session.user as any).role
    if (userRole === 'comercial') {
      comercialId = session.user.id
    }

    const now = new Date()
    const sieteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const catorceDiasAtras = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const sieteDiasAdelante = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Active opportunity states
    const estadosActivos = [
      'inicio',
      'contacto_cliente',
      'validacion_tecnica',
      'validacion_comercial',
      'negociacion',
    ]

    // Common select for all queries
    const selectFields = {
      id: true,
      nombre: true,
      estado: true,
      valorEstimado: true,
      prioridad: true,
      fechaUltimoContacto: true,
      fechaCierreEstimada: true,
      updatedAt: true,
      createdAt: true,
      cliente: {
        select: {
          nombre: true,
          codigo: true,
        },
      },
      comercial: {
        select: {
          name: true,
        },
      },
    }

    // Base where clause for all queries
    const baseWhere: any = {
      estado: { in: estadosActivos },
    }

    if (comercialId) {
      baseWhere.comercialId = comercialId
    }

    // Run 4 alert queries in parallel
    const [sinContacto, estancadas, cierreProximo, altaPrioridadInactiva] =
      await Promise.all([
        // 1. Sin contacto: no contact in last 7 days (or never contacted and created > 7 days ago)
        prisma.crmOportunidad.findMany({
          where: {
            ...baseWhere,
            OR: [
              {
                fechaUltimoContacto: {
                  lt: sieteDiasAtras,
                },
              },
              {
                fechaUltimoContacto: null,
                createdAt: {
                  lt: sieteDiasAtras,
                },
              },
            ],
          },
          select: selectFields,
        }),

        // 2. Estancada: no updates in last 14 days
        prisma.crmOportunidad.findMany({
          where: {
            ...baseWhere,
            updatedAt: {
              lt: catorceDiasAtras,
            },
          },
          select: selectFields,
        }),

        // 3. Cierre proximo: estimated close date within next 7 days
        prisma.crmOportunidad.findMany({
          where: {
            ...baseWhere,
            fechaCierreEstimada: {
              not: null,
              gte: now,
              lte: sieteDiasAdelante,
            },
          },
          select: selectFields,
        }),

        // 4. Alta prioridad inactiva: high/critical priority with no recent contact
        prisma.crmOportunidad.findMany({
          where: {
            ...baseWhere,
            prioridad: { in: ['alta', 'critica'] },
            OR: [
              {
                fechaUltimoContacto: {
                  lt: sieteDiasAtras,
                },
              },
              {
                fechaUltimoContacto: null,
              },
            ],
          },
          select: selectFields,
        }),
      ])

    // Combine all alerts with their type, deduplicating by opportunity id
    const seenIds = new Set<string>()
    const alertas: Array<{ tipo: string; oportunidad: any }> = []

    const addAlertas = (tipo: string, oportunidades: any[]) => {
      for (const oportunidad of oportunidades) {
        if (!seenIds.has(oportunidad.id)) {
          seenIds.add(oportunidad.id)
          alertas.push({ tipo, oportunidad })
        }
      }
    }

    addAlertas('sin_contacto', sinContacto)
    addAlertas('estancada', estancadas)
    addAlertas('cierre_proximo', cierreProximo)
    addAlertas('alta_prioridad_inactiva', altaPrioridadInactiva)

    const resumen = {
      sinContacto: sinContacto.length,
      estancadas: estancadas.length,
      cierreProximo: cierreProximo.length,
      altaPrioridad: altaPrioridadInactiva.length,
      total: alertas.length,
    }

    return NextResponse.json({ alertas, resumen })
  } catch (error) {
    console.error('Error al obtener alertas CRM:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
