import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { descargarBufferDrive } from '@/lib/services/driveImageLoader'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/catalogo-imagenes/[id]/contenido
// Sirve el binario de la imagen (proxy cacheado de Drive) para el
// thumbnail/preview en el grid del catálogo y en el picker de la galería.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const imagen = await prisma.catalogoImagen.findUnique({ where: { id } })
  if (!imagen) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }

  const resultado = await descargarBufferDrive(imagen.driveFileId)
  if (!resultado) {
    return NextResponse.json({ error: 'No se pudo descargar la imagen de Drive' }, { status: 502 })
  }

  return new NextResponse(resultado.buffer, {
    status: 200,
    headers: {
      'Content-Type': resultado.mimeType,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
