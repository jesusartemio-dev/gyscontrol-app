// /api/proyectos/[id]/cronograma/traer-linea-base
//
// Lleva al cronograma de ejecución lo agregado o cambiado en la línea base
// después de crearlo, sin borrar ni recrear nada (ver lib/cronogramaLineaBase).
//   GET                    → diferencias (no escribe)
//   POST { seleccion }     → aplica las claves marcadas

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { aplicarCambiosLineaBase, calcularCambiosLineaBase } from '@/lib/cronogramaLineaBase/traerCambios'

async function permiso(proyectoId: string) {
  const ejecucion = await prisma.proyectoCronograma.findFirst({ where: { proyectoId, tipo: 'ejecucion' }, select: { id: true } })
  if (!ejecucion) return { ok: false as const, response: NextResponse.json({ error: 'El proyecto no tiene cronograma de ejecución' }, { status: 404 }) }
  // Rol y cronograma de ejecución no bloqueado.
  return validarPermisoCronograma(ejecucion.id)
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await permiso(id)
  if (!p.ok) return p.response
  try {
    return NextResponse.json({ cambios: await calcularCambiosLineaBase(id) })
  } catch (error) {
    logger.error('[traer-linea-base] Error al comparar:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo comparar' }, { status: 400 })
  }
}

const schema = z.object({ seleccion: z.array(z.string()).max(5000) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await permiso(id)
  if (!p.ok) return p.response
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 })
  try {
    return NextResponse.json({ resultado: await aplicarCambiosLineaBase(id, parsed.data.seleccion) })
  } catch (error) {
    logger.error('[traer-linea-base] Error al aplicar:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo aplicar' }, { status: 400 })
  }
}
