import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const includeRelations = {
  solicitudAnticipo: { select: { id: true, numero: true, monto: true, estado: true, montoPendiente: true, montoLiquidado: true } },
  proyecto: { select: { id: true, nombre: true, codigo: true } },
  empleado: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  lineas: {
    include: { adjuntos: true, categoriaGasto: true },
    orderBy: { fecha: 'asc' as const },
  },
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.rendicionGasto.findUnique({
      where: { id },
      include: includeRelations,
    })
    if (!data) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener rendición:', error)
    return NextResponse.json({ error: 'Error al obtener rendición' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const payload = await req.json()

    const existing = await prisma.rendicionGasto.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }

    if (!['borrador', 'rechazado'].includes(existing.estado)) {
      return NextResponse.json({ error: 'Solo se puede editar en estado borrador o rechazado' }, { status: 400 })
    }

    const updateData: any = { updatedAt: new Date() }
    if (payload.observaciones !== undefined) updateData.observaciones = payload.observaciones

    const data = await prisma.rendicionGasto.update({
      where: { id },
      data: updateData,
      include: includeRelations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al actualizar rendición:', error)
    return NextResponse.json({ error: 'Error al actualizar rendición' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.rendicionGasto.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }

    if (existing.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se puede eliminar en estado borrador' }, { status: 400 })
    }

    await prisma.rendicionGasto.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar rendición:', error)
    return NextResponse.json({ error: 'Error al eliminar rendición' }, { status: 500 })
  }
}
