import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import {
  TipoAusenciaCreateSchema,
} from '@/lib/validators/ausencias'

const ROLES_ADMIN = ['admin', 'administracion']

// GET /api/tipos-ausencia
// ?inactivos=true  → requiere rol admin/administracion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const incluirInactivos = searchParams.get('inactivos') === 'true'

    if (incluirInactivos && !ROLES_ADMIN.includes((session.user as any).role)) {
      return NextResponse.json(
        { error: 'Sin permisos para ver tipos de ausencia inactivos' },
        { status: 403 },
      )
    }

    const tipos = await prisma.tipoAusencia.findMany({
      where: incluirInactivos ? undefined : { activo: true },
      orderBy: { orden: 'asc' },
    })

    return NextResponse.json(tipos)
  } catch (error) {
    console.error('[GET /api/tipos-ausencia]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/tipos-ausencia — admin only
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ADMIN.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = TipoAusenciaCreateSchema.parse(body)

    const existing = await prisma.tipoAusencia.findUnique({
      where: { codigo: data.codigo },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un tipo de ausencia con el código '${data.codigo}'` },
        { status: 409 },
      )
    }

    const tipo = await prisma.tipoAusencia.create({
      data: {
        ...data,
        diasPorDefecto: data.diasPorDefecto ?? null,
        diasUmbralAprobacion2: data.diasUmbralAprobacion2 ?? null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(tipo, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/tipos-ausencia]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
