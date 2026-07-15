import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/services/googleDrive'
import { registrarRechazoImagenIA } from '@/lib/planTrabajo/rechazosImagenesIA'

type Ctx = { params: Promise<{ id: string; imagenId: string }> }

// "origen" solo admite la transición IA_AUTO -> CONFIRMADA (confirmar una
// sugerencia de IA, Bloque 4.2 sesión 4) — nunca MANUAL, que es exclusivo de
// subir/elegir de biblioteca a mano.
const patchSchema = z.object({
  caption: z.string().max(300).optional(),
  origen: z.literal('CONFIRMADA').optional(),
}).refine(data => data.caption !== undefined || data.origen !== undefined, {
  message: 'Se requiere "caption" u "origen"',
})

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
    return NextResponse.json({ error: 'Body inválido — se requiere { caption } y/o { origen: "CONFIRMADA" }' }, { status: 400 })
  }

  if (parsed.data.origen === 'CONFIRMADA' && imagen.origen !== 'IA_AUTO') {
    return NextResponse.json({ error: 'Solo una sugerencia de IA (origen IA_AUTO) puede confirmarse' }, { status: 400 })
  }

  const actualizada = await prisma.planTrabajoImagen.update({
    where: { id: imagenId },
    data: {
      ...(parsed.data.caption !== undefined ? { caption: parsed.data.caption } : {}),
      ...(parsed.data.origen !== undefined ? { origen: parsed.data.origen } : {}),
    },
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

  // Si viene del catálogo (picker manual o sugerencia de IA), el driveFileId
  // es COMPARTIDO con CatalogoImagen (y con cualquier otro PlanTrabajoImagen
  // que la referencie) — nunca se borra el archivo, solo la fila. Solo una
  // foto subida directamente (sin catalogoImagenId) es dueña exclusiva de su
  // archivo en Drive.
  if (imagen.driveFileId && !imagen.catalogoImagenId) {
    try {
      await deleteFile(imagen.driveFileId)
    } catch (e) {
      console.error('[alcance-imagenes] Error borrando archivo de Drive (no bloqueante):', e)
    }
  }

  // Rechazo explícito de una sugerencia de IA (Bloque 4.2 sesión 4) — se
  // persiste ANTES de borrar para que una regeneración posterior no la
  // vuelva a proponer.
  if (imagen.origen === 'IA_AUTO' && imagen.catalogoImagenId && imagen.tareaRef) {
    try {
      await registrarRechazoImagenIA(imagen.planTrabajoId, imagen.tareaRef, imagen.catalogoImagenId)
    } catch (e) {
      console.error('[alcance-imagenes] Error registrando rechazo de sugerencia IA (no bloqueante):', e)
    }
  }

  await prisma.planTrabajoImagen.delete({ where: { id: imagenId } })

  return NextResponse.json({ ok: true })
}
