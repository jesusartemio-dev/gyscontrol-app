import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/proyecto-equipo-item/[id]/desglose/items-disponibles?listaIds=a,b,c
// Devuelve, agrupado por lista, los lista items candidatos para asociar al desglose
// del cotizado item [id].
//
// Candidatos:
//   - origen='nuevo' SIN proyectoEquipoItemId/reemplaza/desglose previo  → libres
//   - desgloseDeProyectoEquipoCotizadoItemId === [id]                   → ya asociados a este desglose
//
// También retornamos items con desgloseDeProyectoEquipoCotizadoItemId !== [id]
// para mostrarlos deshabilitados ("ya en otro desglose").
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: cotizadoItemId } = await params
    const { searchParams } = new URL(req.url)
    const listaIdsParam = searchParams.get('listaIds')

    if (!listaIdsParam) {
      return NextResponse.json({ error: 'listaIds es requerido' }, { status: 400 })
    }
    const listaIds = listaIdsParam.split(',').filter(Boolean)
    if (listaIds.length === 0) {
      return NextResponse.json([])
    }

    const items = await prisma.listaEquipoItem.findMany({
      where: {
        listaId: { in: listaIds },
        OR: [
          {
            origen: 'nuevo',
            proyectoEquipoItemId: null,
            reemplazaProyectoEquipoCotizadoItemId: null,
            desgloseDeProyectoEquipoCotizadoItemId: null,
          },
          { desgloseDeProyectoEquipoCotizadoItemId: cotizadoItemId },
          { desgloseDeProyectoEquipoCotizadoItemId: { not: null, notIn: [cotizadoItemId] } },
        ],
      },
      select: {
        id: true,
        listaId: true,
        codigo: true,
        descripcion: true,
        cantidad: true,
        unidad: true,
        origen: true,
        estado: true,
        desgloseDeProyectoEquipoCotizadoItemId: true,
        desgloseDeProyectoEquipoCotizadoItem: {
          select: { id: true, codigo: true, descripcion: true },
        },
        listaEquipo: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: [{ codigo: 'asc' }],
    })

    const grouped = listaIds.map((lid) => {
      const listaItems = items.filter((it) => it.listaId === lid)
      const lista = listaItems[0]?.listaEquipo
      return {
        listaId: lid,
        lista: lista ?? null,
        items: listaItems.map((it) => ({
          id: it.id,
          codigo: it.codigo,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          unidad: it.unidad,
          origen: it.origen,
          estado: it.estado,
          asociadoAEsteDesglose: it.desgloseDeProyectoEquipoCotizadoItemId === cotizadoItemId,
          bloqueadoPorOtroDesglose:
            it.desgloseDeProyectoEquipoCotizadoItemId != null &&
            it.desgloseDeProyectoEquipoCotizadoItemId !== cotizadoItemId
              ? {
                  cotizadoItemId: it.desgloseDeProyectoEquipoCotizadoItemId,
                  codigo: it.desgloseDeProyectoEquipoCotizadoItem?.codigo ?? null,
                  descripcion: it.desgloseDeProyectoEquipoCotizadoItem?.descripcion ?? null,
                }
              : null,
        })),
      }
    })

    return NextResponse.json(grouped)
  } catch (error) {
    console.error('Error desglose/items-disponibles:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
