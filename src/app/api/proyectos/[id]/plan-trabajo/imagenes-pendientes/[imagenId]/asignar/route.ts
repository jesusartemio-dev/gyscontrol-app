import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string; imagenId: string }> }

/**
 * POST /api/proyectos/[id]/plan-trabajo/imagenes-pendientes/[imagenId]/asignar
 * Promueve una foto pendiente (encontrada en un Word importado, sin
 * "Figura N." reconocible) a una PlanTrabajoImagen real, asignada a mano
 * por el usuario a un EDT/Actividad/Tarea concreto. Mismo driveFileId — no
 * se vuelve a subir el archivo.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
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

  const body = await req.json().catch(() => null)
  const edtRef = typeof body?.edtRef === 'string' ? body.edtRef : ''
  const subItemRefRaw = typeof body?.subItemRef === 'string' ? body.subItemRef : null
  const tareaRefRaw = typeof body?.tareaRef === 'string' ? body.tareaRef : null

  if (!edtRef) {
    return NextResponse.json({ error: 'Falta "edtRef"' }, { status: 400 })
  }
  // Exactamente un nivel: si viene tareaRef, subItemRef siempre queda null (mismo criterio que alcance-imagenes).
  const tareaRef = tareaRefRaw || null
  const subItemRef = !tareaRef && subItemRefRaw ? subItemRefRaw : null

  const ultima = await prisma.planTrabajoImagen.findFirst({
    where: { planTrabajoId: pendiente.planTrabajo.id, edtRef, subItemRef, tareaRef },
    orderBy: { orden: 'desc' },
    select: { orden: true },
  })
  const nuevoOrden = (ultima?.orden ?? -1) + 1

  const imagen = await prisma.planTrabajoImagen.create({
    data: {
      planTrabajoId: pendiente.planTrabajo.id,
      edtRef,
      subItemRef,
      tareaRef,
      nombreArchivo: pendiente.nombreArchivo,
      urlArchivo: '',
      driveFileId: pendiente.driveFileId,
      tipoArchivo: pendiente.tipoArchivo,
      tamano: pendiente.tamano,
      caption: '',
      orden: nuevoOrden,
      origen: 'IMPORTADA',
      createdById: session.user.id,
    },
  })

  await prisma.planTrabajoImagenPendiente.delete({ where: { id: imagenId } })

  return NextResponse.json({ data: imagen }, { status: 201 })
}
