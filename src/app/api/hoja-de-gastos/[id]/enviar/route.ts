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
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (!['borrador', 'rechazado'].includes(hoja.estado)) {
      return NextResponse.json({ error: 'Solo se puede enviar desde borrador o rechazado' }, { status: 400 })
    }

    const estadoAnterior = hoja.estado

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'enviado',
          fechaEnvio: new Date(),
          comentarioRechazo: null,
          rechazadoEn: null,
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'enviado',
          descripcion: 'Enviado para aprobacion',
          estadoAnterior,
          estadoNuevo: 'enviado',
          usuarioId: session.user.id,
        },
      })

      return updated
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al enviar hoja de gastos:', error)
    return NextResponse.json({ error: 'Error al enviar' }, { status: 500 })
  }
}
