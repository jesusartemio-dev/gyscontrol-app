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
      return NextResponse.json({ error: 'Sin permisos para aprobar' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'enviado') {
      return NextResponse.json({ error: 'Solo se puede aprobar desde estado enviado' }, { status: 400 })
    }

    const data = await prisma.hojaDeGastos.update({
      where: { id },
      data: {
        estado: 'aprobado',
        aprobadorId: session.user.id,
        fechaAprobacion: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al aprobar hoja de gastos:', error)
    return NextResponse.json({ error: 'Error al aprobar' }, { status: 500 })
  }
}
