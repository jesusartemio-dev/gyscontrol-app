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

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id },
      include: { lineas: true },
    })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }

    // Validar estado según requiereAnticipo
    if (hoja.requiereAnticipo && hoja.estado !== 'depositado') {
      return NextResponse.json({ error: 'Debe estar en estado depositado para rendir' }, { status: 400 })
    }
    if (!hoja.requiereAnticipo && hoja.estado !== 'aprobado') {
      return NextResponse.json({ error: 'Debe estar en estado aprobado para rendir' }, { status: 400 })
    }

    if (hoja.lineas.length === 0) {
      return NextResponse.json({ error: 'Debe tener al menos una línea de gasto' }, { status: 400 })
    }

    // Recalcular montos
    const montoGastado = hoja.lineas.reduce((sum, l) => sum + l.monto, 0)
    const saldo = hoja.montoDepositado - montoGastado
    const estadoAnterior = hoja.estado

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'rendido',
          montoGastado,
          saldo,
          fechaRendicion: new Date(),
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'rendido',
          descripcion: `Rendicion enviada. Monto gastado: S/ ${montoGastado.toFixed(2)} (${hoja.lineas.length} linea(s))`,
          estadoAnterior,
          estadoNuevo: 'rendido',
          usuarioId: session.user.id,
          metadata: { montoGastado, saldo, cantidadLineas: hoja.lineas.length },
        },
      })

      return updated
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al rendir:', error)
    return NextResponse.json({ error: 'Error al rendir' }, { status: 500 })
  }
}
