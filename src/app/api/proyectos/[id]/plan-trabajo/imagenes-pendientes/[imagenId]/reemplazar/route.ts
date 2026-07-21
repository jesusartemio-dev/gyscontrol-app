import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string; imagenId: string }> }

/**
 * POST /api/proyectos/[id]/plan-trabajo/imagenes-pendientes/[imagenId]/reemplazar
 * Confirma que una foto pendiente (marcada por completar/route.ts como
 * posible reemplazo — mismo "Figura N." que una PlanTrabajoImagen existente
 * pero con bytes distintos) SÍ reemplaza a esa foto. Actualiza la imagen
 * existente in-place (mismo EDT/Actividad/Tarea, mismo orden) y descarta la
 * pendiente.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, imagenId } = await params
  const pendiente = await prisma.planTrabajoImagenPendiente.findUnique({
    where: { id: imagenId },
    include: { planTrabajo: { select: { id: true, proyectoId: true } } },
  })
  if (!pendiente || pendiente.planTrabajo.proyectoId !== proyectoId) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }
  if (!pendiente.posibleReemplazoDeId) {
    return NextResponse.json({ error: 'Esta foto no tiene una imagen existente para reemplazar' }, { status: 400 })
  }

  const imagenExistente = await prisma.planTrabajoImagen.findUnique({ where: { id: pendiente.posibleReemplazoDeId } })
  if (!imagenExistente || imagenExistente.planTrabajoId !== pendiente.planTrabajo.id) {
    return NextResponse.json({ error: 'La imagen a reemplazar ya no existe' }, { status: 404 })
  }

  if (imagenExistente.driveFileId) {
    try {
      await deleteFile(imagenExistente.driveFileId)
    } catch (e) {
      console.error('[imagenes-pendientes/reemplazar] Error borrando la foto anterior de Drive (no bloqueante):', e)
    }
  }

  const imagen = await prisma.planTrabajoImagen.update({
    where: { id: imagenExistente.id },
    data: {
      driveFileId: pendiente.driveFileId,
      nombreArchivo: pendiente.nombreArchivo,
      tipoArchivo: pendiente.tipoArchivo,
      tamano: pendiente.tamano,
      origen: 'IMPORTADA',
    },
  })

  await prisma.planTrabajoImagenPendiente.delete({ where: { id: imagenId } })

  return NextResponse.json({ data: imagen })
}
