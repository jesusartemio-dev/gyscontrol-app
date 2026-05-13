import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mppItemPatchSchema } from '@/lib/validators/mpp'

type Ctx = { params: Promise<{ id: string; itemId: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

// PATCH /api/proyectos/[id]/mpp/items/[itemId]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId, itemId } = await params

  const proy = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proy) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const esAsignado =
    proy.gestorId === session.user.id ||
    proy.supervisorId === session.user.id ||
    proy.liderId === session.user.id ||
    proy.comercialId === session.user.id

  if (!ROLES_CON_ACCESO.includes(session.user.role) && !esAsignado) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const item = await prisma.mppItem.findUnique({
    where: { id: itemId },
    include: { mpp: { select: { proyectoId: true } } },
  })
  if (!item || item.mpp.proyectoId !== proyectoId) {
    return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = mppItemPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.mppItem.update({
    where: { id: itemId },
    data: parsed.data,
    include: { catalogo: true },
  })

  return NextResponse.json({ item: updated })
}
