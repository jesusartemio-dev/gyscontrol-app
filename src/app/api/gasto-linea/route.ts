import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const rendicionGastoId = searchParams.get('rendicionGastoId')

    if (!rendicionGastoId) {
      return NextResponse.json({ error: 'rendicionGastoId es requerido' }, { status: 400 })
    }

    const data = await prisma.gastoLinea.findMany({
      where: { rendicionGastoId },
      include: { adjuntos: true, categoriaGasto: true },
      orderBy: { fecha: 'asc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener líneas de gasto:', error)
    return NextResponse.json({ error: 'Error al obtener líneas de gasto' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await req.json()

    // Validar rendición existe y está en estado editable
    const rendicion = await prisma.rendicionGasto.findUnique({
      where: { id: payload.rendicionGastoId },
    })
    if (!rendicion) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }
    if (!['borrador', 'rechazado'].includes(rendicion.estado)) {
      return NextResponse.json({ error: 'Solo se pueden agregar líneas a una rendición en estado borrador o rechazado' }, { status: 400 })
    }

    const linea = await prisma.gastoLinea.create({
      data: {
        rendicionGastoId: payload.rendicionGastoId,
        categoriaGastoId: payload.categoriaGastoId || null,
        descripcion: payload.descripcion,
        fecha: new Date(payload.fecha),
        monto: payload.monto,
        moneda: payload.moneda || 'PEN',
        tipoComprobante: payload.tipoComprobante || null,
        numeroComprobante: payload.numeroComprobante || null,
        proveedorNombre: payload.proveedorNombre || null,
        proveedorRuc: payload.proveedorRuc || null,
        observaciones: payload.observaciones || null,
        updatedAt: new Date(),
      },
      include: { adjuntos: true, categoriaGasto: true },
    })

    // Recalcular montoTotal de la rendición
    const totalResult = await prisma.gastoLinea.aggregate({
      where: { rendicionGastoId: payload.rendicionGastoId },
      _sum: { monto: true },
    })
    await prisma.rendicionGasto.update({
      where: { id: payload.rendicionGastoId },
      data: {
        montoTotal: totalResult._sum.monto || 0,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(linea)
  } catch (error) {
    console.error('Error al crear línea de gasto:', error)
    return NextResponse.json({ error: 'Error al crear línea de gasto' }, { status: 500 })
  }
}
