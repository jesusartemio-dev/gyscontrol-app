import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const includeRelations = {
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  cliente: { select: { id: true, nombre: true, ruc: true } },
  valorizacion: { select: { id: true, codigo: true, numero: true } },
  pagos: {
    include: { cuentaBancaria: { select: { id: true, nombreBanco: true, numeroCuenta: true } } },
    orderBy: { fechaPago: 'desc' as const },
  },
  adjuntos: {
    include: { subidoPor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
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
    const clienteId = searchParams.get('clienteId')
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    const where: any = {}
    if (clienteId) where.clienteId = clienteId
    if (proyectoId) where.proyectoId = proyectoId
    if (estado) where.estado = estado

    const cuentas = await prisma.cuentaPorCobrar.findMany({
      where,
      include: includeRelations,
      orderBy: { fechaVencimiento: 'asc' },
    })

    return NextResponse.json(cuentas)
  } catch (error) {
    console.error('Error al listar CxC:', error)
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
    const { proyectoId, clienteId, valorizacionId, numeroDocumento, descripcion, monto, moneda, tipoCambio, fechaEmision, fechaVencimiento, observaciones } = body

    if (!proyectoId || !clienteId || !monto || !fechaEmision || !fechaVencimiento) {
      return NextResponse.json({ error: 'proyectoId, clienteId, monto, fechaEmision y fechaVencimiento son requeridos' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaPorCobrar.create({
      data: {
        proyectoId,
        clienteId,
        valorizacionId: valorizacionId || null,
        numeroDocumento: numeroDocumento || null,
        descripcion: descripcion || null,
        monto,
        moneda: moneda || 'PEN',
        tipoCambio: tipoCambio || null,
        saldoPendiente: monto,
        fechaEmision: new Date(fechaEmision),
        fechaVencimiento: new Date(fechaVencimiento),
        observaciones: observaciones || null,
        updatedAt: new Date(),
      },
      include: includeRelations,
    })

    return NextResponse.json(cuenta, { status: 201 })
  } catch (error) {
    console.error('Error al crear CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
