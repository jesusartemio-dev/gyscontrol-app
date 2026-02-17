import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, createFolder, getSharedDriveId } from '@/lib/services/googleDrive'

async function getOrCreateDepositoFolder(hojaId: string): Promise<string> {
  const hoja = await prisma.hojaDeGastos.findUnique({
    where: { id: hojaId },
    include: {
      proyecto: { select: { codigo: true } },
      centroCosto: { select: { nombre: true } },
    },
  })

  const parentId = getSharedDriveId()
  const folderName = hoja?.proyecto
    ? `Depositos_${hoja.proyecto.codigo}`
    : `Depositos_${hoja?.centroCosto?.nombre || hojaId}`

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
    const hojaDeGastosId = formData.get('hojaDeGastosId') as string

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!hojaDeGastosId) {
      return NextResponse.json({ error: 'hojaDeGastosId requerido' }, { status: 400 })
    }

    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id: hojaDeGastosId } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }

    // Subir a Google Drive
    const folderId = await getOrCreateDepositoFolder(hojaDeGastosId)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const driveFile = await uploadFile({
      folderId,
      fileName: `${hoja.numero}_${file.name}`,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    })

    const adjunto = await prisma.hojaDeGastosAdjunto.create({
      data: {
        hojaDeGastosId,
        nombreArchivo: file.name,
        urlArchivo: driveFile.webViewLink || '',
        driveFileId: driveFile.id || null,
        tipoArchivo: file.type || null,
        tamano: file.size || null,
        tipo: 'constancia_deposito',
      },
    })

    return NextResponse.json(adjunto)
  } catch (error) {
    console.error('Error al subir constancia de depósito:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}
