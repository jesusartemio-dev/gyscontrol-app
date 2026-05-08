import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  uploadFile,
  deleteFile,
  getFileContent,
  createFolder,
  listFiles,
  getAdminDriveId,
} from '@/lib/services/googleDrive'

const LOGOS_FOLDER_NAME = 'Logos_Clientes'

async function getOrCreateLogosFolder(): Promise<string> {
  const parentId = getAdminDriveId()

  const { files } = await listFiles({
    folderId: parentId,
    query: LOGOS_FOLDER_NAME,
    driveId: parentId,
  })

  const existing = files.find(
    f => f.name === LOGOS_FOLDER_NAME && f.mimeType === 'application/vnd.google-apps.folder'
  )
  if (existing?.id) return existing.id

  const folder = await createFolder({ parentId, folderName: LOGOS_FOLDER_NAME })
  return folder.id!
}

// GET — proxy la imagen desde Drive (usada en <img> y en el PDF)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { logoUrl: true },
    })

    if (!cliente?.logoUrl) {
      return new NextResponse(null, { status: 404 })
    }

    const { data, mimeType } = await getFileContent(cliente.logoUrl)

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('❌ Error al obtener logo:', error)
    return new NextResponse(null, { status: 500 })
  }
}

// POST — sube imagen a Drive y guarda fileId en DB
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clienteId } = await params

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, nombre: true, logoUrl: true },
    })
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 2 MB' }, { status: 400 })
    }

    // Eliminar logo anterior de Drive si existe
    if (cliente.logoUrl) {
      try { await deleteFile(cliente.logoUrl) } catch { /* ya no existe */ }
    }

    const folderId = await getOrCreateLogosFolder()
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `logo_${cliente.nombre.replace(/[^a-z0-9]/gi, '_')}.${ext}`

    const driveFile = await uploadFile({ folderId, fileName, mimeType: file.type, buffer })

    await prisma.cliente.update({
      where: { id: clienteId },
      data: { logoUrl: driveFile.id!, updatedAt: new Date() },
    })

    return NextResponse.json({ logoUrl: driveFile.id! })
  } catch (error) {
    console.error('❌ Error al subir logo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE — elimina de Drive y limpia DB
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clienteId } = await params

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, logoUrl: true },
    })
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    if (cliente.logoUrl) {
      try { await deleteFile(cliente.logoUrl) } catch { /* ya no existe */ }
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { logoUrl: null, updatedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error al eliminar logo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
