import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const includeRelations = {
  proyecto: { select: { id: true, nombre: true, codigo: true } },
  solicitante: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  rendiciones: {
    include: {
      lineas: { include: { adjuntos: true, categoriaGasto: true } },
      empleado: { select: { id: true, name: true, email: true } },
    },
  },
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.solicitudAnticipo.findUnique({
      where: { id },
      include: includeRelations,
    })
    if (!data) {
      return NextResponse.json({ error: 'Anticipo no encontrado' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener anticipo:', error)
    return NextResponse.json({ error: 'Error al obtener anticipo' }, { status: 500 })
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

    const existing = await prisma.solicitudAnticipo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Anticipo no encontrado' }, { status: 404 })
    }

    // Solo se puede editar en borrador o rechazado
    if (!['borrador', 'rechazado'].includes(existing.estado) && !payload.estado) {
      return NextResponse.json({ error: 'Solo se puede editar en estado borrador o rechazado' }, { status: 400 })
    }

    const updateData: any = { updatedAt: new Date() }
    if (payload.monto !== undefined) updateData.monto = payload.monto
    if (payload.moneda !== undefined) updateData.moneda = payload.moneda
    if (payload.motivo !== undefined) updateData.motivo = payload.motivo
    if (payload.fechaInicio !== undefined) updateData.fechaInicio = payload.fechaInicio ? new Date(payload.fechaInicio) : null
    if (payload.fechaFin !== undefined) updateData.fechaFin = payload.fechaFin ? new Date(payload.fechaFin) : null
    if (payload.estado === 'enviado' && ['borrador', 'rechazado'].includes(existing.estado)) {
      updateData.estado = 'enviado'
      updateData.comentarioRechazo = null
    }

    const data = await prisma.solicitudAnticipo.update({
      where: { id },
      data: updateData,
      include: includeRelations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al actualizar anticipo:', error)
    return NextResponse.json({ error: 'Error al actualizar anticipo' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.solicitudAnticipo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Anticipo no encontrado' }, { status: 404 })
    }

    if (existing.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se puede eliminar en estado borrador' }, { status: 400 })
    }

    await prisma.solicitudAnticipo.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar anticipo:', error)
    return NextResponse.json({ error: 'Error al eliminar anticipo' }, { status: 500 })
  }
}
