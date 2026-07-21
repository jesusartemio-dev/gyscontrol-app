import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'
import { convertirXlsxAHtml } from '@/lib/iperc/convertirXlsxAHtml'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

/**
 * GET /api/proyectos/[id]/iperc/version-revisada
 * Devuelve la versión IMPORTADO vigente del IPERC (el Excel que alguien
 * revisó/aprobó fuera de la app y volvió a subir) renderizada a HTML — misma
 * idea que plan-trabajo/version-revisada, pero el artefacto acá es XLSX, no
 * DOCX: se lee con SheetJS (xlsx) y se convierte la hoja a una tabla HTML en
 * vez de usar mammoth. No se re-parsea a IpercFila — es una vista de solo
 * lectura del archivo tal cual.
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
    select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const { role } = session.user
  const esAsignado =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId
  if (!ROLES_CON_ACCESO.includes(role) && !esAsignado) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true, codigoDocumento: true } })
  if (!iperc) {
    return NextResponse.json({ error: 'El IPERC no existe para este proyecto' }, { status: 404 })
  }

  const version = await prisma.ipercVersionArchivo.findFirst({
    where: { ipercId: iperc.id, origen: 'IMPORTADO', vigente: true },
    orderBy: { subidoEn: 'desc' },
  })
  if (!version) {
    return NextResponse.json({ data: null })
  }

  let html: string
  try {
    const { data: buffer } = await getFileContent(version.driveFileId)
    const convertido = convertirXlsxAHtml(buffer)
    if (!convertido) throw new Error('El archivo no tiene hojas legibles')
    html = convertido
  } catch (e) {
    console.error('[iperc/version-revisada] Error convirtiendo el xlsx a HTML:', e)
    return NextResponse.json({ error: 'No se pudo generar la vista de la versión revisada' }, { status: 502 })
  }

  return NextResponse.json(
    {
      data: {
        html,
        codigoDocumento: iperc.codigoDocumento,
        numeroRevision: version.numeroRevision,
        archivoNombre: version.archivoNombre,
        subidoEn: version.subidoEn,
        webViewLink: version.webViewLink,
      },
    },
    { headers: { 'Cache-Control': 'private, max-age=3600' } }
  )
}
