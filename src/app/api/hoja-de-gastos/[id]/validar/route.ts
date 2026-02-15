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
      return NextResponse.json({ error: 'Sin permisos para validar' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'rendido') {
      return NextResponse.json({ error: 'Solo se puede validar desde estado rendido' }, { status: 400 })
    }

    const data = await prisma.hojaDeGastos.update({
      where: { id },
      data: {
        estado: 'validado',
        fechaValidacion: new Date(),
        updatedAt: new Date(),
      },
    })

    // Recalcular totalRealGastos del proyecto si aplica
    if (hoja.proyectoId) {
      const agg = await prisma.hojaDeGastos.aggregate({
        where: {
          proyectoId: hoja.proyectoId,
          estado: { in: ['validado', 'cerrado'] },
        },
        _sum: { montoGastado: true },
      })
      await prisma.proyecto.update({
        where: { id: hoja.proyectoId },
        data: { totalRealGastos: agg._sum.montoGastado || 0 },
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al validar:', error)
    return NextResponse.json({ error: 'Error al validar' }, { status: 500 })
  }
}
