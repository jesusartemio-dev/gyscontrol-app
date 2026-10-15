// POST /api/proyectos/[id]/cronograma/sincronizar
//
// Actualiza un cronograma con lo que vuelve de MS Project (XML o Excel ya
// leídos en el navegador como filas). Cada elemento se reconoce por su GYS ID
// y solo se cambia lo que cambió: se conservan horas registradas, avance,
// responsables y catálogo.
//   { cronogramaId, filas }                        → vista previa (no escribe)
//   { cronogramaId, filas, aplicar: true, eliminar } → aplica

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { aplicarSincronizacion, calcularPlanSincronizacion } from '@/lib/cronogramaSync/sincronizar'
import type { FilaImportada } from '@/lib/cronogramaSync/leerArchivoMsProject'

const filaSchema = z.object({
  fila: z.number(),
  gysId: z.string().nullable(),
  nombre: z.string(),
  nivel: z.number(),
  esResumen: z.boolean(),
  inicio: z.string().nullable(),
  fin: z.string().nullable(),
  esHito: z.boolean(),
  fechaLimite: z.string().nullable(),
  trabajoHoras: z.number().nullable(),
  notas: z.string().nullable(),
  recursoNombre: z.string().nullable(),
  predecesoras: z.array(z.object({
    fila: z.number(),
    tipo: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']),
    lagMinutos: z.number(),
  })),
})

const schema = z.object({
  cronogramaId: z.string().min(1),
  filas: z.array(filaSchema).max(5000),
  aplicar: z.boolean().optional(),
  eliminar: z.array(z.string()).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Archivo no válido', detalles: parsed.error.issues.slice(0, 5) }, { status: 400 })
  const { cronogramaId, filas, aplicar, eliminar } = parsed.data

  const cronograma = await prisma.proyectoCronograma.findFirst({ where: { id: cronogramaId, proyectoId: id }, select: { id: true } })
  if (!cronograma) return NextResponse.json({ error: 'Cronograma no encontrado en este proyecto' }, { status: 404 })
  // Rol, cronograma no comercial y no bloqueado.
  const permiso = await validarPermisoCronograma(cronogramaId)
  if (!permiso.ok) return permiso.response

  try {
    if (!aplicar) {
      const plan = await calcularPlanSincronizacion(cronogramaId, filas as FilaImportada[])
      return NextResponse.json({ plan })
    }
    const resultado = await aplicarSincronizacion(cronogramaId, filas as FilaImportada[], eliminar ?? [])
    return NextResponse.json({ resultado })
  } catch (error) {
    logger.error('[sincronizar] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo sincronizar' }, { status: 400 })
  }
}
