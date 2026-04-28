// ===================================================
// 📁 Archivo: route.ts
// 📍 Ubicación: src/app/api/proyecto-equipo-item/[id]/desvincular/route.ts
// 🔧 Descripción: Desvincula un ProyectoEquipoCotizadoItem de su ListaEquipoItem
//    de forma atómica: resetea el equipo cotizado y, si existe lista vinculada,
//    limpia la referencia y marca origen='nuevo' (sin eliminar el ítem de lista).
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const equipoItem = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id },
      select: { id: true, listaEquipoSeleccionadoId: true },
    })

    if (!equipoItem) {
      return NextResponse.json({ error: 'Ítem de equipo no encontrado' }, { status: 404 })
    }

    const listaItemId = equipoItem.listaEquipoSeleccionadoId

    await prisma.$transaction(async (tx) => {
      await tx.proyectoEquipoCotizadoItem.update({
        where: { id },
        data: {
          estado: 'pendiente',
          listaEquipoSeleccionadoId: null,
          listaId: null,
          motivoCambio: null,
        },
      })

      if (listaItemId) {
        await tx.listaEquipoItem.update({
          where: { id: listaItemId },
          data: {
            proyectoEquipoItemId: null,
            reemplazaProyectoEquipoCotizadoItemId: null,
            origen: 'nuevo',
          },
        })
      }
    })

    return NextResponse.json({ status: 'ok', listaItemId })
  } catch (error) {
    console.error('❌ Error en POST proyecto-equipo-item/desvincular:', error)
    return NextResponse.json(
      { error: 'Error al desvincular ítem de equipo' },
      { status: 500 }
    )
  }
}
