// ===================================================
// 📁 Archivo: route.ts
// 📍 Ubicación: src/app/api/lista-equipo-item/[id]/pedidos-bloqueantes/route.ts
// 🔧 Descripción: Devuelve pedidos asociados al lista item que bloquearían un
//    reemplazo: pedidos con estado distinto a 'borrador' o 'cancelado'.
//    Útil para mostrar un aviso al usuario antes de intentar reemplazar.
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EstadoPedido } from '@prisma/client'

export const dynamic = 'force-dynamic'

const ESTADOS_BLOQUEANTES: EstadoPedido[] = [
  EstadoPedido.enviado,
  EstadoPedido.aprobado,
  EstadoPedido.atendido,
  EstadoPedido.parcial,
  EstadoPedido.entregado,
]

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const pedidoItems = await prisma.pedidoEquipoItem.findMany({
      where: {
        listaEquipoItemId: id,
        pedidoEquipo: { estado: { in: ESTADOS_BLOQUEANTES } },
      },
      select: {
        id: true,
        cantidadPedida: true,
        cantidadAtendida: true,
        estado: true,
        pedidoEquipo: {
          select: { id: true, codigo: true, estado: true },
        },
      },
    })

    return NextResponse.json({
      total: pedidoItems.length,
      bloqueantes: pedidoItems.map(p => ({
        pedidoEquipoItemId: p.id,
        pedidoId: p.pedidoEquipo.id,
        pedidoCodigo: p.pedidoEquipo.codigo,
        pedidoEstado: p.pedidoEquipo.estado,
        cantidadPedida: p.cantidadPedida,
        cantidadAtendida: p.cantidadAtendida,
        estadoItem: p.estado,
      })),
    })
  } catch (error) {
    console.error('❌ Error en GET pedidos-bloqueantes:', error)
    return NextResponse.json(
      { error: 'Error al consultar pedidos bloqueantes' },
      { status: 500 }
    )
  }
}
