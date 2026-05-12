import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { reordenarFilasSchema } from '@/lib/validators/iperc'

type Ctx = { params: Promise<{ id: string }> }

const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

// POST /api/proyectos/[id]/iperc/filas/reordenar
// Body: { orden: string[] }  — array de IDs en el nuevo orden
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params

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
  if (!proy) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  if (!proy.iperc) return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })

  const userId = session.user.id
  const role = session.user.role
  const esAsignado =
    proy.gestorId === userId ||
    proy.supervisorId === userId ||
    proy.liderId === userId ||
    proy.comercialId === userId

  if (!ROLES_CON_ACCESO.includes(role) && !esAsignado) {
    return NextResponse.json({ error: 'Sin acceso a este proyecto' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = reordenarFilasSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { orden } = parsed.data
  const ipercId = proy.iperc.id

  // Verificar que todos los IDs pertenecen a este IPERC
  const filas = await prisma.ipercFila.findMany({
    where: { ipercId, id: { in: orden } },
    select: { id: true },
  })

  if (filas.length !== orden.length) {
    return NextResponse.json(
      { error: 'Algunos IDs no pertenecen a este IPERC o están duplicados' },
      { status: 400 }
    )
  }

  // Reasignar numeros en transacción
  await prisma.$transaction(
    orden.map((id, index) =>
      prisma.ipercFila.update({
        where: { id },
        data: { numero: index + 1 },
      })
    )
  )

  const filasActualizadas = await prisma.ipercFila.findMany({
    where: { ipercId },
    orderBy: { numero: 'asc' },
  })

  return NextResponse.json({ data: filasActualizadas })
}
