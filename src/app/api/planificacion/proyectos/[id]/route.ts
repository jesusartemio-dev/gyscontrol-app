import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const PatchSchema = z.object({
  colorPlanificacion: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
})

// PATCH /api/planificacion/proyectos/[id] — actualizar color de planificación
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role as string | undefined
    if (!session?.user?.id || !role || !ROLES_PERMITIDOS.includes(role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: {
        colorPlanificacion: parsed.data.colorPlanificacion,
        updatedAt: new Date(),
      },
      select: { id: true, colorPlanificacion: true },
    })

    return NextResponse.json(proyecto)
  } catch (error) {
    console.error('[PATCH /api/planificacion/proyectos/[id]]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
