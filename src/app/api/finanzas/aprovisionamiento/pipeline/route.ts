// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/finanzas/aprovisionamiento/pipeline/
// 🔧 Descripción: Pipeline de pendientes — qué quedó "stuck" en cada etapa
// del flujo Lista → Pedido → OC → Recepción → Factura → Pago.
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface PipelineKPI {
  count: number
  monto: number
}

interface PipelineResponse {
  listasSinPedido: PipelineKPI
  pedidosSinOC: PipelineKPI
  ocsSinRecepcion: PipelineKPI
  ocsSinFactura: PipelineKPI
  facturasSinPagar: PipelineKPI
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 1) Listas aprobadas que aún no tienen ningún PedidoEquipo.
    //    El siguiente paso natural es generar pedido(s) desde la lista.
    const listasSinPedidoData = await prisma.listaEquipo.findMany({
      where: {
        estado: 'aprobada',
        pedidoEquipo: { none: {} },
      },
      select: {
        id: true,
        listaEquipoItem: {
          select: { precioElegido: true, cantidad: true },
        },
      },
    })
    const listasSinPedido: PipelineKPI = {
      count: listasSinPedidoData.length,
      monto: listasSinPedidoData.reduce((sum, l) => {
        return sum + l.listaEquipoItem.reduce((s, i) => s + (i.precioElegido || 0) * i.cantidad, 0)
      }, 0),
    }

    // 2) Pedidos en estado activo sin ningún OC asociado.
    const pedidosSinOCData = await prisma.pedidoEquipo.findMany({
      where: {
        estado: { in: ['enviado', 'atendido', 'parcial'] as any },
        ordenesCompra: { none: {} },
      },
      select: {
        id: true,
        pedidoEquipoItem: {
          select: { costoTotal: true },
        },
      },
    })
    const pedidosSinOC: PipelineKPI = {
      count: pedidosSinOCData.length,
      monto: pedidosSinOCData.reduce((sum, p) => {
        return sum + p.pedidoEquipoItem.reduce((s, i) => s + (i.costoTotal || 0), 0)
      }, 0),
    }

    // 3) OCs confirmadas con requiereRecepcion=true que no tienen recepciones
    //    confirmadas/recibidas (es decir, no se ha entregado nada todavía).
    const ocsSinRecepcionData = await prisma.ordenCompra.findMany({
      where: {
        requiereRecepcion: true,
        estado: { in: ['confirmada', 'parcial'] },
        items: {
          none: {
            recepcionesPendientes: {
              some: { estado: { in: ['en_almacen', 'entregado_proyecto'] } },
            },
          },
        },
      },
      select: { id: true, total: true },
    })
    const ocsSinRecepcion: PipelineKPI = {
      count: ocsSinRecepcionData.length,
      monto: ocsSinRecepcionData.reduce((s, o) => s + (o.total || 0), 0),
    }

    // 4) OCs en estado >= confirmada sin ninguna CuentaPorPagar (no anulada).
    const ocsSinFacturaData = await prisma.ordenCompra.findMany({
      where: {
        estado: { in: ['confirmada', 'parcial', 'completada'] },
        cuentasPorPagar: { none: { estado: { not: 'anulada' } } },
      },
      select: { id: true, total: true },
    })
    const ocsSinFactura: PipelineKPI = {
      count: ocsSinFacturaData.length,
      monto: ocsSinFacturaData.reduce((s, o) => s + (o.total || 0), 0),
    }

    // 5) Facturas (CxP) con saldo pendiente > 0 y no anuladas.
    const facturasSinPagarAgg = await prisma.cuentaPorPagar.aggregate({
      where: {
        estado: { notIn: ['anulada', 'pagada'] },
        saldoPendiente: { gt: 0 },
      },
      _sum: { saldoPendiente: true },
      _count: { _all: true },
    })
    const facturasSinPagar: PipelineKPI = {
      count: facturasSinPagarAgg._count._all,
      monto: facturasSinPagarAgg._sum.saldoPendiente || 0,
    }

    const response: PipelineResponse = {
      listasSinPedido,
      pedidosSinOC,
      ocsSinRecepcion,
      ocsSinFactura,
      facturasSinPagar,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error en pipeline aprovisionamiento:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
