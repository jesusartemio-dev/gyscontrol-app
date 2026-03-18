import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET — obtener un documento por ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    const documento = await prisma.ssomaDocumento.findUnique({
      where: { id },
      include: {
        expediente: {
          select: { id: true, proyectoId: true, codigoCod: true },
        },
        generadoPor: { select: { id: true, name: true } },
        aprobadoPor: { select: { id: true, name: true } },
      },
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    return NextResponse.json(documento)
  } catch (error) {
    console.error('GET /api/ssoma/documento/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT — actualizar contenido o estado de un documento
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.ssomaDocumento.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, any> = {}

    // Campos editables
    if (body.contenidoTexto !== undefined) updateData.contenidoTexto = body.contenidoTexto
    if (body.estado !== undefined) updateData.estado = body.estado
    if (body.observaciones !== undefined) updateData.observaciones = body.observaciones
    if (body.revision !== undefined) updateData.revision = body.revision
    if (body.titulo !== undefined) updateData.titulo = body.titulo

    // Archivos en Drive
    if (body.driveFileId !== undefined) updateData.driveFileId = body.driveFileId
    if (body.driveUrl !== undefined) updateData.driveUrl = body.driveUrl
    if (body.nombreArchivo !== undefined) updateData.nombreArchivo = body.nombreArchivo

    // Trazabilidad
    if (body.estado === 'enviado_cliente') {
      updateData.fechaEnvioCliente = new Date()
    }
    if (body.estado === 'aprobado_cliente' || body.estado === 'aprobado_interno') {
      updateData.aprobadoPorId = (session.user as any).id
      updateData.fechaAprobacion = new Date()
    }
    if (body.fechaVigencia !== undefined) {
      updateData.fechaVigencia = body.fechaVigencia ? new Date(body.fechaVigencia) : null
    }

    const updated = await prisma.ssomaDocumento.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/ssoma/documento/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE — eliminar un documento
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    const existing = await prisma.ssomaDocumento.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    await prisma.ssomaDocumento.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/ssoma/documento/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
