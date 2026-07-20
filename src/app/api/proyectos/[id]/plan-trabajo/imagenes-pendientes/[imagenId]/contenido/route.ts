import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { descargarBufferDrive } from '@/lib/services/driveImageLoader'

type Ctx = { params: Promise<{ id: string; imagenId: string }> }

// GET /api/proyectos/[id]/plan-trabajo/imagenes-pendientes/[imagenId]/contenido
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, imagenId } = await params
  const imagen = await prisma.planTrabajoImagenPendiente.findUnique({
    where: { id: imagenId },
    include: { planTrabajo: { select: { proyectoId: true } } },
  })
  if (!imagen || imagen.planTrabajo.proyectoId !== proyectoId) {
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
