import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tieneRol } from '@/lib/auth/roles'
import { calcularFechaEsperada } from '@/lib/services/asistencia'

const ROLES_ADMIN = ['admin', 'gerente', 'administracion']

/**
 * POST /api/asistencia/salida-manual
 * body: { ingresoId: string, hora: "HH:mm" }
 *
 * Registra la salida de alguien que marcó ingreso y se fue sin marcar.
 *
 * Hasta ahora la única forma era cerrar la sesión entera del QR, lo que no
 * sirve a media jornada: el resto del personal todavía tiene que marcar. Esto
 * arregla una sola persona y deja la sesión como está.
 *
 * Lo puede hacer un rol administrativo o el supervisor dueño de la sesión.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const ingresoId = String(body?.ingresoId || '')
  const hora = String(body?.hora || '')
  if (!ingresoId || !/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json({ message: 'Indica el ingreso y la hora (HH:mm)' }, { status: 400 })
  }

  const ingreso = await prisma.asistencia.findUnique({
    where: { id: ingresoId },
    include: {
      ubicacion: true,
      jornadaAsistencia: {
        select: { id: true, supervisorId: true, horaIngresoOverride: true, horaSalidaOverride: true },
      },
      user: { select: { name: true, email: true } },
    },
  })
  if (!ingreso) return NextResponse.json({ message: 'Ingreso no encontrado' }, { status: 404 })
  if (ingreso.tipo !== 'ingreso') {
    return NextResponse.json({ message: 'Ese marcaje no es un ingreso' }, { status: 400 })
  }

  const esSupervisor = ingreso.jornadaAsistencia?.supervisorId === session.user.id
  if (!esSupervisor && !tieneRol(session, ROLES_ADMIN)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  // Una salida posterior al ingreso ya existe → no duplicar.
  const yaTiene = await prisma.asistencia.findFirst({
    where: {
      userId: ingreso.userId,
      tipo: 'salida',
      jornadaAsistenciaId: ingreso.jornadaAsistenciaId,
      fechaHora: { gt: ingreso.fechaHora },
    },
    select: { id: true, fechaHora: true },
  })
  if (yaTiene) {
    return NextResponse.json(
      { message: 'Esa persona ya tiene una salida registrada después de ese ingreso' },
      { status: 409 },
    )
  }

  // El día del ingreso en hora de Lima, no en UTC: un ingreso de las 07:49
  // locales es 12:49 UTC y coinciden, pero una salida de 19:00 locales cae al
  // día siguiente en UTC y tomaría la fecha equivocada.
  const diaLima = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ingreso.fechaHora)

  let fechaHora = new Date(`${diaLima}T${hora}:00-05:00`)
  // Turno nocturno: una salida anterior al ingreso es del día siguiente.
  if (fechaHora <= ingreso.fechaHora) {
    fechaHora = new Date(fechaHora.getTime() + 24 * 60 * 60 * 1000)
  }

  const fechaEsperada = await calcularFechaEsperada(
    fechaHora,
    'salida',
    ingreso.ubicacion,
    'empresa',
    'default',
    ingreso.jornadaAsistencia
      ? {
          horaIngresoOverride: ingreso.jornadaAsistencia.horaIngresoOverride,
          horaSalidaOverride: ingreso.jornadaAsistencia.horaSalidaOverride,
        }
      : null,
  )

  const salida = await prisma.asistencia.create({
    data: {
      userId: ingreso.userId,
      empleadoId: ingreso.empleadoId,
      ubicacionId: ingreso.ubicacionId,
      jornadaAsistenciaId: ingreso.jornadaAsistenciaId,
      tipo: 'salida',
      fechaHora,
      fechaEsperada,
      minutosTarde: 0,
      dentroGeofence: true,
      metodoMarcaje: 'manual_supervisor',
      supervisorMarcoId: session.user.id,
      dispositivoId: ingreso.dispositivoId,
      dispositivoEraNuevo: false,
      estado: 'a_tiempo',
      observacion: `Salida registrada manualmente por ${session.user.name || session.user.email} (${hora})`,
      banderas: ['salida_manual_supervisor'],
    },
  })

  return NextResponse.json({
    ok: true,
    id: salida.id,
    trabajador: ingreso.user?.name || ingreso.user?.email,
    fechaHora: salida.fechaHora,
  })
}
