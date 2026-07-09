import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string; imagenId: string }> }

const patchSchema = z.object({ caption: z.string().max(300) })

async function cargarImagenDelProyecto(proyectoId: string, imagenId: string) {
  const imagen = await prisma.planTrabajoImagen.findUnique({
    where: { id: imagenId },
    include: { planTrabajo: { select: { proyectoId: true } } },
  })
  if (!imagen || imagen.planTrabajo.proyectoId !== proyectoId) return null
  return imagen
}

// PATCH /api/proyectos/[id]/plan-trabajo/alcance-imagenes/[imagenId] — editar caption
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, imagenId } = await params
  const imagen = await cargarImagenDelProyecto(proyectoId, imagenId)
  if (!imagen) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body inválido — se requiere { caption }' }, { status: 400 })
  }

  const actualizada = await prisma.planTrabajoImagen.update({
    where: { id: imagenId },
    data: { caption: parsed.data.caption },
  })

  return NextResponse.json({ data: actualizada })
}

// DELETE /api/proyectos/[id]/plan-trabajo/alcance-imagenes/[imagenId]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, imagenId } = await params
  const imagen = await cargarImagenDelProyecto(proyectoId, imagenId)
  if (!imagen) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }

  if (imagen.driveFileId) {
    try {
      await deleteFile(imagen.driveFileId)
    } catch (e) {
      console.error('[alcance-imagenes] Error borrando archivo de Drive (no bloqueante):', e)
    }
  }

  await prisma.planTrabajoImagen.delete({ where: { id: imagenId } })

  return NextResponse.json({ ok: true })
}
