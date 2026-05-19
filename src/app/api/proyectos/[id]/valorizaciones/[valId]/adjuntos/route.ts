import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { uploadFile, getSharedDriveId } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string; valId: string }> }

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

// POST /api/proyectos/:id/valorizaciones/:valId/adjuntos
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { valId } = await params
    const val = await prisma.valorizacion.findUnique({ where: { id: valId }, select: { id: true, estado: true } })
    if (!val) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const categoria = (formData.get('categoria') as string | null) || 'otro'

    if (!file) return NextResponse.json({ error: 'Falta el campo "file"' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'El archivo supera el límite de 20 MB' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const folderId = process.env.GOOGLE_VALORIZACIONES_FOLDER_ID ?? getSharedDriveId()

    const driveFile = await uploadFile({
      folderId,
      fileName: `val-${valId}-${Date.now()}-${file.name}`,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    })

    const adjunto = await prisma.valorizacionAdjunto.create({
      data: {
        valorizacionId: valId,
        nombreArchivo: file.name,
        urlArchivo: driveFile.webViewLink ?? '',
        driveFileId: driveFile.id,
        tipoArchivo: file.type || null,
        categoria,
        tamano: file.size,
      },
    })

    return NextResponse.json(adjunto, { status: 201 })
  } catch (error) {
    console.error('[POST /adjuntos valorizacion]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
