import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirDataBag } from '@/lib/planTrabajo/construirDataBag'
import { renderizarPlanTrabajoDocx } from '@/lib/planTrabajo/exportDocx'
import { validarParaExportar } from '@/lib/planTrabajo/validarParaExportar'
import { resolverImagenesAlcance } from '@/lib/planTrabajo/resolverImagenesAlcance'
import { generarHistogramaEquipoPng, generarHistogramaHHPng, generarHistogramaHHActividadPng } from '@/lib/planTrabajo/generarHistogramaPng'
import { uploadFile } from '@/lib/services/googleDrive'
import { getOrCreatePlanTrabajoFolder } from '@/lib/planTrabajo/getOrCreatePlanTrabajoFolder'
import type { PlanHistogramas } from '@/types/planTrabajo'

export const maxDuration = 120

type Ctx = { params: Promise<{ id: string }> }

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  // Body: { organigramaPngBase64: string }
  let organigramaPngBase64 = ''
  try {
    const body = await req.json()
    if (typeof body.organigramaPngBase64 === 'string') {
      organigramaPngBase64 = body.organigramaPngBase64
    }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  // Cargar plan + proyecto + cliente
  const planDb = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
  })
  if (!planDb) {
    return NextResponse.json({ error: 'Plan de Trabajo no existe para este proyecto' }, { status: 404 })
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: { cliente: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  // Validar cabecera mínima antes de renderizar
  const validacion = validarParaExportar({ plan: planDb, proyecto })
  if (!validacion.ok) {
    return NextResponse.json(
      { error: 'El plan no está listo para exportar.', errores: validacion.errores, advertencias: validacion.advertencias },
      { status: 422 }
    )
  }

  // Respetar toggle incluirOrganigrama
  const pngParaDocx = planDb.incluirOrganigrama !== false ? organigramaPngBase64 : ''

  const [generaciones, tdr, imagenesAlcance] = await Promise.all([
    prisma.planTrabajoGeneracion.findMany({
      where: { planTrabajoId: planDb.id },
      select: { numeroRevision: true, generadoEn: true, snapshotData: true },
      orderBy: { generadoEn: 'asc' },
    }),
    prisma.proyectoTdrAnalisis.findUnique({
      where: { proyectoId },
      select: { ubicacionDetectada: true },
    }),
    prisma.planTrabajoImagen.findMany({
      where: { planTrabajoId: planDb.id },
      orderBy: { orden: 'asc' },
    }),
  ])

  // Resolver imágenes de Drive a base64+dimensiones ANTES del render (Tarea 4
  // — docxtemplater-image-module-free exige getImage/getSize síncronos).
  const histogramas = (planDb.histogramas as PlanHistogramas | null) ?? { meses: [], equipoTrabajo: [], horasHombre: [] }
  const [imagenesResueltas, histogramaEquipoPng, histogramaHHPng, histogramaHHActividadPng] = await Promise.all([
    resolverImagenesAlcance(imagenesAlcance),
    generarHistogramaEquipoPng(histogramas),
    generarHistogramaHHPng(histogramas),
    generarHistogramaHHActividadPng(histogramas),
  ])

  // Construir dataBag
  const dataBag = construirDataBag({
    plan: planDb,
    proyecto,
    organigramaPngBase64: pngParaDocx,
    generaciones,
    ubicacionDetectadaTdr: tdr?.ubicacionDetectada ?? null,
    imagenesAlcance,
    imagenesResueltas,
    histogramaEquipoPng,
    histogramaHHPng,
    histogramaHHActividadPng,
  })

  // Renderizar DOCX
  let docxBuffer: Buffer
  try {
    docxBuffer = await renderizarPlanTrabajoDocx({ dataBag })
  } catch (e) {
    console.error('[exportar-docx] Error renderizando:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al generar DOCX' },
      { status: 500 }
    )
  }

  const archivoNombre = `PT_${proyecto.codigo}_Rev${planDb.numeroRevision}.docx`

  // Subir a Drive (soft fail — si falla, igual devolvemos el buffer)
  let driveFileId: string | null = null
  let webViewLink: string | null = null
  let driveFolderId: string | null = null
  let driveErrorMsg: string | null = null

  try {
    driveFolderId = await getOrCreatePlanTrabajoFolder(proyecto.codigo)

    const driveFile = await uploadFile({
      folderId: driveFolderId,
      fileName: archivoNombre,
      mimeType: MIME_DOCX,
      buffer: docxBuffer,
    })
    driveFileId = driveFile.id ?? null
    webViewLink = driveFile.webViewLink ?? null
  } catch (e) {
    console.error('[exportar-docx] Error subiendo a Drive:', e)
    driveErrorMsg = e instanceof Error ? e.message : 'Error desconocido en Drive'
  }

  // Crear registro PlanTrabajoGeneracion solo si Drive funcionó
  if (driveFileId && webViewLink) {
    try {
      await prisma.planTrabajoGeneracion.create({
        data: {
          planTrabajoId: planDb.id,
          numeroRevision: planDb.numeroRevision ?? 'A',
          driveFileId,
          webViewLink,
          driveFolderId,
          archivoNombre,
          tamanioBytes: docxBuffer.length,
          snapshotData: { plan: planDb, organigramaPngBase64 },
          generadoPorId: session.user.id,
        },
      })
    } catch (e) {
      console.error('[exportar-docx] Error creando PlanTrabajoGeneracion:', e)
      // No es crítico — el archivo ya se entregó al usuario
    }
  }

  // Devolver el buffer con headers apropiados
  const headers = new Headers()
  headers.set('Content-Type', MIME_DOCX)
  headers.set('Content-Disposition', `attachment; filename="${archivoNombre}"`)
  headers.set('Content-Length', String(docxBuffer.length))

  if (driveErrorMsg) {
    headers.set('X-Drive-Error', driveErrorMsg)
  } else if (webViewLink) {
    headers.set('X-Drive-File-Id', driveFileId ?? '')
    headers.set('X-Drive-View-Link', webViewLink)
  }

  return new NextResponse(docxBuffer, { status: 200, headers })
}
