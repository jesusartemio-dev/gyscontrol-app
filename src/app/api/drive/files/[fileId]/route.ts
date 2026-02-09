import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFile } from '@/lib/services/googleDrive'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
    }

    const { fileId } = await params

    const file = await getFile(fileId)
    return NextResponse.json(file)
  } catch (error) {
    console.error('[Drive] Error getting file:', error)
    return NextResponse.json(
      { message: 'Error al obtener archivo' },
      { status: 500 }
    )
  }
}
