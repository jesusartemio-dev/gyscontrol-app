import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const includeRelations = {
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  centroCosto: { select: { id: true, nombre: true, tipo: true } },
  empleado: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  lineas: {
    include: {
      adjuntos: true,
      categoriaGasto: true,
      centroCosto: { select: { id: true, nombre: true } },
    },
    orderBy: { fecha: 'asc' as const },
  },
  adjuntos: { orderBy: { createdAt: 'asc' as const } },
  eventos: {
    include: { usuario: { select: { id: true, name: true } } },
    orderBy: { creadoEn: 'desc' as const },
  },
  itemsMateriales: {
    include: {
      pedidoEquipoItem: {
        select: {
          id: true, codigo: true, descripcion: true, unidad: true, precioUnitario: true,
        },
      },
      pedidoEquipo: { select: { id: true, codigo: true } },
      proyecto: { select: { id: true, codigo: true, nombre: true } },
      recepciones: { select: { id: true, estado: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  comprobantes: {
    include: {
      adjuntos: { orderBy: { createdAt: 'asc' as const } },
      lineas: {
        select: {
          id: true, descripcion: true, monto: true, proyectoId: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  depositos: {
    include: {
      adjuntos: { orderBy: { createdAt: 'asc' as const } },
      creadoPor: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const data = await prisma.hojaDeGastos.findUnique({
      where: { id },
      include: includeRelations,
    })
    if (!data) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener hoja de gastos:', error)
    return NextResponse.json({ error: 'Error al obtener hoja de gastos' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }

    const payload = await req.json()
    const updateData: any = { updatedAt: new Date() }

    // Caso especial: activar anticipo en estado aprobado (solo admin/gerente/administracion)
    if (existing.estado === 'aprobado' && payload.activarAnticipo === true) {
      if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Sin permisos para activar anticipo' }, { status: 403 })
      }
      if (existing.requiereAnticipo) {
        return NextResponse.json({ error: 'El requerimiento ya tiene anticipo activado' }, { status: 409 })
      }
      updateData.requiereAnticipo = true
      updateData.montoAnticipo = payload.montoAnticipo ?? 0
      const data = await prisma.hojaDeGastos.update({
        where: { id },
        data: updateData,
        include: includeRelations,
      })
      await prisma.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'anticipo_activado',
          descripcion: `Depósito activado post-aprobación. Monto anticipo: S/ ${(payload.montoAnticipo ?? 0).toFixed(2)}`,
          usuarioId: session.user.id,
          metadata: { montoAnticipo: payload.montoAnticipo ?? 0 },
        },
      })
      return NextResponse.json(data)
    }

    if (!['borrador', 'rechazado'].includes(existing.estado)) {
      return NextResponse.json({ error: 'Solo se puede editar en estado borrador o rechazado' }, { status: 400 })
    }

    if (payload.motivo !== undefined) updateData.motivo = payload.motivo.trim()
    if (payload.observaciones !== undefined) updateData.observaciones = payload.observaciones
    if (payload.requiereAnticipo !== undefined) {
      updateData.requiereAnticipo = payload.requiereAnticipo
      if (!payload.requiereAnticipo) {
        updateData.montoAnticipo = 0
      }
    }
    if (payload.montoAnticipo !== undefined) updateData.montoAnticipo = payload.montoAnticipo

    const data = await prisma.hojaDeGastos.update({
      where: { id },
      data: updateData,
      include: includeRelations,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al actualizar hoja de gastos:', error)
    return NextResponse.json({ error: 'Error al actualizar hoja de gastos' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (existing.estado !== 'borrador') {
      return NextResponse.json({ error: 'Solo se puede eliminar en estado borrador' }, { status: 400 })
    }

    await prisma.hojaDeGastos.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar hoja de gastos:', error)
    return NextResponse.json({ error: 'Error al eliminar hoja de gastos' }, { status: 500 })
  }
}
