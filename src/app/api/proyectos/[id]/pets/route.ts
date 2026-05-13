import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { petsPatchSchema } from '@/lib/validators/pets'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

async function verificarAcceso(proyectoId: string, userId: string, role: string) {
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

  return { ok: true as const }
}

// GET /api/proyectos/[id]/pets
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const pets = await prisma.pets.findUnique({ where: { proyectoId } })
  return NextResponse.json({ data: pets ?? null })
}

// POST /api/proyectos/[id]/pets — upsert (idempotente)
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { codigo: true },
  })
  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const pets = await prisma.pets.upsert({
    where: { proyectoId },
    create: {
      proyectoId,
      codigoDocumento: `GYS-${proyecto.codigo}-P-001`,
    },
    update: {},
  })

  return NextResponse.json({ data: pets })
}

// PATCH /api/proyectos/[id]/pets — actualiza cabecera
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const existing = await prisma.pets.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'PETS no encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = petsPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updated = await prisma.pets.update({
    where: { proyectoId },
    data: parsed.data,
  })

  return NextResponse.json({ data: updated })
}
