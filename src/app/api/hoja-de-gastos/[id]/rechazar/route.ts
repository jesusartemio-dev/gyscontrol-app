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

    if (!['admin', 'gerente', 'gestor', 'coordinador'].includes(session.user.role)) {
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

    const data = await prisma.hojaDeGastos.update({
      where: { id },
      data: {
        estado: 'rechazado',
        rechazadoEn,
        comentarioRechazo: payload.comentario || 'Rechazado',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al rechazar:', error)
    return NextResponse.json({ error: 'Error al rechazar' }, { status: 500 })
  }
}
