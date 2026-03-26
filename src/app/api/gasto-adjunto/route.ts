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
    const gastoLineaId = formData.get('gastoLineaId') as string | null
    const gastoComprobanteId = formData.get('gastoComprobanteId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!gastoLineaId && !gastoComprobanteId) {
      return NextResponse.json({ error: 'gastoLineaId o gastoComprobanteId requerido' }, { status: 400 })
    }

    // Resolver hojaId desde cualquiera de los dos orígenes
    let hojaId: string
    if (gastoComprobanteId) {
      const comprobante = await prisma.gastoComprobante.findUnique({
        where: { id: gastoComprobanteId },
        include: { hojaDeGastos: { select: { id: true, estado: true } } },
      })
      if (!comprobante) {
        return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
      }
      if (!['borrador', 'rechazado', 'aprobado', 'depositado', 'rendido'].includes(comprobante.hojaDeGastos.estado)) {
        return NextResponse.json({ error: 'No se pueden agregar adjuntos en este estado' }, { status: 400 })
      }
      hojaId = comprobante.hojaDeGastos.id
    } else {
      const linea = await prisma.gastoLinea.findUnique({
        where: { id: gastoLineaId! },
        include: { hojaDeGastos: { select: { id: true, estado: true } } },
      })
      if (!linea) {
        return NextResponse.json({ error: 'Línea de gasto no encontrada' }, { status: 404 })
      }
      if (!['borrador', 'rechazado', 'aprobado', 'depositado'].includes(linea.hojaDeGastos.estado)) {
        return NextResponse.json({ error: 'No se pueden agregar adjuntos en este estado' }, { status: 400 })
      }
      hojaId = linea.hojaDeGastos.id
    }

    // Subir a Google Drive
    const folderId = await getOrCreateComprobantesFolder(hojaId)
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
        gastoLineaId: gastoLineaId || null,
        gastoComprobanteId: gastoComprobanteId || null,
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
