import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/services/googleDrive'
import { puedeEscribirEvidencia } from '@/lib/services/evidenciaAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id, fotoId } = await params

    const foto = await prisma.registroAvanceFoto.findUnique({
      where: { id: fotoId },
      include: {
        registro: {
          select: {
            id: true,
            evidencia: { select: { estado: true, jornada: { select: { estado: true } } } },
          },
        },
      },
    })
    if (!foto || foto.registro.id !== id) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }
    if (
      !puedeEscribirEvidencia(
        session.user.role,
        foto.registro.evidencia.jornada.estado,
        foto.registro.evidencia.estado,
      )
    ) {
      return NextResponse.json(
        { error: 'No se puede eliminar: la evidencia o jornada está cerrada' },
        { status: 403 },
      )
    }

    if (foto.driveFileId) {
      try {
        await deleteFile(foto.driveFileId)
      } catch (err) {
        console.warn('No se pudo eliminar el archivo en Drive (se elimina la fila igualmente):', err)
      }
    }

    await prisma.registroAvanceFoto.delete({ where: { id: fotoId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar foto:', error)
    return NextResponse.json({ error: 'Error al eliminar foto' }, { status: 500 })
  }
}
