import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/proyectos/[id]/plan-trabajo/alcance-imagenes/desde-biblioteca
// Adjunta una imagen del catálogo global (Bloque 4.2, Tarea 6) a un EDT/subItem
// del alcance detallado — crea un PlanTrabajoImagen que REFERENCIA el mismo
// driveFileId del catálogo, nunca duplica el archivo en Drive.
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params
  const userId = session.user.id

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { role } = session.user
  const rolesConAccesoTotal = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']
  const esGestorODirectivo =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId
  if (!rolesConAccesoTotal.includes(role) && !esGestorODirectivo) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const plan = await prisma.planTrabajo.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!plan) {
    return NextResponse.json({ error: 'El Plan de Trabajo no existe para este proyecto' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const { edtRef, subItemRef, catalogoImagenId } = (body ?? {}) as {
    edtRef?: unknown
    subItemRef?: unknown
    catalogoImagenId?: unknown
  }
  if (typeof edtRef !== 'string' || !edtRef.trim()) {
    return NextResponse.json({ error: 'Falta "edtRef"' }, { status: 400 })
  }
  if (typeof catalogoImagenId !== 'string' || !catalogoImagenId.trim()) {
    return NextResponse.json({ error: 'Falta "catalogoImagenId"' }, { status: 400 })
  }

  const catalogoImagen = await prisma.catalogoImagen.findUnique({ where: { id: catalogoImagenId } })
  if (!catalogoImagen || !catalogoImagen.activo) {
    return NextResponse.json({ error: 'Imagen de catálogo no encontrada o inactiva' }, { status: 404 })
  }

  const subItemRefFinal = typeof subItemRef === 'string' && subItemRef ? subItemRef : null

  const ultima = await prisma.planTrabajoImagen.findFirst({
    where: { planTrabajoId: plan.id, edtRef, subItemRef: subItemRefFinal },
    orderBy: { orden: 'desc' },
    select: { orden: true },
  })
  const nuevoOrden = (ultima?.orden ?? -1) + 1

  const imagen = await prisma.planTrabajoImagen.create({
    data: {
      planTrabajoId: plan.id,
      edtRef,
      subItemRef: subItemRefFinal,
      nombreArchivo: catalogoImagen.nombre,
      urlArchivo: '',
      driveFileId: catalogoImagen.driveFileId,
      tipoArchivo: null,
      tamano: null,
      caption: catalogoImagen.nombre,
      orden: nuevoOrden,
      createdById: userId,
    },
  })

  return NextResponse.json({ data: imagen }, { status: 201 })
}
