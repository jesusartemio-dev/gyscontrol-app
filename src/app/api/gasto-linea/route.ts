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
    const hojaDeGastosId = searchParams.get('hojaDeGastosId')

    if (!hojaDeGastosId) {
      return NextResponse.json({ error: 'hojaDeGastosId es requerido' }, { status: 400 })
    }

    const data = await prisma.gastoLinea.findMany({
      where: { hojaDeGastosId },
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

    // Validar hoja existe y está en estado editable
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id: payload.hojaDeGastosId },
    })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (!['borrador', 'rechazado', 'aprobado', 'depositado'].includes(hoja.estado)) {
      return NextResponse.json({ error: 'No se pueden agregar líneas en este estado' }, { status: 400 })
    }

    const linea = await prisma.gastoLinea.create({
      data: {
        hojaDeGastosId: payload.hojaDeGastosId,
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

    // Recalcular montoGastado de la hoja
    const totalResult = await prisma.gastoLinea.aggregate({
      where: { hojaDeGastosId: payload.hojaDeGastosId },
      _sum: { monto: true },
    })
    const montoGastado = totalResult._sum.monto || 0
    await prisma.hojaDeGastos.update({
      where: { id: payload.hojaDeGastosId },
      data: {
        montoGastado,
        saldo: hoja.montoDepositado - montoGastado,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(linea)
  } catch (error) {
    console.error('Error al crear línea de gasto:', error)
    return NextResponse.json({ error: 'Error al crear línea de gasto' }, { status: 500 })
  }
}
