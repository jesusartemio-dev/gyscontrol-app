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
      return NextResponse.json({ error: 'Sin permisos para marcar conformidad' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { conformidad, comentario } = body as {
      conformidad: 'conforme' | 'observado'
      comentario?: string
    }

    if (!['conforme', 'observado'].includes(conformidad)) {
      return NextResponse.json({ error: 'Valor de conformidad inválido' }, { status: 400 })
    }

    if (conformidad === 'observado' && !comentario?.trim()) {
      return NextResponse.json({ error: 'Debe indicar un comentario para observar' }, { status: 400 })
    }

    // Verify the line exists and its parent hoja is in 'rendido' state
    const linea = await prisma.gastoLinea.findUnique({
      where: { id },
      include: { hojaDeGastos: { select: { estado: true } } },
    })

    if (!linea) {
      return NextResponse.json({ error: 'Línea de gasto no encontrada' }, { status: 404 })
    }

    if (linea.hojaDeGastos.estado !== 'rendido') {
      return NextResponse.json({ error: 'Solo se puede marcar conformidad en estado rendido' }, { status: 400 })
    }

    const updated = await prisma.gastoLinea.update({
      where: { id },
      data: {
        conformidad,
        comentarioConformidad: conformidad === 'observado' ? comentario!.trim() : null,
        conformadoEn: new Date(),
        updatedAt: new Date(),
      },
      include: {
        categoriaGasto: true,
        adjuntos: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al marcar conformidad:', error)
    return NextResponse.json({ error: 'Error al marcar conformidad' }, { status: 500 })
  }
}
