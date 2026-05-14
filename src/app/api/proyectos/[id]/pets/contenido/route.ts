import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { petsContenidoSchema } from '@/lib/validators/pets'

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

// PATCH /api/proyectos/[id]/pets/contenido — reemplaza el contenido completo del PETS
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const pets = await prisma.pets.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!pets) return NextResponse.json({ error: 'PETS no encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = petsContenidoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Contenido inválido', issues: parsed.error.issues.slice(0, 10) },
      { status: 400 }
    )
  }

  await prisma.pets.update({
    where: { id: pets.id },
    data: { contenido: parsed.data as unknown as Record<string, unknown> },
  })

  return NextResponse.json({ ok: true })
}
