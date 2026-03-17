import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Desglosar un item cotizado en múltiples listas
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { listaIds, nota } = body as { listaIds: string[]; nota?: string }

    if (!listaIds || listaIds.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar al menos una lista' }, { status: 400 })
    }

    const item = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id },
      select: { id: true, estado: true, codigo: true },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    if (item.estado !== 'pendiente' && item.estado !== 'desglosado') {
      return NextResponse.json(
        { error: `No se puede desglosar un item en estado "${item.estado}"` },
        { status: 400 }
      )
    }

    // Delete existing desgloses if re-desglosando
    await prisma.desgloseEquipoItem.deleteMany({
      where: { proyectoEquipoCotizadoItemId: id },
    })

    // Create new desgloses
    await prisma.desgloseEquipoItem.createMany({
      data: listaIds.map((listaEquipoId: string) => ({
        proyectoEquipoCotizadoItemId: id,
        listaEquipoId,
        nota: nota || null,
      })),
    })

    // Update item estado
    const updated = await prisma.proyectoEquipoCotizadoItem.update({
      where: { id },
      data: {
        estado: 'desglosado',
        updatedAt: new Date(),
      },
      include: {
        desgloses: {
          include: {
            listaEquipo: { select: { id: true, codigo: true, nombre: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al desglosar item:', error)
    return NextResponse.json({ error: 'Error al desglosar item' }, { status: 500 })
  }
}

// DELETE: Revertir desglose (volver a pendiente)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    await prisma.desgloseEquipoItem.deleteMany({
      where: { proyectoEquipoCotizadoItemId: id },
    })

    const updated = await prisma.proyectoEquipoCotizadoItem.update({
      where: { id },
      data: {
        estado: 'pendiente',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al revertir desglose:', error)
    return NextResponse.json({ error: 'Error al revertir desglose' }, { status: 500 })
  }
}
