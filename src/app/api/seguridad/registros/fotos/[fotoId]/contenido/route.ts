import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { descargarBufferDrive } from '@/lib/services/driveImageLoader'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']

function puedeVer(role: string, ingenieroId: string, userId: string): boolean {
  if (role === 'admin' || role === 'gerente') return true
  return role === 'seguridad' && ingenieroId === userId
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fotoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { fotoId } = await params

    const foto = await prisma.registroSeguridadFoto.findUnique({
      where: { id: fotoId },
      include: { registro: { select: { ingenieroId: true } } },
    })
    if (!foto) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }
    if (!puedeVer(session.user.role, foto.registro.ingenieroId, session.user.id)) {
      return NextResponse.json({ error: 'Sin permisos para ver esta foto' }, { status: 403 })
    }
    if (!foto.driveFileId) {
      return NextResponse.json({ error: 'Foto sin driveFileId' }, { status: 404 })
    }

    const resultado = await descargarBufferDrive(foto.driveFileId)
    if (!resultado) {
      return NextResponse.json({ error: 'No se pudo descargar la imagen' }, { status: 502 })
    }

    return new NextResponse(new Uint8Array(resultado.buffer), {
      headers: {
        'Content-Type': foto.tipoArchivo ?? resultado.mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error al servir foto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
