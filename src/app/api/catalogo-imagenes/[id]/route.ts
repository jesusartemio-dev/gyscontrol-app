import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { catalogoImagenUpdateSchema } from '@/lib/validators/catalogoImagen'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_EDICION = ['admin', 'gerente']

// PATCH /api/catalogo-imagenes/[id]
// Edita nombre/keywords/categoria, o desactiva (activo: false) — nunca borra
// el archivo de Drive (Bloque 4.2, Tarea 6). Solo admin/gerente.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!ROLES_EDICION.includes(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const existente = await prisma.catalogoImagen.findUnique({ where: { id } })
  if (!existente) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = catalogoImagenUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const imagen = await prisma.catalogoImagen.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json({ data: imagen })
}
