import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'
import { convertirDocxAHtml } from '@/lib/pets/convertirDocxAHtml'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

/**
 * GET /api/proyectos/[id]/pets/version-revisada
 * Devuelve la versión IMPORTADO vigente del PETS (el Word que alguien
 * revisó/aprobó fuera de la app y volvió a subir) renderizada a HTML — mismo
 * enfoque que la vista del Plan de Trabajo (mammoth), a diferencia del IPERC
 * (XLSX, usa SheetJS). No se re-parsea a `contenido` — es una vista de solo
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

  const pets = await prisma.pets.findUnique({ where: { proyectoId }, select: { id: true, codigoDocumento: true } })
  if (!pets) {
    return NextResponse.json({ error: 'El PETS no existe para este proyecto' }, { status: 404 })
  }

  const version = await prisma.petsVersionArchivo.findFirst({
    where: { petsId: pets.id, origen: 'IMPORTADO', vigente: true },
    orderBy: { subidoEn: 'desc' },
  })
  if (!version) {
    return NextResponse.json({ data: null })
  }

  let html: string
  try {
    const { data: buffer } = await getFileContent(version.driveFileId)
    const convertido = await convertirDocxAHtml(buffer)
    if (!convertido) throw new Error('No se pudo convertir el docx')
    html = convertido
  } catch (e) {
    console.error('[pets/version-revisada] Error convirtiendo el docx a HTML:', e)
    return NextResponse.json({ error: 'No se pudo generar la vista de la versión revisada' }, { status: 502 })
  }

  return NextResponse.json(
    {
      data: {
        html,
        codigoDocumento: pets.codigoDocumento,
        numeroRevision: version.numeroRevision,
        archivoNombre: version.archivoNombre,
        subidoEn: version.subidoEn,
        webViewLink: version.webViewLink,
      },
    },
    { headers: { 'Cache-Control': 'private, max-age=3600' } }
  )
}
