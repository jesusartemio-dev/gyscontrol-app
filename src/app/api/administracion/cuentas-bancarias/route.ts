import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const cuentas = await prisma.cuentaBancaria.findMany({
      orderBy: [{ activa: 'desc' }, { nombreBanco: 'asc' }],
    })

    return NextResponse.json(cuentas)
  } catch (error) {
    console.error('Error al listar cuentas bancarias:', error)
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
    const { nombreBanco, numeroCuenta, cci, tipo, moneda, descripcion } = body

    if (!nombreBanco || !numeroCuenta) {
      return NextResponse.json({ error: 'nombreBanco y numeroCuenta son requeridos' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaBancaria.create({
      data: {
        nombreBanco,
        numeroCuenta,
        cci: cci || null,
        tipo: tipo || 'corriente',
        moneda: moneda || 'PEN',
        descripcion: descripcion || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(cuenta, { status: 201 })
  } catch (error) {
    console.error('Error al crear cuenta bancaria:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
