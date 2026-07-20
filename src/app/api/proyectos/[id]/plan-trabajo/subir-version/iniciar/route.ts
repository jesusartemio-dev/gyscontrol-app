import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { iniciarSesionResumable } from '@/lib/services/googleDrive'
import { getOrCreatePlanTrabajoFolder } from '@/lib/planTrabajo/getOrCreatePlanTrabajoFolder'

type Ctx = { params: Promise<{ id: string }> }

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * POST /api/proyectos/[id]/plan-trabajo/subir-version/iniciar
 * Paso 1 de 3 de la subida de una versión editada del Plan de Trabajo.
 * No recibe el archivo — solo el nombre — para no chocar con el límite de
 * tamaño de request de las funciones serverless. Devuelve una URL de sesión
 * de subida resumable de Drive para que el navegador suba el archivo
 * DIRECTO a Google (ver subir-version/completar para el paso final).
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params
  const userId = session.user.id

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, codigo: true, gestorId: true, supervisorId: true, liderId: true, comercialId: true },
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

  const planDb = await prisma.planTrabajo.findUnique({ where: { proyectoId } })
  if (!planDb) {
    return NextResponse.json({ error: 'El Plan de Trabajo no existe para este proyecto' }, { status: 404 })
  }

  let body: { fileName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  if (!body.fileName || !body.fileName.toLowerCase().endsWith('.docx')) {
    return NextResponse.json({ error: 'Solo se admiten archivos .docx' }, { status: 400 })
  }

  const driveFolderId = await getOrCreatePlanTrabajoFolder(proyecto.codigo)
  const archivoNombre = `PT_${proyecto.codigo}_Rev${planDb.numeroRevision}_editado.docx`

  try {
    const { sessionUri } = await iniciarSesionResumable({
      folderId: driveFolderId,
      fileName: archivoNombre,
      mimeType: MIME_DOCX,
    })
    return NextResponse.json({ data: { sessionUri, archivoNombre, driveFolderId } })
  } catch (e) {
    console.error('[subir-version/iniciar] Error iniciando sesión resumable:', e)
    return NextResponse.json({ error: 'No se pudo iniciar la subida a Drive' }, { status: 502 })
  }
}
