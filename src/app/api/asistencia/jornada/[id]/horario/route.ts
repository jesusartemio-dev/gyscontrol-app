import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Valida "HH:MM" o null
function esHoraValida(v: unknown): v is string | null {
  if (v === null || v === undefined) return true
  if (typeof v !== 'string') return false
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
}

// PATCH — supervisor (o admin) edita el override de horario de su jornada activa
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { horaIngresoOverride, horaSalidaOverride, motivoOverride } = body

  if (!esHoraValida(horaIngresoOverride) || !esHoraValida(horaSalidaOverride)) {
    return NextResponse.json({ error: 'Formato HH:MM inválido' }, { status: 400 })
  }

  const jornada = await prisma.jornadaAsistencia.findUnique({ where: { id } })
  if (!jornada) return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 })

  // Solo el supervisor dueño o un admin pueden editar
  const esAdmin = ['admin', 'gerente', 'coordinador_rrhh'].includes(session.user.role)
  if (jornada.supervisorId !== session.user.id && !esAdmin) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  if (!jornada.activa) {
    return NextResponse.json({ error: 'La jornada está cerrada' }, { status: 400 })
  }

  const actualizada = await prisma.jornadaAsistencia.update({
    where: { id },
    data: {
      horaIngresoOverride: horaIngresoOverride ?? null,
      horaSalidaOverride: horaSalidaOverride ?? null,
      motivoOverride: motivoOverride ?? null,
    },
  })

  return NextResponse.json(actualizada)
}
