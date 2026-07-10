import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

/** Botón "Restablecer" del wizard — descarta el borrador en BD (no destructivo, queda auditable) para volver a la precarga desde cero. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { generacionId } = await params

  const generacion = await prisma.proyectoCronogramaGeneracionIA.findUnique({
    where: { id: generacionId },
    select: { id: true, proyectoCronogramaId: true, estado: true },
  })
  if (!generacion) {
    return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404 })
  }
  if (generacion.estado === 'aplicado') {
    return NextResponse.json({ error: 'Esta generación ya fue aplicada al cronograma y no se puede descartar.' }, { status: 409 })
  }

  const validacion = await validarPermisoCronograma(generacion.proyectoCronogramaId)
  if (!validacion.ok) return validacion.response

  await prisma.proyectoCronogramaGeneracionIA.update({
    where: { id: generacionId },
    data: { estado: 'descartado' },
  })

  return NextResponse.json({ ok: true })
}
