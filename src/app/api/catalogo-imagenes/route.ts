import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/services/googleDrive'
import { getOrCreateCatalogoImagenesFolder } from '@/lib/catalogoImagenes/getOrCreateCatalogoImagenesFolder'
import { redimensionarImagen } from '@/lib/planTrabajo/redimensionarImagen'
import { catalogoImagenCreateSchema, CATEGORIAS_CATALOGO_IMAGEN } from '@/lib/validators/catalogoImagen'

const MAX_TAMANO_BYTES = 15 * 1024 * 1024 // 15MB, mismo límite que alcance-imagenes
const ROLES_EDICION = ['admin', 'gerente']

// GET /api/catalogo-imagenes?q=&categoria=&activo=
// Catálogo GLOBAL de imágenes de referencia (Bloque 4.2, Tarea 6) — cualquier
// usuario autenticado puede consultar; solo admin/gerente puede subir/editar.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const categoria = searchParams.get('categoria')?.trim()
  const activoParam = searchParams.get('activo')

  const imagenes = await prisma.catalogoImagen.findMany({
    where: {
      ...(activoParam !== null ? { activo: activoParam !== 'false' } : {}),
      ...(categoria && (CATEGORIAS_CATALOGO_IMAGEN as readonly string[]).includes(categoria) ? { categoria } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' as const } },
              { keywords: { has: q } },
            ],
          }
        : {}),
    },
    orderBy: { nombre: 'asc' },
  })

  return NextResponse.json({ data: imagenes })
}

// POST /api/catalogo-imagenes
// Sube una nueva imagen al catálogo global (multipart/form-data: file, nombre,
// categoria, keywords opcional como JSON array o CSV). Solo admin/gerente.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!ROLES_EDICION.includes(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido — se espera multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file')
  const nombre = formData.get('nombre')
  const categoria = formData.get('categoria')
  const keywordsRaw = formData.get('keywords')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo ("file")' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo se admiten imágenes (jpg, png)' }, { status: 400 })
  }
  if (file.size > MAX_TAMANO_BYTES) {
    return NextResponse.json({ error: `La imagen supera el límite de ${MAX_TAMANO_BYTES / 1024 / 1024}MB` }, { status: 400 })
  }

  let keywords: string[] = []
  if (typeof keywordsRaw === 'string' && keywordsRaw.trim()) {
    try {
      const parsed = JSON.parse(keywordsRaw)
      keywords = Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []
    } catch {
      keywords = keywordsRaw.split(',').map(k => k.trim()).filter(Boolean)
    }
  }

  const parsed = catalogoImagenCreateSchema.safeParse({
    nombre: typeof nombre === 'string' ? nombre : '',
    categoria: typeof categoria === 'string' ? categoria : undefined,
    keywords,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const original = Buffer.from(await file.arrayBuffer())
  const buffer = await redimensionarImagen(original, file.type)

  const folderId = await getOrCreateCatalogoImagenesFolder()
  const driveFile = await uploadFile({
    folderId,
    fileName: `${Date.now()}_${file.name}`,
    mimeType: file.type,
    buffer,
  })
  if (!driveFile.id) {
    return NextResponse.json({ error: 'Drive no devolvió un id para el archivo subido' }, { status: 502 })
  }

  const imagen = await prisma.catalogoImagen.create({
    data: {
      nombre: parsed.data.nombre,
      categoria: parsed.data.categoria,
      keywords: parsed.data.keywords,
      driveFileId: driveFile.id,
      thumbnailUrl: driveFile.thumbnailLink ?? null,
      createdById: session.user.id,
    },
  })

  return NextResponse.json({ data: imagen }, { status: 201 })
}
