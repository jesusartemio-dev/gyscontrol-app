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

    if (!['admin', 'gerente', 'gestor', 'coordinador', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para rechazar' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }

    // Determinar rechazadoEn basado en estado actual
    const estadosRechazables: Record<string, string> = {
      enviado: 'aprobacion',
      rendido: 'validacion',
      validado: 'cierre',
    }

    const rechazadoEn = estadosRechazables[hoja.estado]
    if (!rechazadoEn) {
      return NextResponse.json({ error: 'No se puede rechazar desde este estado' }, { status: 400 })
    }

    const payload = await req.json()
    const comentario = payload.comentario || 'Rechazado'
    const estadoAnterior = hoja.estado

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'rechazado',
          rechazadoEn,
          comentarioRechazo: comentario,
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'rechazado',
          descripcion: `Rechazado en etapa ${rechazadoEn}: ${comentario}`,
          estadoAnterior,
          estadoNuevo: 'rechazado',
          usuarioId: session.user.id,
          metadata: { etapa: rechazadoEn, comentario },
        },
      })

      return updated
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al rechazar:', error)
    return NextResponse.json({ error: 'Error al rechazar' }, { status: 500 })
  }
}
