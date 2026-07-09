import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { propuestaActividadesSchema } from '@/lib/validators/cronogramaIA'

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

/** Paso 2 — ediciones manuales del árbol de Actividades (renombrar/agregar/quitar/fusionar). Nunca llama IA. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { generacionId } = await params

  const generacion = await prisma.proyectoCronogramaGeneracionIA.findUnique({
    where: { id: generacionId },
    select: { id: true, proyectoCronogramaId: true, estado: true },
  })
  if (!generacion) {
    return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404 })
  }
  if (generacion.estado === 'aplicado') {
    return NextResponse.json({ error: 'Esta generación ya fue aplicada al cronograma y no se puede editar.' }, { status: 409 })
  }

  const validacion = await validarPermisoCronograma(generacion.proyectoCronogramaId)
  if (!validacion.ok) return validacion.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = propuestaActividadesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Propuesta de actividades inválida', detalles: parsed.error.flatten() }, { status: 400 })
  }

  const actualizado = await prisma.proyectoCronogramaGeneracionIA.update({
    where: { id: generacionId },
    data: { propuestaActividades: parsed.data },
  })

  return NextResponse.json({ generacionId: actualizado.id, propuestaActividades: actualizado.propuestaActividades })
}
