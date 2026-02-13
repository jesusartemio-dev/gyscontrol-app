import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, createFolder, getSharedDriveId } from '@/lib/services/googleDrive'

// Buscar o crear carpeta de comprobantes para el proyecto
async function getOrCreateComprobantesFolder(proyectoId: string): Promise<string> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { codigo: true, nombre: true },
  })

  const parentId = getSharedDriveId()
  const folderName = `Comprobantes_${proyecto?.codigo || proyectoId}`

  const folder = await createFolder({ parentId, folderName })
  return folder.id!
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const gastoLineaId = formData.get('gastoLineaId') as string

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!gastoLineaId) {
      return NextResponse.json({ error: 'gastoLineaId requerido' }, { status: 400 })
    }

    // Validar que la línea existe y la rendición está en estado editable
    const linea = await prisma.gastoLinea.findUnique({
      where: { id: gastoLineaId },
      include: { rendicionGasto: { select: { estado: true, proyectoId: true } } },
    })
    if (!linea) {
      return NextResponse.json({ error: 'Línea de gasto no encontrada' }, { status: 404 })
    }
    if (!['borrador', 'rechazado'].includes(linea.rendicionGasto.estado)) {
      return NextResponse.json({ error: 'Solo se pueden agregar adjuntos a una rendición en estado borrador o rechazado' }, { status: 400 })
    }

    // Subir a Google Drive
    const folderId = await getOrCreateComprobantesFolder(linea.rendicionGasto.proyectoId)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const driveFile = await uploadFile({
      folderId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    })

    // Guardar referencia en BD
    const adjunto = await prisma.gastoAdjunto.create({
      data: {
        gastoLineaId,
        nombreArchivo: file.name,
        urlArchivo: driveFile.webViewLink || '',
        driveFileId: driveFile.id || null,
        tipoArchivo: file.type || null,
        tamano: file.size || null,
      },
    })

    return NextResponse.json(adjunto)
  } catch (error) {
    console.error('Error al subir adjunto:', error)
    return NextResponse.json({ error: 'Error al subir adjunto' }, { status: 500 })
  }
}
