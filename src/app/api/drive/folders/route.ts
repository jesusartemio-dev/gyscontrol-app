import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createFolder } from '@/lib/services/googleDrive'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { parentId, name } = body

    if (!parentId || !name) {
      return NextResponse.json(
        { message: 'parentId y name son requeridos' },
        { status: 400 }
      )
    }

    const folder = await createFolder({
      parentId,
      folderName: name,
    })

    return NextResponse.json(folder)
  } catch (error) {
    console.error('[Drive] Error creating folder:', error)
    return NextResponse.json(
      { message: 'Error al crear carpeta' },
      { status: 500 }
    )
  }
}
