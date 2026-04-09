import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFileContent } from '@/lib/services/googleDrive'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const adjunto = await prisma.gastoAdjunto.findUnique({ where: { id } })
    if (!adjunto) {
      return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
    }
    if (!adjunto.driveFileId) {
      return NextResponse.json({ error: 'Sin archivo en Drive' }, { status: 404 })
    }

    const { data, mimeType, fileName } = await getFileContent(adjunto.driveFileId)

    return new Response(data, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error al servir adjunto:', error)
    return NextResponse.json({ error: 'Error al obtener archivo' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.gastoAdjunto.findUnique({
      where: { id },
      include: {
        gastoLinea: {
          include: { hojaDeGastos: { select: { estado: true } } },
        },
        gastoComprobante: {
          include: { hojaDeGastos: { select: { estado: true } } },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
    }

    const hojaEstado =
      existing.gastoLinea?.hojaDeGastos?.estado ??
      existing.gastoComprobante?.hojaDeGastos?.estado

    if (!hojaEstado || !['borrador', 'rechazado', 'aprobado', 'depositado'].includes(hojaEstado)) {
      return NextResponse.json({ error: 'No se pueden eliminar adjuntos en este estado' }, { status: 400 })
    }

    await prisma.gastoAdjunto.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar adjunto:', error)
    return NextResponse.json({ error: 'Error al eliminar adjunto' }, { status: 500 })
  }
}
