import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const valHH = await prisma.valorizacionHH.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, ruc: true } },
        valorizacion: {
          select: {
            id: true, estado: true, codigo: true, moneda: true,
            montoValorizacion: true, descuentoComercialPorcentaje: true,
            descuentoComercialMonto: true, adelantoPorcentaje: true,
            adelantoMonto: true, subtotal: true, igvPorcentaje: true,
            igvMonto: true, fondoGarantiaPorcentaje: true,
            fondoGarantiaMonto: true, netoARecibir: true,
            acumuladoAnterior: true, acumuladoActual: true,
            periodoInicio: true, periodoFin: true,
            presupuestoContractual: true, saldoPorValorizar: true,
            porcentajeAvance: true,
            proyecto: { select: { id: true, codigo: true, nombre: true } },
          },
        },
        lineas: {
          include: {
            proyecto: { select: { id: true, codigo: true, nombre: true } },
            recurso: { select: { id: true, nombre: true } },
          },
          orderBy: [{ proyectoId: 'asc' }, { recursoId: 'asc' }, { fecha: 'asc' }],
        },
      },
    })

    if (!valHH) {
      return NextResponse.json({ error: 'Valorización HH no encontrada' }, { status: 404 })
    }

    // Build resumen
    const porProyectoMap = new Map<string, { proyectoId: string; proyectoCodigo: string; proyectoNombre: string; totalHoras: number; totalCosto: number }>()
    const porRecursoMap = new Map<string, { recursoId: string; recursoNombre: string; tarifaHora: number; totalHoras: number; totalCosto: number }>()

    for (const l of valHH.lineas) {
      // By proyecto
      const ep = porProyectoMap.get(l.proyectoId)
      if (ep) {
        ep.totalHoras += l.horasEquivalente
        ep.totalCosto += l.costoLinea
      } else {
        porProyectoMap.set(l.proyectoId, {
          proyectoId: l.proyectoId,
          proyectoCodigo: l.proyecto.codigo,
          proyectoNombre: l.proyecto.nombre,
          totalHoras: l.horasEquivalente,
          totalCosto: l.costoLinea,
        })
      }
      // By recurso
      const er = porRecursoMap.get(l.recursoId)
      if (er) {
        er.totalHoras += l.horasEquivalente
        er.totalCosto += l.costoLinea
      } else {
        porRecursoMap.set(l.recursoId, {
          recursoId: l.recursoId,
          recursoNombre: l.recurso.nombre,
          tarifaHora: l.tarifaHora,
          totalHoras: l.horasEquivalente,
          totalCosto: l.costoLinea,
        })
      }
    }

    const resumen = {
      porProyecto: Array.from(porProyectoMap.values()).map(p => ({
        ...p, totalHoras: +p.totalHoras.toFixed(4), totalCosto: +p.totalCosto.toFixed(2),
      })),
      porRecurso: Array.from(porRecursoMap.values()).map(r => ({
        ...r, totalHoras: +r.totalHoras.toFixed(4), totalCosto: +r.totalCosto.toFixed(2),
      })),
    }

    return NextResponse.json({
      ...valHH,
      proyectosIds: safeParse(valHH.proyectosIds),
      resumen,
    })
  } catch (error) {
    console.error('Error al obtener valorización HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

function safeParse(json: string): string[] {
  try { return JSON.parse(json) } catch { return [] }
}
