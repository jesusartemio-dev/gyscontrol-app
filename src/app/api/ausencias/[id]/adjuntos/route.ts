import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { uploadFile, getSharedDriveId } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string }> }

const ESTADOS_PERMITIDOS_ADJUNTO = ['borrador', 'pendiente'] as const

// GET /api/ausencias/:id/adjuntos
export async function GET(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      select: { solicitanteId: true, aprobador1Id: true, aprobador2Id: true },
    })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const role = (session.user as any).role as string
    const esAdmin = ['admin', 'administracion'].includes(role)
    const tieneAcceso =
      esAdmin ||
      solicitud.solicitanteId === session.user.id ||
      solicitud.aprobador1Id === session.user.id ||
      solicitud.aprobador2Id === session.user.id

    if (!tieneAcceso) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const adjuntos = await prisma.solicitudAusenciaAdjunto.findMany({
      where: { solicitudAusenciaId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(adjuntos)
  } catch (error) {
    console.error('[GET /api/ausencias/:id/adjuntos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/ausencias/:id/adjuntos — multipart upload
// Permitido en borrador y pendiente; solo el solicitante puede subir.
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      select: { solicitanteId: true, estado: true },
    })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.solicitanteId !== session.user.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    if (
      !ESTADOS_PERMITIDOS_ADJUNTO.includes(
        solicitud.estado as (typeof ESTADOS_PERMITIDOS_ADJUNTO)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: `Solo se pueden adjuntar archivos en estado borrador o pendiente (estado actual: ${solicitud.estado})`,
        },
        { status: 422 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Falta el campo "file" en el formulario' }, { status: 400 })
    }

    // Limit: 20 MB
    const MAX_BYTES = 20 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'El archivo supera el límite de 20 MB' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Use shared drive folder for ausencias documents.
    // GOOGLE_AUSENCIAS_FOLDER_ID must be set in env; falls back to shared drive root.
    const folderId =
      process.env.GOOGLE_AUSENCIAS_FOLDER_ID ?? getSharedDriveId()

    const driveFile = await uploadFile({
      folderId,
      fileName: `ausencia-${id}-${Date.now()}-${file.name}`,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    })

    const adjunto = await prisma.solicitudAusenciaAdjunto.create({
      data: {
        solicitudAusenciaId: id,
        nombreArchivo: file.name,
        urlArchivo: driveFile.webViewLink ?? '',
        driveFileId: driveFile.id,
        tipoArchivo: file.type || null,
        tamano: file.size,
      },
    })

    return NextResponse.json(adjunto, { status: 201 })
  } catch (error) {
    console.error('[POST /api/ausencias/:id/adjuntos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
