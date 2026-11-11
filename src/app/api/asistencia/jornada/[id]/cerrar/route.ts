import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularFechaEsperada } from '@/lib/services/asistencia'

interface SalidaManual {
  userId: string
  /** "HH:mm" en hora de la sede. */
  hora: string
}

/**
 * Cierra una sesión de asistencia.
 *
 * Si queda gente con ingreso y sin salida, no cierra: responde 409 con la
 * lista para que el supervisor indique a qué hora se fue cada uno. Dejarla
 * cerrar sin más convertía esos ingresos en huérfanos, sin forma de repararlos
 * desde la pantalla.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const salidasManuales: SalidaManual[] = Array.isArray(body?.salidas) ? body.salidas : []

  const jornada = await prisma.jornadaAsistencia.findUnique({
    where: { id },
    include: {
      ubicacion: true,
      asistencias: {
        select: {
          userId: true, tipo: true, fechaHora: true, empleadoId: true,
          ubicacionId: true, dispositivoId: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { fechaHora: 'asc' },
      },
    },
  })
  if (!jornada) return NextResponse.json({ message: 'No encontrada' }, { status: 404 })
  if (jornada.supervisorId !== session.user.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const ingresos = jornada.asistencias.filter(a => a.tipo === 'ingreso')
  const conSalida = new Set(jornada.asistencias.filter(a => a.tipo === 'salida').map(a => a.userId))

  // Primer ingreso de cada persona que aún no tiene salida
  const pendientes = new Map<string, (typeof ingresos)[number]>()
  for (const i of ingresos) {
    if (!conSalida.has(i.userId) && !pendientes.has(i.userId)) pendientes.set(i.userId, i)
  }

  const horaPorUser = new Map(
    salidasManuales
      .filter(s => s.userId && /^\d{2}:\d{2}$/.test(String(s.hora ?? '')))
      .map(s => [s.userId, s.hora]),
  )

  const sinHora = [...pendientes.values()].filter(i => !horaPorUser.has(i.userId))
  if (sinHora.length > 0) {
    return NextResponse.json(
      {
        message: 'Hay personal sin marcar salida',
        // La hora oficial de salida sirve de valor por defecto en el diálogo.
        horaSugerida: jornada.horaSalidaOverride || jornada.ubicacion?.horaSalida || '',
        pendientes: sinHora.map(i => ({
          userId: i.userId,
          nombre: i.user?.name || i.user?.email || i.userId,
          horaIngreso: i.fechaHora.toISOString(),
        })),
      },
      { status: 409 },
    )
  }

  // Día de la sesión en hora de la sede: `fecha` se guarda al mediodía UTC
  // justamente para que esta lectura no se corra un día.
  const diaSede = jornada.fecha.toISOString().slice(0, 10)

  const creadas: string[] = []
  for (const ingreso of pendientes.values()) {
    const hora = horaPorUser.get(ingreso.userId)!
    let fechaHora = new Date(`${diaSede}T${hora}:00-05:00`)
    // Turno nocturno: una salida anterior al ingreso es del día siguiente.
    if (fechaHora <= ingreso.fechaHora) {
      fechaHora = new Date(fechaHora.getTime() + 24 * 60 * 60 * 1000)
    }

    const fechaEsperada = await calcularFechaEsperada(
      fechaHora,
      'salida',
      jornada.ubicacion,
      'empresa',
      'default',
      {
        horaIngresoOverride: jornada.horaIngresoOverride,
        horaSalidaOverride: jornada.horaSalidaOverride,
      },
    )

    await prisma.asistencia.create({
      data: {
        userId: ingreso.userId,
        empleadoId: ingreso.empleadoId,
        ubicacionId: ingreso.ubicacionId,
        jornadaAsistenciaId: jornada.id,
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
        observacion: `Salida registrada por el supervisor al cerrar la asistencia (${hora})`,
        banderas: ['salida_manual_supervisor'],
      },
    })
    creadas.push(ingreso.userId)
  }

  const cerrada = await prisma.jornadaAsistencia.update({
    where: { id },
    data: { activa: false, cerradaEn: new Date() },
  })
  return NextResponse.json({ ...cerrada, salidasCreadas: creadas.length })
}
