import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile, createFolder, getAdminDriveId } from '@/lib/services/googleDrive'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']
const ROLES_VER_TODO = ['admin', 'gerente']
const MAX_TAMANO_BYTES = 15 * 1024 * 1024 // 15MB

function puedeEditar(role: string, ingenieroId: string, userId: string): boolean {
  if (role === 'admin' || role === 'gerente') return true
  if (role === 'seguridad' && ingenieroId === userId) return true
  return false
}

async function getOrCreateRegistroFolder(registroId: string): Promise<string> {
  const registro = await prisma.registroSeguridad.findUnique({
    where: { id: registroId },
    select: {
      jornada: { select: { proyecto: { select: { codigo: true } } } },
    },
  })
  const parentId = getAdminDriveId()
  const codigo = registro?.jornada.proyecto.codigo ?? 'sin-proyecto'
  const folderName = `RegistrosSeguridad_${codigo}_${registroId}`
  const folder = await createFolder({ parentId, folderName })
  return folder.id!
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const registro = await prisma.registroSeguridad.findUnique({
      where: { id },
      select: { ingenieroId: true },
    })
    if (!registro) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }
    if (
      !ROLES_VER_TODO.includes(session.user.role) &&
      registro.ingenieroId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const fotos = await prisma.registroSeguridadFoto.findMany({
      where: { registroSeguridadId: id },
      orderBy: { orden: 'asc' },
    })
    return NextResponse.json(fotos)
  } catch (error) {
    console.error('Error al listar fotos:', error)
    return NextResponse.json({ error: 'Error al listar fotos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const registro = await prisma.registroSeguridad.findUnique({
      where: { id },
      select: { ingenieroId: true },
    })
    if (!registro) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }
    if (!puedeEditar(session.user.role, registro.ingenieroId, session.user.id)) {
      return NextResponse.json({ error: 'Solo puedes subir fotos a tus propios registros' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 })
    }
    if (file.size > MAX_TAMANO_BYTES) {
      return NextResponse.json({ error: 'La imagen excede 15MB' }, { status: 400 })
    }

    const folderId = await getOrCreateRegistroFolder(id)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const driveFile = await uploadFile({
      folderId,
      fileName: `${Date.now()}_${file.name}`,
      mimeType: file.type || 'image/jpeg',
      buffer,
    })

    const ultima = await prisma.registroSeguridadFoto.findFirst({
      where: { registroSeguridadId: id },
      orderBy: { orden: 'desc' },
      select: { orden: true },
    })
    const nuevoOrden = (ultima?.orden ?? -1) + 1

    const foto = await prisma.registroSeguridadFoto.create({
      data: {
        registroSeguridadId: id,
        nombreArchivo: file.name,
        urlArchivo: driveFile.webViewLink || '',
        driveFileId: driveFile.id || null,
        tipoArchivo: file.type || null,
        tamano: file.size,
        orden: nuevoOrden,
      },
    })

    return NextResponse.json(foto, { status: 201 })
  } catch (error) {
    console.error('Error al subir foto del registro de seguridad:', error)
    return NextResponse.json({ error: 'Error al subir foto' }, { status: 500 })
  }
}
