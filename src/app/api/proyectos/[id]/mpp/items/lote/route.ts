import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mppItemsLoteSchema } from '@/lib/validators/mpp'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

// POST /api/proyectos/[id]/mpp/items/lote
// Aplica de una vez lo pegado desde texto (ida y vuelta con una IA): quién usa
// cada EPP y sus observaciones. Todo en una transacción — o se guarda todo o nada.
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const proy = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true, mpp: { select: { id: true } } },
  })
  if (!proy) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  if (!proy.mpp) return NextResponse.json({ error: 'MPP no encontrado' }, { status: 404 })
  const esAsignado = [proy.gestorId, proy.supervisorId, proy.liderId, proy.comercialId].includes(session.user.id)
  if (!tieneRol(session, ROLES_CON_ACCESO) && !esAsignado) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const parsed = mppItemsLoteSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }
  const { cambios } = parsed.data
  const mppId = proy.mpp.id

  const propios = await prisma.mppItem.count({ where: { mppId, id: { in: cambios.map((c) => c.id) } } })
  if (propios !== new Set(cambios.map((c) => c.id)).size) {
    return NextResponse.json({ error: 'Algunos EPP ya no están en este MPP: recargá la página' }, { status: 409 })
  }

  await prisma.$transaction(
    cambios.map(({ id, ...data }) => prisma.mppItem.update({ where: { id }, data })),
  )
  const items = await prisma.mppItem.findMany({
    where: { mppId },
    orderBy: { orden: 'asc' },
    include: { mppEppCatalogo: true },
  })
  return NextResponse.json({ items, actualizados: cambios.length })
}
