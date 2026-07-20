import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/services/googleDrive'
import { getOrCreateAlcanceImagenesFolder } from '@/lib/planTrabajo/getOrCreateAlcanceImagenesFolder'
import { redimensionarImagen } from '@/lib/planTrabajo/redimensionarImagen'

type Ctx = { params: Promise<{ id: string }> }

const MAX_TAMANO_BYTES = 15 * 1024 * 1024 // 15MB, mismo límite que evidencias/seguridad

// POST /api/proyectos/[id]/plan-trabajo/alcance-imagenes
// Sube una imagen para un EDT/subItem de alcanceDetallado (solo fase EJECUCIÓN
// en la UI — Tarea 3, Bloque 4). Las imágenes NUNCA pasan por IA.
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

  const plan = await prisma.planTrabajo.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!plan) {
    return NextResponse.json({ error: 'El Plan de Trabajo no existe para este proyecto' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido — se espera multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file')
  const edtRef = formData.get('edtRef')
  const subItemRefRaw = formData.get('subItemRef')
  const tareaRefRaw = formData.get('tareaRef')
  const caption = formData.get('caption')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo ("file")' }, { status: 400 })
  }
  if (typeof edtRef !== 'string' || !edtRef.trim()) {
    return NextResponse.json({ error: 'Falta "edtRef"' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo se admiten imágenes (jpg, png)' }, { status: 400 })
  }
  if (file.size > MAX_TAMANO_BYTES) {
    return NextResponse.json({ error: `La imagen supera el límite de ${MAX_TAMANO_BYTES / 1024 / 1024}MB` }, { status: 400 })
  }

  // Exactamente un nivel: EDT, subItem o tarea (Bloque 4.2 sesión 2, Tarea 3) —
  // si viene tareaRef, subItemRef siempre queda null.
  const tareaRef = typeof tareaRefRaw === 'string' && tareaRefRaw ? tareaRefRaw : null
  const subItemRef = !tareaRef && typeof subItemRefRaw === 'string' && subItemRefRaw ? subItemRefRaw : null

  const original = Buffer.from(await file.arrayBuffer())
  const buffer = await redimensionarImagen(original, file.type)

  const ultima = await prisma.planTrabajoImagen.findFirst({
    where: { planTrabajoId: plan.id, edtRef, subItemRef, tareaRef },
    orderBy: { orden: 'desc' },
    select: { orden: true },
  })
  const nuevoOrden = (ultima?.orden ?? -1) + 1

  const folderId = await getOrCreateAlcanceImagenesFolder(proyecto.codigo)
  const driveFile = await uploadFile({
    folderId,
    fileName: `${Date.now()}_${file.name}`,
    mimeType: file.type,
    buffer,
  })

  const imagen = await prisma.planTrabajoImagen.create({
    data: {
      planTrabajoId: plan.id,
      edtRef,
      subItemRef,
      tareaRef,
      nombreArchivo: file.name,
      urlArchivo: driveFile.webViewLink ?? '',
      driveFileId: driveFile.id ?? null,
      tipoArchivo: file.type,
      tamano: buffer.length,
      caption: typeof caption === 'string' ? caption : '',
      orden: nuevoOrden,
      createdById: userId,
    },
  })

  return NextResponse.json({ data: imagen }, { status: 201 })
}
