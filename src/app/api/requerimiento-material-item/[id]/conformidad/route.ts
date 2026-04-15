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

    const item = await prisma.requerimientoMaterialItem.findUnique({
      where: { id },
      include: { hojaDeGastos: { select: { estado: true } } },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    if (item.hojaDeGastos.estado !== 'rendido') {
      return NextResponse.json({ error: 'Solo se puede marcar conformidad en estado rendido' }, { status: 400 })
    }

    const updated = await prisma.requerimientoMaterialItem.update({
      where: { id },
      data: {
        conformidad,
        comentarioConformidad: conformidad === 'observado' ? comentario!.trim() : null,
        conformadoEn: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al marcar conformidad de item:', error)
    return NextResponse.json({ error: 'Error al marcar conformidad' }, { status: 500 })
  }
}
