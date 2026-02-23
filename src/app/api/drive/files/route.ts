import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listFiles, uploadFile, getSharedDriveId, getAllowedDriveIds } from '@/lib/services/googleDrive'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driveId = searchParams.get('driveId') || undefined
    const folderId = searchParams.get('folderId') || driveId || getSharedDriveId()
    const query = searchParams.get('query') || undefined
    const pageToken = searchParams.get('pageToken') || undefined
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    // Validar que el driveId es un drive permitido
    if (driveId) {
      const allowed = getAllowedDriveIds()
      if (!allowed.includes(driveId)) {
        return NextResponse.json({ message: 'Drive no permitido' }, { status: 403 })
      }
    }

    const result = await listFiles({
      folderId,
      query,
      pageSize,
      pageToken,
      driveId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Drive] Error listing files:', error)
    return NextResponse.json(
      { message: 'Error al listar archivos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string

    if (!file) {
      return NextResponse.json({ message: 'Archivo requerido' }, { status: 400 })
    }

    if (!folderId) {
      return NextResponse.json({ message: 'folderId requerido' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await uploadFile({
      folderId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Drive] Error uploading file:', error)
    return NextResponse.json(
      { message: 'Error al subir archivo' },
      { status: 500 }
    )
  }
}
