import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mppCabeceraSchema, mppPatchSchema } from '@/lib/validators/mpp'
import { validarPreRequisitosMpp } from '@/lib/mpp/validarPreRequisitos'

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

// GET /api/proyectos/[id]/mpp
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const mpp = await prisma.mpp.findUnique({
    where: { proyectoId },
    include: {
      items: {
        include: { mppEppCatalogo: true },
        orderBy: { orden: 'asc' },
      },
      generaciones: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  return NextResponse.json({ mpp: mpp ?? null })
}

// POST /api/proyectos/[id]/mpp
// Crea el MPP y pre-popula MppItems desde el catálogo con asignaciones default
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const prereqs = await validarPreRequisitosMpp(proyectoId)
  if (!prereqs.ok) {
    return NextResponse.json({ error: prereqs.error, code: prereqs.code }, { status: 409 })
  }

  const existing = await prisma.mpp.findUnique({ where: { proyectoId }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un MPP para este proyecto' }, { status: 409 })
  }

  const body = await req.json()
  const parsed = mppCabeceraSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { fechaElaboracion, fechaActualizacion, ...rest } = parsed.data

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { nombre: true },
  })

  const catalogos = await prisma.mppEppCatalogo.findMany({
    where: { activo: true },
    orderBy: { orden: 'asc' },
  })

  const mpp = await prisma.mpp.create({
    data: {
      proyectoId,
      ...rest,
      area: rest.area ?? proyecto?.nombre ?? '',
      ...(fechaElaboracion !== undefined && { fechaElaboracion }),
      ...(fechaActualizacion !== undefined && { fechaActualizacion }),
      items: {
        create: catalogos.map((cat) => {
          const puestos = cat.asignacionesDefault as string[]
          const asignaciones: Record<string, boolean> = {}
          for (const puesto of puestos) {
            asignaciones[puesto] = true
          }
          return { mppEppCatalogoId: cat.id, asignaciones, orden: cat.orden }
        }),
      },
    },
    include: {
      items: {
        include: { mppEppCatalogo: true },
        orderBy: { orden: 'asc' },
      },
    },
  })

  return NextResponse.json({ mpp }, { status: 201 })
}

// PATCH /api/proyectos/[id]/mpp
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const existing = await prisma.mpp.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'MPP no encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = mppPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { fechaElaboracion, fechaActualizacion, ...rest } = parsed.data

  const updated = await prisma.mpp.update({
    where: { proyectoId },
    data: {
      ...rest,
      ...(fechaElaboracion !== undefined && { fechaElaboracion }),
      ...(fechaActualizacion !== undefined && { fechaActualizacion }),
    },
  })

  return NextResponse.json({ mpp: updated })
}

// DELETE /api/proyectos/[id]/mpp
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const existing = await prisma.mpp.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'MPP no encontrado' }, { status: 404 })

  await prisma.mpp.delete({ where: { proyectoId } })

  return NextResponse.json({ ok: true })
}
