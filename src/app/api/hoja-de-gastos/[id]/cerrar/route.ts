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

    if (!['admin', 'gerente', 'coordinador', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para cerrar' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'validado') {
      return NextResponse.json({ error: 'Solo se puede cerrar desde estado validado' }, { status: 400 })
    }

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'cerrado',
          fechaCierre: new Date(),
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'cerrado',
          descripcion: `Cerrado por ${session.user.name}`,
          estadoAnterior: 'validado',
          estadoNuevo: 'cerrado',
          usuarioId: session.user.id,
        },
      })

      // Recalcular totalRealGastos del proyecto si aplica
      if (hoja.proyectoId) {
        const agg = await tx.hojaDeGastos.aggregate({
          where: {
            proyectoId: hoja.proyectoId,
            estado: { in: ['validado', 'cerrado'] },
          },
          _sum: { montoGastado: true },
        })
        await tx.proyecto.update({
          where: { id: hoja.proyectoId },
          data: { totalRealGastos: agg._sum.montoGastado || 0 },
        })
      }

      return updated
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al cerrar:', error)
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 })
  }
}
