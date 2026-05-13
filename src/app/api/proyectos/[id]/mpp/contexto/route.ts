import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/proyectos/[id]/mpp/contexto
// Devuelve catálogo de EPPs, puestos disponibles desde IPERC, y estado actual del MPP
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params

  const [catalogos, iperc, mpp] = await Promise.all([
    prisma.mppEppCatalogo.findMany({
      where: { activo: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    }),
    prisma.iperc.findUnique({
      where: { proyectoId },
      include: {
        filas: { select: { puestoTrabajo: true }, distinct: ['puestoTrabajo'] },
        _count: { select: { filas: true } },
      },
    }),
    prisma.mpp.findUnique({
      where: { proyectoId },
      select: { id: true, estado: true },
    }),
  ])

  const puestosDeIperc = iperc?.filas.map((f) => f.puestoTrabajo) ?? []

  return NextResponse.json({
    data: {
      catalogos,
      puestosDeIperc,
      ipercExiste: iperc !== null,
      ipercTieneFilas: (iperc?._count.filas ?? 0) > 0,
      mppExiste: mpp !== null,
      mppEstado: mpp?.estado ?? null,
    },
  })
}
