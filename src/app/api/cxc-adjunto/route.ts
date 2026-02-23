import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, createFolder, getSharedDriveId } from '@/lib/services/googleDrive'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

async function getOrCreateCxCFolder(): Promise<string> {
  const parentId = getSharedDriveId()
  const folder = await createFolder({ parentId, folderName: 'CxC_Comprobantes' })
  return folder.id!
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const cuentaPorCobrarId = formData.get('cuentaPorCobrarId') as string
    const tipoArchivo = (formData.get('tipoArchivo') as string) || 'otro'

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!cuentaPorCobrarId) {
      return NextResponse.json({ error: 'cuentaPorCobrarId requerido' }, { status: 400 })
    }

    const cxc = await prisma.cuentaPorCobrar.findUnique({
      where: { id: cuentaPorCobrarId },
      select: { id: true },
    })
    if (!cxc) {
      return NextResponse.json({ error: 'Cuenta por cobrar no encontrada' }, { status: 404 })
    }

    // Upload to Google Drive
    const folderId = await getOrCreateCxCFolder()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const driveFile = await uploadFile({
      folderId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    })

    // Create CxCAdjunto record
    const adjunto = await prisma.cxCAdjunto.create({
      data: {
        cuentaPorCobrarId,
        nombreArchivo: file.name,
        urlArchivo: driveFile.webViewLink || '',
        driveFileId: driveFile.id || null,
        tipoArchivo,
        tamano: file.size || null,
        subidoPorId: (session.user as any).id,
      },
    })

    return NextResponse.json(adjunto)
  } catch (error) {
    console.error('Error al subir adjunto CxC:', error)
    return NextResponse.json({ error: 'Error al subir adjunto' }, { status: 500 })
  }
}
