import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.gastoLinea.findUnique({
      where: { id },
      include: { adjuntos: true, categoriaGasto: true },
    })
    if (!data) {
      return NextResponse.json({ error: 'Línea de gasto no encontrada' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener línea de gasto:', error)
    return NextResponse.json({ error: 'Error al obtener línea de gasto' }, { status: 500 })
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

    const existing = await prisma.gastoLinea.findUnique({
      where: { id },
      include: { hojaDeGastos: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Línea de gasto no encontrada' }, { status: 404 })
    }
    if (!['borrador', 'rechazado', 'aprobado', 'depositado'].includes(existing.hojaDeGastos.estado)) {
      return NextResponse.json({ error: 'No se pueden editar líneas en este estado' }, { status: 400 })
    }

    const updateData: any = { updatedAt: new Date() }
    if (payload.categoriaGastoId !== undefined) updateData.categoriaGastoId = payload.categoriaGastoId
    if (payload.descripcion !== undefined) updateData.descripcion = payload.descripcion
    if (payload.fecha !== undefined) updateData.fecha = new Date(payload.fecha)
    if (payload.monto !== undefined) updateData.monto = payload.monto
    if (payload.moneda !== undefined) updateData.moneda = payload.moneda
    if (payload.tipoComprobante !== undefined) updateData.tipoComprobante = payload.tipoComprobante
    if (payload.numeroComprobante !== undefined) updateData.numeroComprobante = payload.numeroComprobante
    if (payload.proveedorNombre !== undefined) updateData.proveedorNombre = payload.proveedorNombre
    if (payload.proveedorRuc !== undefined) updateData.proveedorRuc = payload.proveedorRuc
    if (payload.observaciones !== undefined) updateData.observaciones = payload.observaciones

    const data = await prisma.gastoLinea.update({
      where: { id },
      data: updateData,
      include: { adjuntos: true, categoriaGasto: true },
    })

    // Recalcular montoGastado si cambió el monto
    if (payload.monto !== undefined) {
      const totalResult = await prisma.gastoLinea.aggregate({
        where: { hojaDeGastosId: existing.hojaDeGastosId },
        _sum: { monto: true },
      })
      const montoGastado = totalResult._sum.monto || 0
      await prisma.hojaDeGastos.update({
        where: { id: existing.hojaDeGastosId },
        data: {
          montoGastado,
          saldo: existing.hojaDeGastos.montoDepositado - montoGastado,
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al actualizar línea de gasto:', error)
    return NextResponse.json({ error: 'Error al actualizar línea de gasto' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.gastoLinea.findUnique({
      where: { id },
      include: { hojaDeGastos: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Línea de gasto no encontrada' }, { status: 404 })
    }
    if (!['borrador', 'rechazado', 'aprobado', 'depositado'].includes(existing.hojaDeGastos.estado)) {
      return NextResponse.json({ error: 'No se pueden eliminar líneas en este estado' }, { status: 400 })
    }

    await prisma.gastoLinea.delete({ where: { id } })

    // Recalcular montoGastado
    const totalResult = await prisma.gastoLinea.aggregate({
      where: { hojaDeGastosId: existing.hojaDeGastosId },
      _sum: { monto: true },
    })
    const montoGastado = totalResult._sum.monto || 0
    await prisma.hojaDeGastos.update({
      where: { id: existing.hojaDeGastosId },
      data: {
        montoGastado,
        saldo: existing.hojaDeGastos.montoDepositado - montoGastado,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar línea de gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar línea de gasto' }, { status: 500 })
  }
}
