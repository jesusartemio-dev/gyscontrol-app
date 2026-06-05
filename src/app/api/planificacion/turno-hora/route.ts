import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_PLANIFICADOR = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']
const TURNOS = ['turno_a', 'turno_b', 'turno_c'] as const
type TurnoVal = (typeof TURNOS)[number]

// GET /api/planificacion/turno-hora?inicio=YYYY-MM-DD&fin=YYYY-MM-DD
// Devuelve las horas de ingreso por turno/día en el rango.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const url = new URL(req.url)
  const inicio = url.searchParams.get('inicio')
  const fin = url.searchParams.get('fin')

  const where: { fecha?: { gte?: Date; lte?: Date } } = {}
  if (inicio || fin) {
    where.fecha = {}
    if (inicio) where.fecha.gte = new Date(`${inicio}T00:00:00.000Z`)
    if (fin) where.fecha.lte = new Date(`${fin}T23:59:59.999Z`)
  }

  const horas = await prisma.planificacionTurnoHora.findMany({ where })
  return NextResponse.json(
    horas.map((h) => ({
      fecha: h.fecha.toISOString().slice(0, 10),
      turno: h.turno,
      horaIngreso: h.horaIngreso,
      horaSalida: h.horaSalida,
    })),
  )
}

// PUT /api/planificacion/turno-hora  { fecha, turno, horaIngreso }
// Fija (upsert) la hora de ingreso de un turno en un día. Hora vacía la borra.
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !ROLES_PLANIFICADOR.includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Sin permisos para planificar' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const fechaStr = String(body.fecha || '')
  const turno = String(body.turno || '') as TurnoVal
  const horaIngreso = String(body.horaIngreso || '').trim()
  const horaSalida = String(body.horaSalida || '').trim()
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr) || !TURNOS.includes(turno)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  if (horaIngreso && !hhmm.test(horaIngreso)) {
    return NextResponse.json({ error: 'Hora de ingreso inválida (HH:MM)' }, { status: 400 })
  }
  if (horaSalida && !hhmm.test(horaSalida)) {
    return NextResponse.json({ error: 'Hora de salida inválida (HH:MM)' }, { status: 400 })
  }

  const fecha = new Date(`${fechaStr}T00:00:00.000Z`)

  if (!horaIngreso) {
    await prisma.planificacionTurnoHora.deleteMany({ where: { fecha, turno } })
    return NextResponse.json({ ok: true, eliminado: true })
  }

  const guardada = await prisma.planificacionTurnoHora.upsert({
    where: { fecha_turno: { fecha, turno } },
    update: { horaIngreso, horaSalida: horaSalida || null },
    create: { fecha, turno, horaIngreso, horaSalida: horaSalida || null },
  })
  return NextResponse.json({
    ok: true,
    fecha: fechaStr,
    turno,
    horaIngreso: guardada.horaIngreso,
    horaSalida: guardada.horaSalida,
  })
}
