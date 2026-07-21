import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mammoth from 'mammoth'
import sanitizeHtml from 'sanitize-html'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string }> }

/** Mismo criterio de sanitización que cualquier HTML de fuente externa que se
 * renderiza con dangerouslySetInnerHTML — mammoth ya produce HTML acotado
 * (sin scripts), pero igual se sanitiza antes de servirlo al cliente. */
const OPCIONES_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'strong', 'b', 'em', 'i', 'u', 'a', 'img', 'sub', 'sup',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    img: ['src', 'alt', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['data', 'http', 'https'] },
}

/**
 * GET /api/proyectos/[id]/plan-trabajo/version-revisada
 * Devuelve la versión IMPORTADO vigente del Plan de Trabajo (el Word que
 * Proyectos editó y volvió a subir) renderizada a HTML — texto, imágenes,
 * captions y posición EXACTOS del documento, sin intentar mapearlos de
 * vuelta a la estructura de la app (ver decisión de diseño en
 * project_plan_trabajo_v2_upload.md: no hay ancla estable para ese mapeo
 * porque se edita en Google Docs, que borra cualquier marca oculta).
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
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
  const rolesConAccesoTotal = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial', 'coordinador', 'proyectos']
  const esGestorODirectivo =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId
  if (!rolesConAccesoTotal.includes(role) && !esGestorODirectivo) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const planDb = await prisma.planTrabajo.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!planDb) {
    return NextResponse.json({ error: 'El Plan de Trabajo no existe para este proyecto' }, { status: 404 })
  }

  const generacion = await prisma.planTrabajoGeneracion.findFirst({
    where: { planTrabajoId: planDb.id, origen: 'IMPORTADO', vigente: true },
    select: {
      id: true,
      driveFileId: true,
      archivoNombre: true,
      numeroRevision: true,
      codigoNexa: true,
      webViewLink: true,
      generadoEn: true,
    },
    orderBy: { generadoEn: 'desc' },
  })
  if (!generacion) {
    return NextResponse.json({ data: null })
  }

  let html: string
  try {
    const { data: buffer } = await getFileContent(generacion.driveFileId)
    const resultado = await mammoth.convertToHtml({ buffer })
    html = sanitizeHtml(resultado.value, OPCIONES_SANITIZE)
  } catch (e) {
    console.error('[version-revisada] Error convirtiendo el docx a HTML:', e)
    return NextResponse.json({ error: 'No se pudo generar la vista de la versión revisada' }, { status: 502 })
  }

  return NextResponse.json(
    {
      data: {
        html,
        codigoNexa: generacion.codigoNexa,
        archivoNombre: generacion.archivoNombre,
        numeroRevision: generacion.numeroRevision,
        generadoEn: generacion.generadoEn,
        webViewLink: generacion.webViewLink,
      },
    },
    { headers: { 'Cache-Control': 'private, max-age=3600' } }
  )
}
