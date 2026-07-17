import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSnapshotPlan, getSnapshotPng } from '@/lib/planTrabajo/snapshotHelpers'
import { construirDataBag } from '@/lib/planTrabajo/construirDataBag'
import { renderizarPlanTrabajoDocx } from '@/lib/planTrabajo/exportDocx'
import { resolverImagenesAlcance } from '@/lib/planTrabajo/resolverImagenesAlcance'
import { generarHistogramaEquipoPng, generarHistogramaHHPng, generarHistogramaHHActividadPng } from '@/lib/planTrabajo/generarHistogramaPng'
import type { PlanHistogramas } from '@/types/planTrabajo'

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

export const maxDuration = 120

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, generacionId } = await params

  const plan = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!plan) {
    return NextResponse.json({ error: 'Plan de Trabajo no encontrado' }, { status: 404 })
  }

  const generacion = await prisma.planTrabajoGeneracion.findUnique({
    where: { id: generacionId },
    select: { planTrabajoId: true, snapshotData: true, archivoNombre: true, generadoEn: true },
  })

  if (!generacion || generacion.planTrabajoId !== plan.id) {
    return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404 })
  }

  const snapshotPlan = getSnapshotPlan(generacion.snapshotData)
  if (!snapshotPlan) {
    return NextResponse.json(
      { error: 'Esta generación fue creada con una versión anterior y no admite regeneración desde snapshot.' },
      { status: 400 }
    )
  }

  const organigramaPngBase64 = getSnapshotPng(generacion.snapshotData)

  const [proyecto, generacionesPrevias, tdr, imagenesAlcance] = await Promise.all([
    prisma.proyecto.findUnique({ where: { id: proyectoId }, include: { cliente: true } }),
    prisma.planTrabajoGeneracion.findMany({
      where: { planTrabajoId: plan.id, generadoEn: { lte: generacion.generadoEn } },
      select: { numeroRevision: true, generadoEn: true, snapshotData: true },
      orderBy: { generadoEn: 'asc' },
    }),
    prisma.proyectoTdrAnalisis.findUnique({
      where: { proyectoId },
      select: { ubicacionDetectada: true },
    }),
    // Las imágenes no forman parte del snapshot versionado — se usan las
    // vigentes actualmente para este plan (mismo criterio que el organigrama
    // no tiene, ya que ese sí viene guardado en el snapshot).
    prisma.planTrabajoImagen.findMany({
      where: { planTrabajoId: plan.id },
      orderBy: { orden: 'asc' },
    }),
  ])
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const histogramas = (snapshotPlan.histogramas as PlanHistogramas | null) ?? { meses: [], equipoTrabajo: [], horasHombre: [] }
  const [imagenesResueltas, histogramaEquipoPng, histogramaHHPng, histogramaHHActividadPng] = await Promise.all([
    resolverImagenesAlcance(imagenesAlcance),
    generarHistogramaEquipoPng(histogramas),
    generarHistogramaHHPng(histogramas),
    generarHistogramaHHActividadPng(histogramas),
  ])

  const dataBag = construirDataBag({
    plan: snapshotPlan,
    proyecto,
    organigramaPngBase64,
    generaciones: generacionesPrevias,
    ubicacionDetectadaTdr: tdr?.ubicacionDetectada ?? null,
    imagenesAlcance,
    imagenesResueltas,
    histogramaEquipoPng,
    histogramaHHPng,
    histogramaHHActividadPng,
  })

  let docxBuffer: Buffer
  try {
    docxBuffer = await renderizarPlanTrabajoDocx({ dataBag })
  } catch (e) {
    console.error('[regenerar] Error renderizando:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al regenerar DOCX' },
      { status: 500 }
    )
  }

  const headers = new Headers()
  headers.set('Content-Type', MIME_DOCX)
  headers.set('Content-Disposition', `attachment; filename="${generacion.archivoNombre}"`)
  headers.set('Content-Length', String(docxBuffer.length))

  return new NextResponse(docxBuffer, { status: 200, headers })
}
