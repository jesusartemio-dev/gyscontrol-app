import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para registrar depósito' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'aprobado') {
      return NextResponse.json({ error: 'Solo se puede depositar desde estado aprobado' }, { status: 400 })
    }
    if (!hoja.requiereAnticipo) {
      return NextResponse.json({ error: 'Esta hoja no requiere anticipo' }, { status: 400 })
    }

    const payload = await req.json()
    const montoDepositado = payload.montoDepositado || hoja.montoAnticipo

    const data = await prisma.hojaDeGastos.update({
      where: { id },
      data: {
        estado: 'depositado',
        montoDepositado,
        saldo: montoDepositado - hoja.montoGastado,
        fechaDeposito: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al depositar:', error)
    return NextResponse.json({ error: 'Error al registrar depósito' }, { status: 500 })
  }
}
