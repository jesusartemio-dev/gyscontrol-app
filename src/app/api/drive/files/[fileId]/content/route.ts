import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFileContent } from '@/lib/services/googleDrive'

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

    const { data, mimeType, fileName } = await getFileContent(fileId)

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': data.length.toString(),
      'Cache-Control': 'private, max-age=3600',
    }

    // For download requests, add disposition header
    const { searchParams } = new URL(request.url)
    if (searchParams.get('download') === 'true') {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(fileName)}"`
    } else {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(fileName)}"`
    }

    return new NextResponse(data, { headers })
  } catch (error) {
    console.error('[Drive] Error getting file content:', error)
    return NextResponse.json(
      { message: 'Error al obtener contenido' },
      { status: 500 }
    )
  }
}
