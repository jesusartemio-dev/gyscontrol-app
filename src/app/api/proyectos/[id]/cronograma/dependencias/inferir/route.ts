// POST /api/proyectos/[id]/cronograma/dependencias/inferir
// "Generar dependencias desde las fechas" para una fase, EDT o actividad.
//   { nodeId: "fase-…" | "edt-…" | "actividad-…" }              → vista previa
//   { nodeId, aplicar: true, claves: ["origenId>dependienteId"] } → crea las elegidas
// Se recalcula al aplicar (no se confía en la vista previa del cliente).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { obtenerCalendarioProyecto } from '@/lib/services/cronogramaDesplazamiento'
import { inferirDependencias } from '@/lib/services/cronogramaInferirDependencias'

const schema = z.object({
  nodeId: z.string().regex(/^(fase|edt|actividad)-.+/),
  aplicar: z.boolean().optional(),
  claves: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const { nodeId, aplicar, claves } = schema.parse(await request.json())
    const [, tipo, realId] = /^(fase|edt|actividad)-(.+)$/.exec(nodeId)!

    // Cronograma del nodo (y que sea de este proyecto)
    const nodo =
      tipo === 'fase' ? await prisma.proyectoFase.findUnique({ where: { id: realId }, select: { proyectoId: true, proyectoCronogramaId: true } })
      : tipo === 'edt' ? await prisma.proyectoEdt.findUnique({ where: { id: realId }, select: { proyectoId: true, proyectoCronogramaId: true } })
      : await prisma.proyectoActividad.findUnique({ where: { id: realId }, select: { proyectoCronogramaId: true, proyectoEdt: { select: { proyectoId: true } } } })
    const nodoProyectoId = nodo && ('proyectoId' in nodo ? nodo.proyectoId : nodo.proyectoEdt.proyectoId)
    if (!nodo || nodoProyectoId !== proyectoId) {
      return NextResponse.json({ error: 'Elemento no encontrado en este proyecto' }, { status: 404 })
    }

    const cal = await obtenerCalendarioProyecto(proyectoId)
    const resultado = await inferirDependencias(cal, nodo.proyectoCronogramaId, { tipo: tipo as 'fase' | 'edt' | 'actividad', id: realId })
    if (!aplicar) return NextResponse.json({ success: true, data: resultado })

    const permiso = await validarPermisoCronograma(nodo.proyectoCronogramaId)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(nodo.proyectoCronogramaId)) return cronogramaBloqueadoResponse()

    const elegidas = new Set(claves ?? [])
    const crear = resultado.propuestas.filter((p) => elegidas.has(p.clave))
    const creadas = await prisma.proyectoDependenciasTarea.createMany({
      data: crear.map((p) => ({
        id: crypto.randomUUID(),
        tareaOrigenId: p.origenId,
        tareaDependienteId: p.dependienteId,
        tipo: p.tipo,
        lagMinutos: p.lagMinutos,
      })),
      skipDuplicates: true,
    })
    logger.info(`✅ [INFERIR DEPENDENCIAS] ${nodeId}: ${creadas.count} creadas`)
    return NextResponse.json({ success: true, data: { creadas: creadas.count } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    logger.error('❌ Error generando dependencias:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
