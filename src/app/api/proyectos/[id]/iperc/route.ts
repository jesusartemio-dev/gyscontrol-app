import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ipercCabeceraSchema, ipercPatchSchema } from '@/lib/validators/iperc'
import { validarPreRequisitos } from '@/lib/iperc/validarPreRequisitos'

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

// GET /api/proyectos/[id]/iperc
// Devuelve el IPERC con filas y generaciones, o null si no existe
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const iperc = await prisma.iperc.findUnique({
    where: { proyectoId },
    include: {
      filas: { orderBy: { numero: 'asc' } },
      generaciones: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  return NextResponse.json({ data: iperc ?? null })
}

// POST /api/proyectos/[id]/iperc
// Crea el IPERC vacío para el proyecto (idempotente: 409 si ya existe)
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const prereqs = await validarPreRequisitos(proyectoId)
  if (!prereqs.cumple) {
    return NextResponse.json(
      { error: 'Prerequisitos incompletos', faltantes: prereqs.faltantes },
      { status: 409 }
    )
  }

  const existing = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un IPERC para este proyecto' }, { status: 409 })
  }

  const body = await req.json()
  const parsed = ipercCabeceraSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { evaluadores, fechaElaboracion, fechaActualizacion, ...rest } = parsed.data

  const iperc = await prisma.iperc.create({
    data: {
      proyectoId,
      ...rest,
      ...(evaluadores !== undefined && { evaluadores }),
      ...(fechaElaboracion !== undefined && { fechaElaboracion }),
      ...(fechaActualizacion !== undefined && { fechaActualizacion }),
    },
  })

  return NextResponse.json({ data: iperc }, { status: 201 })
}

// PATCH /api/proyectos/[id]/iperc
// Actualiza cabecera del IPERC
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const existing = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = ipercPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { evaluadores, fechaElaboracion, fechaActualizacion, ...rest } = parsed.data

  const updated = await prisma.iperc.update({
    where: { proyectoId },
    data: {
      ...rest,
      ...(evaluadores !== undefined && { evaluadores }),
      ...(fechaElaboracion !== undefined && { fechaElaboracion }),
      ...(fechaActualizacion !== undefined && { fechaActualizacion }),
    },
  })

  return NextResponse.json({ data: updated })
}

// DELETE /api/proyectos/[id]/iperc
// Elimina el IPERC completo (filas por CASCADE)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const existing = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })

  await prisma.iperc.delete({ where: { proyectoId } })

  return NextResponse.json({ ok: true })
}
