import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/services/googleDrive'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']

function puedeEditar(role: string, ingenieroId: string, userId: string): boolean {
  if (role === 'admin' || role === 'gerente') return true
  if (role === 'seguridad' && ingenieroId === userId) return true
  return false
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id, fotoId } = await params

    const foto = await prisma.registroSeguridadFoto.findUnique({
      where: { id: fotoId },
      include: { registro: { select: { id: true, ingenieroId: true } } },
    })
    if (!foto || foto.registro.id !== id) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }
    if (!puedeEditar(session.user.role, foto.registro.ingenieroId, session.user.id)) {
      return NextResponse.json({ error: 'Solo puedes eliminar fotos de tus propios registros' }, { status: 403 })
    }

    if (foto.driveFileId) {
      try {
        await deleteFile(foto.driveFileId)
      } catch (err) {
        console.warn('No se pudo eliminar el archivo en Drive (se elimina la fila igualmente):', err)
      }
    }

    await prisma.registroSeguridadFoto.delete({ where: { id: fotoId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar foto:', error)
    return NextResponse.json({ error: 'Error al eliminar foto' }, { status: 500 })
  }
}
