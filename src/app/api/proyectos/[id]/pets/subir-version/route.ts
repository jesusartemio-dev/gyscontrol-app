import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/services/googleDrive'
import { getOrCreatePetsFolder } from '@/lib/pets/getOrCreatePetsFolder'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_TAMANO_BYTES = 15 * 1024 * 1024

/**
 * POST /api/proyectos/[id]/pets/subir-version
 * Sube el .docx del PETS que alguien revisó/aprobó a mano fuera de la app
 * como la nueva versión OFICIAL vigente. Mismo criterio que IPERC: subida
 * simple en un solo POST (sin el flujo por pedazos del Plan de Trabajo) — si
 * en la práctica un PETS con ilustraciones supera el límite de tamaño de
 * request de las funciones serverless, se puede migrar al flujo
 * iniciar/chunk/completar ya construido para el Plan de Trabajo.
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
  const esAsignado =
    proyecto.gestorId === userId ||
    proyecto.supervisorId === userId ||
    proyecto.liderId === userId ||
    proyecto.comercialId === userId
  if (!ROLES_CON_ACCESO.includes(role) && !esAsignado) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const pets = await prisma.pets.findUnique({ where: { proyectoId }, select: { id: true, revision: true } })
  if (!pets) {
    return NextResponse.json({ error: 'El PETS no existe para este proyecto' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido — se espera multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo ("file")' }, { status: 400 })
  }
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return NextResponse.json({ error: 'Solo se admiten archivos .docx' }, { status: 400 })
  }
  if (file.size > MAX_TAMANO_BYTES) {
    return NextResponse.json({ error: `El archivo supera el límite de ${MAX_TAMANO_BYTES / 1024 / 1024}MB` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const revision = pets.revision ?? '01'

  const driveFolderId = await getOrCreatePetsFolder(proyecto.codigo)
  const archivoNombre = `PETS_${proyecto.codigo}_Rev${revision}_revisado.docx`
  const driveFile = await uploadFile({
    folderId: driveFolderId,
    fileName: archivoNombre,
    mimeType: MIME_DOCX,
    buffer,
  })
  if (!driveFile.id || !driveFile.webViewLink) {
    return NextResponse.json({ error: 'Error subiendo el archivo a Drive' }, { status: 500 })
  }

  const [, version] = await prisma.$transaction([
    prisma.petsVersionArchivo.updateMany({
      where: { petsId: pets.id, vigente: true },
      data: { vigente: false },
    }),
    prisma.petsVersionArchivo.create({
      data: {
        petsId: pets.id,
        numeroRevision: revision,
        driveFileId: driveFile.id,
        webViewLink: driveFile.webViewLink,
        driveFolderId,
        archivoNombre,
        tamanioBytes: buffer.length,
        origen: 'IMPORTADO',
        vigente: true,
        subidoPorId: userId,
      },
    }),
  ])

  return NextResponse.json({ data: version }, { status: 201 })
}
