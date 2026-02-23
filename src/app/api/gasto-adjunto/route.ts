import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, createFolder, getAdminDriveId } from '@/lib/services/googleDrive'

// Buscar o crear carpeta de comprobantes
async function getOrCreateComprobantesFolder(hojaId: string): Promise<string> {
  const hoja = await prisma.hojaDeGastos.findUnique({
    where: { id: hojaId },
    include: {
      proyecto: { select: { codigo: true } },
      centroCosto: { select: { nombre: true } },
    },
  })

  const parentId = getAdminDriveId()
  const folderName = hoja?.proyecto
    ? `Comprobantes_${hoja.proyecto.codigo}`
    : `Comprobantes_${hoja?.centroCosto?.nombre || hojaId}`

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

    // Validar que la línea existe y la hoja está en estado editable
    const linea = await prisma.gastoLinea.findUnique({
      where: { id: gastoLineaId },
      include: { hojaDeGastos: { select: { id: true, estado: true } } },
    })
    if (!linea) {
      return NextResponse.json({ error: 'Línea de gasto no encontrada' }, { status: 404 })
    }
    if (!['borrador', 'rechazado', 'aprobado', 'depositado'].includes(linea.hojaDeGastos.estado)) {
      return NextResponse.json({ error: 'No se pueden agregar adjuntos en este estado' }, { status: 400 })
    }

    // Subir a Google Drive
    const folderId = await getOrCreateComprobantesFolder(linea.hojaDeGastos.id)
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
