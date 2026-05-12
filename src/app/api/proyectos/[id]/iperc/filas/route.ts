import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ipercFilaSchema } from '@/lib/validators/iperc'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

async function resolverIperc(proyectoId: string, userId: string, role: string) {
  const proy = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proy) return { ok: false as const, status: 404, error: 'Proyecto no encontrado' }

  const esAsignado =
    proy.gestorId === userId ||
    proy.supervisorId === userId ||
    proy.liderId === userId ||
    proy.comercialId === userId

  if (!ROLES_CON_ACCESO.includes(role) && !esAsignado) {
    return { ok: false as const, status: 403, error: 'Sin acceso a este proyecto' }
  }

  const iperc = await prisma.iperc.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!iperc) return { ok: false as const, status: 404, error: 'IPERC no encontrado' }

  return { ok: true as const, ipercId: iperc.id }
}

// GET /api/proyectos/[id]/iperc/filas
// Devuelve todas las filas ordenadas
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const result = await resolverIperc(proyectoId, session.user.id, session.user.role)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const filas = await prisma.ipercFila.findMany({
    where: { ipercId: result.ipercId },
    orderBy: { numero: 'asc' },
  })

  return NextResponse.json({ data: filas })
}

// POST /api/proyectos/[id]/iperc/filas
// Agrega una nueva fila al IPERC (numero = max actual + 1)
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const result = await resolverIperc(proyectoId, session.user.id, session.user.role)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await req.json()
  const parsed = ipercFilaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const maxFila = await prisma.ipercFila.aggregate({
    where: { ipercId: result.ipercId },
    _max: { numero: true },
  })
  const numero = (maxFila._max.numero ?? 0) + 1

  const fila = await prisma.ipercFila.create({
    data: {
      ipercId: result.ipercId,
      numero,
      ...parsed.data,
    },
  })

  return NextResponse.json({ data: fila }, { status: 201 })
}
