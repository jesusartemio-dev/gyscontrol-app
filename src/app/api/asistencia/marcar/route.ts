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
  // Marcaje de visita externa (planta de cliente, obra no registrada, viaje).
  // Requiere GPS y un texto descriptivo del lugar.
  visitaExterna?: {
    lugar: string
  }
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

  // Si el usuario escanea un QR, prevalece sobre la modalidad remota.
  // Un remoto que va a oficina y escanea QR queda registrado como presencial
  // (el QR es evidencia física — mayor autoridad que la modalidad declarada).
  let qrOverrideRemoto = false
  if (body.qrPayload) {
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
      if (modoRemoto.esRemoto) qrOverrideRemoto = true
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
      if (modoRemoto.esRemoto) qrOverrideRemoto = true
    }
  }

  // Si escaneó QR y originalmente era remoto, anular el modo remoto para
  // que la validación y los cálculos siguientes lo traten como presencial.
  let esRemotoEfectivo = modoRemoto.esRemoto && !qrOverrideRemoto

  // Auto-asignación de sede oficial por GPS.
  // Regla de negocio: el lugar físico (oficina/planta/obra) tiene prioridad sobre la
  // modalidad declarada. Si un trabajador "remoto" está físicamente en una sede oficial,
  // el marcaje cuenta como presencial en esa sede, no como remoto.
  // Por eso buscamos sede cercana INCLUSO si la modalidad declarada es remota.
  const RADIO_AUTO_ASIGNACION = 500
  let llegadaASedePorGps = false
  if (!ubicacionId && body.latitud != null && body.longitud != null) {
    const ubicacionesActivas = await prisma.ubicacion.findMany({
      where: { activo: true },
      select: { id: true, latitud: true, longitud: true, radioMetros: true },
    })
    let mejor: { id: string; distancia: number } | null = null
    for (const u of ubicacionesActivas) {
      const d = haversineMetros(body.latitud, body.longitud, u.latitud, u.longitud)
      const umbral = Math.max(u.radioMetros, RADIO_AUTO_ASIGNACION)
      if (d <= umbral && (!mejor || d < mejor.distancia)) {
        mejor = { id: u.id, distancia: d }
      }
    }
    if (mejor) {
      ubicacionId = mejor.id
      llegadaASedePorGps = true
      // Override del modo remoto: si era remoto y el GPS lo pone físicamente en sede,
      // el marcaje es presencial. Queda bandera para trazabilidad (línea más abajo).
      if (esRemotoEfectivo) {
        esRemotoEfectivo = false
        qrOverrideRemoto = true
      }
      metodoMarcaje = 'gps_directo'
    }
  }

  // Visita externa: GPS obligatorio + lugar de texto. No requiere estar cerca de sede oficial.
  // Útil para visitas a planta de cliente, obras nuevas, viajes — quedan registradas con
  // evidencia GPS y descripción del lugar para que el supervisor las pueda auditar después.
  const esVisitaExterna = Boolean(body.visitaExterna && body.visitaExterna.lugar)
  if (esVisitaExterna && !modoRemoto.esConfianza) {
    if (body.latitud == null || body.longitud == null) {
      return NextResponse.json(
        { message: 'Para registrar visita externa necesitas activar el GPS' },
        { status: 400 },
      )
    }
    const lugar = (body.visitaExterna!.lugar || '').trim()
    if (lugar.length < 5) {
      return NextResponse.json(
        { message: 'Describe el lugar de la visita (mínimo 5 caracteres)' },
        { status: 400 },
      )
    }
    // La visita externa anula tanto la auto-asignación a sede oficial (si hubo)
    // como el modo remoto: lo que importa es que estuvo en otro lado declarado.
    ubicacionId = null
    metodoMarcaje = 'visita_externa'
    esRemotoEfectivo = false
  }

  // 🔒 Bloqueo anti-bypass: presencial sin QR, sin GPS y sin modalidad remota declarada
  // = saltarse el sistema. Confianza queda exenta (marcaje voluntario).
  if (
    !modoRemoto.esConfianza &&
    !esRemotoEfectivo &&
    !ubicacionId &&
    !esVisitaExterna &&
    (body.latitud == null || body.longitud == null)
  ) {
    return NextResponse.json(
      {
        message:
          'Necesitas activar el GPS o escanear un QR de tu sede para marcar. Si tu navegador bloqueó el permiso, actívalo en configuración.',
      },
      { status: 400 },
    )
  }

  // 🚧 Presencial con GPS pero sin sede cercana, sin visita externa y sin modalidad remota:
  // sugerirle al usuario que registre como visita externa o se acerque a una sede.
  // Devolvemos 409 con datos para que el cliente abra el flujo de visita externa.
  if (
    !modoRemoto.esConfianza &&
    !esRemotoEfectivo &&
    !ubicacionId &&
    !esVisitaExterna &&
    body.latitud != null &&
    body.longitud != null
  ) {
    return NextResponse.json(
      {
        message: 'No estás cerca de ninguna sede registrada.',
        codigo: 'fuera_de_toda_sede',
        sugerencia:
          'Si estás de visita en otra planta o cliente, márcalo como visita externa. Si no, acércate a tu sede.',
      },
      { status: 409 },
    )
  }

  // Evaluar geofence + distancia
  let dentroGeofence = true
  let distanciaMetros: number | null = null
  let ubicacionRemotaId: string | null = null
  let sedeRemotaNombre: string | null = null

  if (esVisitaExterna) {
    // Visita externa: el lugar lo declara el trabajador. No hay geofence contra qué validar,
    // pero queda lat/long de evidencia. Se considera "dentro" para no contar como infracción.
    dentroGeofence = true
  } else if (esRemotoEfectivo && !modoRemoto.esConfianza && body.latitud != null && body.longitud != null) {
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
  } else if (!esRemotoEfectivo && ubicacionId && body.latitud != null && body.longitud != null) {
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
  if (esRemotoEfectivo && modoRemoto.origen && !modoRemoto.esConfianza) {
    banderas.push(`remoto:${modoRemoto.origen}`)
  }
  // Trazabilidad: estaba en modo remoto declarado pero asistió físicamente (QR o GPS en sede)
  if (qrOverrideRemoto) {
    banderas.push('asistio_oficina_siendo_remoto')
  }
  // Trazabilidad: visita externa. Si además era remoto, dejamos la bandera de visita
  // (la visita prevalece) más una nota del origen remoto para auditoría.
  if (esVisitaExterna) {
    banderas.push('visita_externa')
    if (modoRemoto.esRemoto && modoRemoto.origen && !modoRemoto.esConfianza) {
      banderas.push(`era_remoto:${modoRemoto.origen}`)
    }
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
      observacion: esVisitaExterna
        ? (body.visitaExterna!.lugar || '').trim()
        : body.observacion || null,
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
  if (esVisitaExterna) {
    lineas.push(`📍 Visita externa: ${(body.visitaExterna!.lugar || '').trim()}`)
    if (modoRemoto.esRemoto && !modoRemoto.esConfianza) {
      lineas.push('ℹ️ Eras remoto hoy — quedó registrado como visita externa (prioridad)')
    }
  } else if (qrOverrideRemoto && ubicacionDatos) {
    lineas.push(`Ubicación: ${ubicacionDatos.nombre}`)
    lineas.push('ℹ️ Eras remoto hoy, pero llegaste a sede — quedaste como presencial')
  } else if (esRemotoEfectivo) {
    lineas.push(`Modo: trabajo remoto (${modoRemoto.razon})`)
    if (sedeRemotaNombre) {
      lineas.push(`Sede remota: ${sedeRemotaNombre}`)
    } else if (!modoRemoto.esConfianza) {
      lineas.push('ℹ️ No tienes una sede remota aprobada — registra una desde "Mi sede remota"')
    }
  } else if (ubicacionDatos) {
    lineas.push(`Ubicación: ${ubicacionDatos.nombre}`)
  } else if (!esRemotoEfectivo && !modoRemoto.esConfianza) {
    lineas.push('⚠️ No estás cerca de ninguna sede registrada')
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
