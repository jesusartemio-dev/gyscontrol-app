import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/agente/usage/limit — Update the monthly usage limit
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (!['admin', 'gerente'].includes(role || '')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const limite = parseFloat(body.limite)

  if (isNaN(limite) || limite <= 0) {
    return NextResponse.json({ error: 'Limite debe ser un numero mayor a 0' }, { status: 400 })
  }

  await prisma.configuracionGeneral.upsert({
    where: { id: 'default' },
    update: {
      agenteLimiteMensualUsd: limite,
      updatedBy: (session.user as { id: string }).id,
    },
    create: {
      id: 'default',
      agenteLimiteMensualUsd: limite,
      updatedBy: (session.user as { id: string }).id,
    },
  })

  return NextResponse.json({ ok: true, limite })
}
