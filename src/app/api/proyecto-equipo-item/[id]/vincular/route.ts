// ===================================================
// 📁 Archivo: route.ts
// 📍 Ubicación: src/app/api/proyecto-equipo-item/[id]/vincular/route.ts
// 🔧 Descripción: Vincula un ListaEquipoItem como reemplazo de un
//    ProyectoEquipoCotizadoItem de forma atómica.
//
//    Si el equipo ya tenía un lista item vinculado (listaEquipoSeleccionadoId),
//    también lo limpia (origen='nuevo', desvincula FKs). Bloquea si ese
//    lista item previo tiene pedidos en estados que impiden el reemplazo.
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const { listaItemId, motivoCambio } = body as { listaItemId?: string; motivoCambio?: string }

    if (!listaItemId) {
      return NextResponse.json({ error: 'listaItemId requerido' }, { status: 400 })
    }

    const equipoItem = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id },
      select: { id: true, listaEquipoSeleccionadoId: true },
    })
    if (!equipoItem) {
      return NextResponse.json({ error: 'Ítem de equipo no encontrado' }, { status: 404 })
    }

    const nuevoListaItem = await prisma.listaEquipoItem.findUnique({
      where: { id: listaItemId },
      select: { id: true, listaId: true },
    })
    if (!nuevoListaItem) {
      return NextResponse.json({ error: 'Lista item no encontrado' }, { status: 404 })
    }

    const oldListaItemId = equipoItem.listaEquipoSeleccionadoId

    if (oldListaItemId && oldListaItemId !== listaItemId) {
      const pedidosBloqueantes = await prisma.pedidoEquipoItem.findMany({
        where: {
          listaEquipoItemId: oldListaItemId,
          pedidoEquipo: { estado: { in: ESTADOS_BLOQUEANTES } },
        },
        select: {
          id: true,
          cantidadPedida: true,
          cantidadAtendida: true,
          estado: true,
          pedidoEquipo: { select: { codigo: true, estado: true } },
        },
      })

      if (pedidosBloqueantes.length > 0) {
        return NextResponse.json(
          {
            error: 'El ítem actualmente vinculado tiene pedidos en curso',
            bloqueantes: pedidosBloqueantes.map(p => ({
              pedidoCodigo: p.pedidoEquipo.codigo,
              pedidoEstado: p.pedidoEquipo.estado,
              cantidadPedida: p.cantidadPedida,
              cantidadAtendida: p.cantidadAtendida,
              estadoItem: p.estado,
            })),
          },
          { status: 409 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      if (oldListaItemId && oldListaItemId !== listaItemId) {
        await tx.listaEquipoItem.update({
          where: { id: oldListaItemId },
          data: {
            proyectoEquipoItemId: null,
            reemplazaProyectoEquipoCotizadoItemId: null,
            origen: 'nuevo',
          },
        })
      }

      await tx.listaEquipoItem.update({
        where: { id: listaItemId },
        data: {
          proyectoEquipoItemId: id,
          reemplazaProyectoEquipoCotizadoItemId: id,
          origen: 'reemplazo',
        },
      })

      await tx.proyectoEquipoCotizadoItem.update({
        where: { id },
        data: {
          estado: 'reemplazado',
          listaEquipoSeleccionadoId: listaItemId,
          listaId: nuevoListaItem.listaId,
          motivoCambio: motivoCambio || 'Vinculado manualmente como reemplazo',
        },
      })
    })

    return NextResponse.json({ status: 'ok', oldListaItemId, listaItemId })
  } catch (error) {
    console.error('❌ Error en POST proyecto-equipo-item/vincular:', error)
    return NextResponse.json(
      { error: 'Error al vincular ítem de equipo' },
      { status: 500 }
    )
  }
}
