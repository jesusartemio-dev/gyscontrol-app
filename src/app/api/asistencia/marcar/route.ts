import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  calcularEstado,
  calcularFechaEsperada,
  determinarModoRemoto,
  obtenerSedeRemotaActiva,
  upsertDispositivo,
} from '@/lib/services/asistencia'
import { formatearTardanza } from '@/lib/utils/formatTardanza'
import { haversineMetros } from '@/lib/utils/geofence'
import { parsearPayloadQr, validarQrDinamico, validarQrEstatico } from '@/lib/utils/qrTotp'
import type { MetodoMarcaje, TipoMarcaje } from '@prisma/client'

interface MarcarBody {
  qrPayload?: string
  tipo: TipoMarcaje
  latitud?: number
  longitud?: number
  precisionGps?: number
  device: {
    fingerprint: string
    userAgent: string
    plataforma: string
    modelo: string | null
    resolucion: string
  }
  observacion?: string
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const userId = session.user.id
  const body = (await req.json()) as MarcarBody

  if (!body.tipo || !body.device?.fingerprint) {
    return NextResponse.json({ message: 'Datos incompletos' }, { status: 400 })
  }

  // Dedupe: si ya marcó el mismo tipo en los últimos 30 segundos, devolver el existente
  const hace30s = new Date(Date.now() - 30_000)
  const reciente = await prisma.asistencia.findFirst({
    where: { userId, tipo: body.tipo, fechaHora: { gte: hace30s } },
    orderBy: { fechaHora: 'desc' },
  })
  if (reciente) {
    const horaPrev = reciente.fechaHora.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    })
    return NextResponse.json({
      ok: true,
      asistencia: reciente,
      titulo: 'ℹ️ Ya registrado',
      mensaje: `Tu marcaje de ${body.tipo} ya fue registrado a las ${horaPrev}.`,
      lineas: [`Tu marcaje de ${body.tipo} ya fue registrado a las ${horaPrev}.`],
      hora: horaPrev,
    })
  }

  const { dispositivoId, eraNuevo } = await upsertDispositivo({
    userId,
    fingerprint: body.device.fingerprint,
    userAgent: body.device.userAgent,
    plataforma: body.device.plataforma,
    modelo: body.device.modelo,
    resolucion: body.device.resolucion,
  })

  // Determinar si el usuario está en modo remoto hoy
  const modoRemoto = await determinarModoRemoto(userId)

  let ubicacionId: string | null = null
  let jornadaAsistenciaId: string | null = null
  let jornadaOverride: { horaIngresoOverride: string | null; horaSalidaOverride: string | null } | null = null
  let metodoMarcaje: MetodoMarcaje = modoRemoto.esRemoto ? 'remoto' : 'gps_directo'

  // Procesar QR si viene (no aplica si es remoto — lo ignoramos)
  if (body.qrPayload && !modoRemoto.esRemoto) {
    const parsed = parsearPayloadQr(body.qrPayload)
    if (!parsed) {
      return NextResponse.json({ message: 'Código QR inválido' }, { status: 400 })
    }

    if (parsed.tipo === 'estatico') {
      const ubiIdCandidato = parsed.payload.split('.')[0]
      const u = await prisma.ubicacion.findUnique({ where: { id: ubiIdCandidato } })
      if (!u || !u.activo) {
        return NextResponse.json({ message: 'Ubicación del QR no válida' }, { status: 400 })
      }
      const valido = validarQrEstatico(u.qrSecret, parsed.payload)
      if (!valido) {
        return NextResponse.json({ message: 'QR adulterado' }, { status: 400 })
      }
      ubicacionId = u.id
      metodoMarcaje = 'qr_estatico'
    } else if (parsed.tipo === 'supervisor') {
      const [jornadaId, token] = parsed.payload.split('.')
      if (!jornadaId || !token) {
        return NextResponse.json({ message: 'QR supervisor inválido' }, { status: 400 })
      }
      const jornada = await prisma.jornadaAsistencia.findUnique({
        where: { id: jornadaId },
        include: { ubicacion: true },
      })
      if (!jornada || !jornada.activa) {
        return NextResponse.json({ message: 'Jornada no activa' }, { status: 400 })
      }
      if (!validarQrDinamico(jornada.qrSecret, jornada.id, token)) {
        return NextResponse.json({ message: 'QR caducado, escanea el nuevo' }, { status: 400 })
      }
      ubicacionId = jornada.ubicacionId
      jornadaAsistenciaId = jornada.id
      jornadaOverride = {
        horaIngresoOverride: jornada.horaIngresoOverride,
        horaSalidaOverride: jornada.horaSalidaOverride,
      }
      metodoMarcaje = 'qr_supervisor'
    }
  }

  // Si no escaneó QR pero es presencial y tiene GPS, auto-asignar la
  // ubicación activa más cercana dentro de un radio razonable (500m).
  // Así evitamos que queden sin ubicación cuando marcan "sin QR".
  const RADIO_AUTO_ASIGNACION = 500
  if (
    !ubicacionId &&
    !modoRemoto.esRemoto &&
    body.latitud != null &&
    body.longitud != null
  ) {
    const ubicacionesActivas = await prisma.ubicacion.findMany({
      where: { activo: true },
      select: { id: true, latitud: true, longitud: true, radioMetros: true },
    })
    let mejor: { id: string; distancia: number } | null = null
    for (const u of ubicacionesActivas) {
      const d = haversineMetros(body.latitud, body.longitud, u.latitud, u.longitud)
      // Aceptar si está dentro del radio de la ubicación O dentro de 500m
      // (lo que sea mayor — obras con radio amplio también aplican).
      const umbral = Math.max(u.radioMetros, RADIO_AUTO_ASIGNACION)
      if (d <= umbral && (!mejor || d < mejor.distancia)) {
        mejor = { id: u.id, distancia: d }
      }
    }
    if (mejor) {
      ubicacionId = mejor.id
      // El método sigue siendo gps_directo (para distinguir de los que sí escanearon QR).
    }
  }

  // Evaluar geofence + distancia
  let dentroGeofence = true
  let distanciaMetros: number | null = null
  let ubicacionRemotaId: string | null = null
  let sedeRemotaNombre: string | null = null

  if (modoRemoto.esRemoto && !modoRemoto.esConfianza && body.latitud != null && body.longitud != null) {
    // Validar contra la sede remota personal aprobada (si tiene)
    const sedeRemota = await obtenerSedeRemotaActiva(userId)
    if (sedeRemota) {
      distanciaMetros = haversineMetros(body.latitud, body.longitud, sedeRemota.latitud, sedeRemota.longitud)
      dentroGeofence = distanciaMetros <= sedeRemota.radioMetros
      ubicacionRemotaId = sedeRemota.id
      sedeRemotaNombre = sedeRemota.nombre
    }
    // Sin sede remota aprobada: se permite marcar pero queda como dentroGeofence=true
    // (no hay referencia contra qué validar). El admin debería pedirle que registre sede.
  } else if (!modoRemoto.esRemoto && ubicacionId && body.latitud != null && body.longitud != null) {
    const u = await prisma.ubicacion.findUnique({ where: { id: ubicacionId } })
    if (u) {
      distanciaMetros = haversineMetros(body.latitud, body.longitud, u.latitud, u.longitud)
      dentroGeofence = distanciaMetros <= u.radioMetros
    }
  }

  // Buscar empleado para FK opcional
  const empleado = await prisma.empleado.findUnique({ where: { userId } })

  const fechaHora = new Date()
  const ubicacionDatos = ubicacionId
    ? await prisma.ubicacion.findUnique({ where: { id: ubicacionId } })
    : null
  const fechaEsperada = await calcularFechaEsperada(
    fechaHora,
    body.tipo,
    ubicacionDatos,
    'empresa',
    'default',
    jornadaOverride,
  )

  // Personal de confianza: siempre a_tiempo, sin tardanza
  const { estado, minutosTarde, banderas } = modoRemoto.esConfianza
    ? { estado: 'a_tiempo' as const, minutosTarde: 0, banderas: ['confianza'] }
    : calcularEstado({
        fechaMarcaje: fechaHora,
        fechaEsperada,
        tipo: body.tipo,
        dentroGeofence,
        dispositivoEraNuevo: eraNuevo,
        toleranciaMinutos: ubicacionDatos?.toleranciaMinutos ?? 5,
        limiteTardeMinutos: ubicacionDatos?.limiteTardeMinutos ?? 30,
      })

  // Agregar bandera de trazabilidad cuando es remoto/confianza
  if (modoRemoto.esRemoto && modoRemoto.origen && !modoRemoto.esConfianza) {
    banderas.push(`remoto:${modoRemoto.origen}`)
  }

  const asistencia = await prisma.asistencia.create({
    data: {
      userId,
      empleadoId: empleado?.id || null,
      ubicacionId,
      jornadaAsistenciaId,
      tipo: body.tipo,
      fechaHora,
      fechaEsperada,
      minutosTarde,
      latitud: body.latitud ?? null,
      longitud: body.longitud ?? null,
      precisionGps: body.precisionGps ?? null,
      dentroGeofence,
      distanciaMetros,
      ubicacionRemotaId,
      metodoMarcaje,
      dispositivoId,
      dispositivoEraNuevo: eraNuevo,
      estado,
      observacion: body.observacion || null,
      banderas,
    },
  })

  const horaLima = fechaHora.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  })
  const tipoHumano =
    body.tipo === 'ingreso'
      ? 'Ingreso'
      : body.tipo === 'salida'
      ? 'Salida'
      : body.tipo === 'inicio_almuerzo'
      ? 'Inicio de almuerzo'
      : 'Regreso de almuerzo'

  const lineas: string[] = []
  lineas.push(`${tipoHumano} registrado a las ${horaLima}`)
  if (modoRemoto.esRemoto) {
    lineas.push(`Modo: trabajo remoto (${modoRemoto.razon})`)
    if (sedeRemotaNombre) {
      lineas.push(`Sede remota: ${sedeRemotaNombre}`)
    } else if (!modoRemoto.esConfianza) {
      lineas.push('ℹ️ No tienes una sede remota aprobada — registra una desde "Mi sede remota"')
    }
  } else if (ubicacionDatos) {
    lineas.push(`Ubicación: ${ubicacionDatos.nombre}`)
  }
  if (distanciaMetros != null) {
    lineas.push(`Distancia a sede: ${Math.round(distanciaMetros)} m`)
  }
  if (minutosTarde > 0) lineas.push(`Tardanza: ${formatearTardanza(minutosTarde)}`)
  if (!dentroGeofence) lineas.push('⚠️ Fuera del área permitida (quedó en reporte)')
  if (eraNuevo) lineas.push('⚠️ Dispositivo nuevo — requiere aprobación del supervisor')

  return NextResponse.json({
    ok: true,
    asistencia,
    titulo: '✅ Marcaje guardado',
    mensaje: lineas.join('\n'),
    lineas,
    hora: horaLima,
  })
}
