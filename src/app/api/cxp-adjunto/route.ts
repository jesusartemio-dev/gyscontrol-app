import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, createFolder, getSharedDriveId } from '@/lib/services/googleDrive'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

async function getOrCreateCxPFolder(): Promise<string> {
  const parentId = getSharedDriveId()
  const folder = await createFolder({ parentId, folderName: 'CxP_Comprobantes' })
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
    const cuentaPorPagarId = formData.get('cuentaPorPagarId') as string
    const tipoArchivo = (formData.get('tipoArchivo') as string) || 'otro'

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!cuentaPorPagarId) {
      return NextResponse.json({ error: 'cuentaPorPagarId requerido' }, { status: 400 })
    }

    const cxp = await prisma.cuentaPorPagar.findUnique({
      where: { id: cuentaPorPagarId },
      select: { id: true, estado: true, tipoOrigen: true },
    })
    if (!cxp) {
      return NextResponse.json({ error: 'Cuenta por pagar no encontrada' }, { status: 404 })
    }

    // Upload to Google Drive
    const folderId = await getOrCreateCxPFolder()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const driveFile = await uploadFile({
      folderId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    })

    // Create CxPAdjunto record
    const adjunto = await prisma.cxPAdjunto.create({
      data: {
        cuentaPorPagarId,
        nombreArchivo: file.name,
        urlArchivo: driveFile.webViewLink || '',
        driveFileId: driveFile.id || null,
        tipoArchivo,
        tamano: file.size || null,
        subidoPorId: (session.user as any).id,
      },
    })

    // Auto-transition: pendiente_documentos → pendiente when factura/transferencia uploaded
    if (cxp.estado === 'pendiente_documentos' && ['factura', 'transferencia'].includes(tipoArchivo)) {
      await prisma.cuentaPorPagar.update({
        where: { id: cuentaPorPagarId },
        data: { estado: 'pendiente', updatedAt: new Date() },
      })
    }

    return NextResponse.json(adjunto)
  } catch (error) {
    console.error('Error al subir adjunto CxP:', error)
    return NextResponse.json({ error: 'Error al subir adjunto' }, { status: 500 })
  }
}
