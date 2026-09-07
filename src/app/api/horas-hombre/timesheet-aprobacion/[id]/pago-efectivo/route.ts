import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'coordinador']

// PATCH /api/horas-hombre/timesheet-aprobacion/[id]/pago-efectivo
// Marca/desmarca que el excedente de esta semana se pagó en efectivo — el
// banco de horas (src/lib/services/bancoHoras.ts) deja de acumular ese
// excedente cuando esto está en true. Independiente del estado de
// aprobación de la semana.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!tieneRol(session, ROLES_ALLOWED)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { pagadoEnEfectivo } = body as { pagadoEnEfectivo: boolean }

    if (typeof pagadoEnEfectivo !== 'boolean') {
      return NextResponse.json({ error: 'pagadoEnEfectivo debe ser booleano' }, { status: 400 })
    }

    const updated = await prisma.timesheetAprobacion.update({
      where: { id },
      data: { pagadoEnEfectivo, updatedAt: new Date() },
      select: { id: true, semana: true, pagadoEnEfectivo: true, usuario: { select: { name: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/horas-hombre/timesheet-aprobacion/[id]/pago-efectivo]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
