import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { TipoAusenciaUpdateSchema } from '@/lib/validators/ausencias'

const ROLES_ADMIN = ['admin', 'administracion']

type Ctx = { params: Promise<{ id: string }> }

// GET /api/tipos-ausencia/:id
export async function GET(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const tipo = await prisma.tipoAusencia.findUnique({ where: { id } })
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de ausencia no encontrado' }, { status: 404 })
    }

    return NextResponse.json(tipo)
  } catch (error) {
    console.error('[GET /api/tipos-ausencia/:id]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PUT /api/tipos-ausencia/:id — admin only, no se puede cambiar el código
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ADMIN.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await context.params
    const existing = await prisma.tipoAusencia.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tipo de ausencia no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const data = TipoAusenciaUpdateSchema.parse(body)

    const updated = await prisma.tipoAusencia.update({
      where: { id },
      data: {
        ...data,
        diasPorDefecto: data.diasPorDefecto !== undefined ? (data.diasPorDefecto ?? null) : undefined,
        diasUmbralAprobacion2:
          data.diasUmbralAprobacion2 !== undefined
            ? (data.diasUmbralAprobacion2 ?? null)
            : undefined,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[PUT /api/tipos-ausencia/:id]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
