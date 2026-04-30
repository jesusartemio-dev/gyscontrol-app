import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  recalcularValorizacionPorId,
  recalcularValorizacionesPosteriores,
} from '@/lib/utils/valorizacionAcumulado'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

// DELETE /api/proyectos/[id]/valorizaciones/[valId]/partidas/[partidaId]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; valId: string; partidaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: proyectoId, valId, partidaId } = await params

    const valorizacion = await prisma.valorizacion.findUnique({
      where: { id: valId },
    })
    if (!valorizacion || valorizacion.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    if (valorizacion.estado !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar partidas de valorizaciones en estado borrador' },
        { status: 400 }
      )
    }

    // Verificar que la partida existe
    const partida = await prisma.partidaValorizacion.findUnique({
      where: { id: partidaId },
    })
    if (!partida || partida.valorizacionId !== valId) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.partidaValorizacion.delete({
        where: { id: partidaId },
      })

      const valActualizada = await recalcularValorizacionPorId(tx, valId)

      return {
        ok: true,
        montoValorizacion: valActualizada?.montoValorizacion ?? 0,
        valNumero: valActualizada?.numero ?? 0,
      }
    })

    if (result.valNumero > 0) {
      await recalcularValorizacionesPosteriores(prisma, proyectoId, result.valNumero)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al eliminar partida de valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
