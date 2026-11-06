import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/lista-equipo-item/sin-vincular?proyectoId=xxx&equipoGrupoId=yyy
// Returns lista items that are not linked to any ProyectoEquipoCotizadoItem
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const equipoGrupoId = searchParams.get('equipoGrupoId') // ProyectoEquipoCotizado.id

    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId es requerido' }, { status: 400 })
    }

    const items = await prisma.listaEquipoItem.findMany({
      where: {
        listaEquipo: { proyectoId },
        proyectoEquipoItemId: null,
        // Con grupo: los de ese grupo y también los que no tienen ninguno.
        // Antes sólo traía los del grupo, y así los ítems sueltos — justo los
        // que hay que vincular — nunca aparecían en el diálogo.
        ...(equipoGrupoId
          ? { OR: [{ proyectoEquipoId: equipoGrupoId }, { proyectoEquipoId: null }] }
          : {}),
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        cantidad: true,
        unidad: true,
        origen: true,
        estado: true,
        proyectoEquipoId: true,
        listaEquipo: {
          select: { id: true, codigo: true, nombre: true },
        },
      },
      orderBy: [{ listaEquipo: { codigo: 'asc' } }, { codigo: 'asc' }],
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error lista-equipo-item/sin-vincular:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
