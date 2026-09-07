import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ALLOWED = ['admin', 'gerente', 'coordinador']

// POST /api/banco-horas/ajuste-dia
// Coordinador/admin marca que un día no tuvo trabajo asignado (culpa de la
// empresa, no del trabajador) — src/lib/services/bancoHoras.ts trata ese
// día como cumplido, sin penalizar ni acreditar de más.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!tieneRol(session, ROLES_ALLOWED)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, fecha, motivo } = body as { userId?: string; fecha?: string; motivo?: string }

    if (!userId || !fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ error: 'userId y fecha (YYYY-MM-DD) son requeridos' }, { status: 400 })
    }

    const ajuste = await prisma.bancoHorasAjusteDia.upsert({
      where: { userId_fecha: { userId, fecha: new Date(`${fecha}T00:00:00.000Z`) } },
      update: { motivo: motivo?.trim() || null },
      create: {
        userId,
        fecha: new Date(`${fecha}T00:00:00.000Z`),
        motivo: motivo?.trim() || null,
        creadoPorId: session.user.id,
      },
    })

    return NextResponse.json(ajuste)
  } catch (error) {
    console.error('[POST /api/banco-horas/ajuste-dia]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE /api/banco-horas/ajuste-dia?userId=...&fecha=YYYY-MM-DD
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !tieneRol(session, ROLES_ALLOWED)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const fecha = searchParams.get('fecha')
    if (!userId || !fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ error: 'userId y fecha (YYYY-MM-DD) son requeridos' }, { status: 400 })
    }

    await prisma.bancoHorasAjusteDia.delete({
      where: { userId_fecha: { userId, fecha: new Date(`${fecha}T00:00:00.000Z`) } },
    }).catch(() => null) // idempotente: si no existía, no es error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/banco-horas/ajuste-dia]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
