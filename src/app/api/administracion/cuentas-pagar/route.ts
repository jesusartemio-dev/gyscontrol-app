import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const includeRelations = {
  proveedor: { select: { id: true, nombre: true, ruc: true } },
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  ordenCompra: { select: { id: true, numero: true, total: true } },
  pagos: {
    include: { cuentaBancaria: { select: { id: true, nombreBanco: true, numeroCuenta: true } } },
    orderBy: { fechaPago: 'desc' as const },
  },
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const proveedorId = searchParams.get('proveedorId')
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    const where: any = {}
    if (proveedorId) where.proveedorId = proveedorId
    if (proyectoId) where.proyectoId = proyectoId
    if (estado) where.estado = estado

    const cuentas = await prisma.cuentaPorPagar.findMany({
      where,
      include: includeRelations,
      orderBy: { fechaVencimiento: 'asc' },
    })

    return NextResponse.json(cuentas)
  } catch (error) {
    console.error('Error al listar CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { proveedorId, proyectoId, ordenCompraId, numeroFactura, descripcion, monto, moneda, tipoCambio, fechaRecepcion, fechaVencimiento, condicionPago, diasCredito, observaciones } = body

    if (!proveedorId || !monto || !fechaRecepcion || !fechaVencimiento) {
      return NextResponse.json({ error: 'proveedorId, monto, fechaRecepcion y fechaVencimiento son requeridos' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaPorPagar.create({
      data: {
        proveedorId,
        proyectoId: proyectoId || null,
        ordenCompraId: ordenCompraId || null,
        numeroFactura: numeroFactura || null,
        descripcion: descripcion || null,
        monto,
        moneda: moneda || 'PEN',
        tipoCambio: tipoCambio || null,
        saldoPendiente: monto,
        fechaRecepcion: new Date(fechaRecepcion),
        fechaVencimiento: new Date(fechaVencimiento),
        condicionPago: condicionPago || 'contado',
        diasCredito: diasCredito ? Number(diasCredito) : null,
        observaciones: observaciones || null,
        updatedAt: new Date(),
      },
      include: includeRelations,
    })

    return NextResponse.json(cuenta, { status: 201 })
  } catch (error) {
    console.error('Error al crear CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
