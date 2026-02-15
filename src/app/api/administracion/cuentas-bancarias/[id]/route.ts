import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id } })
    if (!cuenta) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    return NextResponse.json(cuenta)
  } catch (error) {
    console.error('Error al obtener cuenta bancaria:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { nombreBanco, numeroCuenta, cci, tipo, moneda, activa, descripcion } = body

    const cuenta = await prisma.cuentaBancaria.update({
      where: { id },
      data: {
        ...(nombreBanco !== undefined && { nombreBanco }),
        ...(numeroCuenta !== undefined && { numeroCuenta }),
        ...(cci !== undefined && { cci }),
        ...(tipo !== undefined && { tipo }),
        ...(moneda !== undefined && { moneda }),
        ...(activa !== undefined && { activa }),
        ...(descripcion !== undefined && { descripcion }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(cuenta)
  } catch (error) {
    console.error('Error al actualizar cuenta bancaria:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
