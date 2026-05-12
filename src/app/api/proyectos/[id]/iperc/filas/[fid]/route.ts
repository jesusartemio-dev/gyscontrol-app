import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ipercFilaSchema } from '@/lib/validators/iperc'

type Ctx = { params: Promise<{ id: string; fid: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

async function verificarAccesoFila(
  proyectoId: string,
  filaId: string,
  userId: string,
  role: string
) {
  const proy = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      gestorId: true,
      supervisorId: true,
      liderId: true,
      comercialId: true,
      iperc: { select: { id: true } },
    },
  })
  if (!proy) return { ok: false as const, status: 404, error: 'Proyecto no encontrado' }
  if (!proy.iperc) return { ok: false as const, status: 404, error: 'IPERC no encontrado' }

  const esAsignado =
    proy.gestorId === userId ||
    proy.supervisorId === userId ||
    proy.liderId === userId ||
    proy.comercialId === userId

  if (!ROLES_CON_ACCESO.includes(role) && !esAsignado) {
    return { ok: false as const, status: 403, error: 'Sin acceso a este proyecto' }
  }

  const fila = await prisma.ipercFila.findFirst({
    where: { id: filaId, ipercId: proy.iperc.id },
  })
  if (!fila) return { ok: false as const, status: 404, error: 'Fila no encontrada' }

  return { ok: true as const, fila, ipercId: proy.iperc.id }
}

// GET /api/proyectos/[id]/iperc/filas/[fid]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId, fid } = await params
  const result = await verificarAccesoFila(proyectoId, fid, session.user.id, session.user.role)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ data: result.fila })
}

// PATCH /api/proyectos/[id]/iperc/filas/[fid]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId, fid } = await params
  const result = await verificarAccesoFila(proyectoId, fid, session.user.id, session.user.role)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const body = await req.json()
  const parsed = ipercFilaSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.ipercFila.update({
    where: { id: fid },
    data: parsed.data,
  })

  return NextResponse.json({ data: updated })
}

// DELETE /api/proyectos/[id]/iperc/filas/[fid]
// Elimina la fila y renumera las siguientes
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId, fid } = await params
  const result = await verificarAccesoFila(proyectoId, fid, session.user.id, session.user.role)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const { fila, ipercId } = result

  // Eliminar y renumerar en transacción
  await prisma.$transaction(async (tx) => {
    await tx.ipercFila.delete({ where: { id: fid } })

    // Decrementar en 1 las filas con numero > eliminada
    const filasPosteriores = await tx.ipercFila.findMany({
      where: { ipercId, numero: { gt: fila.numero } },
      orderBy: { numero: 'asc' },
    })

    for (const f of filasPosteriores) {
      await tx.ipercFila.update({
        where: { id: f.id },
        data: { numero: f.numero - 1 },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
