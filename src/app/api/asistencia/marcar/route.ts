import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  calcularEstado,
  calcularFechaEsperada,
  determinarModoRemoto,
  upsertDispositivo,
} from '@/lib/services/asistencia'
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
      metodoMarcaje = 'qr_supervisor'
    }
  }

  // Evaluar geofence (no aplica en modo remoto — se fuerza a true)
  let dentroGeofence = true
  if (!modoRemoto.esRemoto && ubicacionId && body.latitud != null && body.longitud != null) {
    const u = await prisma.ubicacion.findUnique({ where: { id: ubicacionId } })
    if (u) {
      const distancia = haversineMetros(body.latitud, body.longitud, u.latitud, u.longitud)
      dentroGeofence = distancia <= u.radioMetros
    }
  }

  // Buscar empleado para FK opcional
  const empleado = await prisma.empleado.findUnique({ where: { userId } })

  const fechaHora = new Date()
  const ubicacionDatos = ubicacionId
    ? await prisma.ubicacion.findUnique({ where: { id: ubicacionId } })
    : null
  const fechaEsperada = await calcularFechaEsperada(fechaHora, body.tipo, ubicacionDatos)

  const { estado, minutosTarde, banderas } = calcularEstado({
    fechaMarcaje: fechaHora,
    fechaEsperada,
    tipo: body.tipo,
    dentroGeofence,
    dispositivoEraNuevo: eraNuevo,
    toleranciaMinutos: ubicacionDatos?.toleranciaMinutos ?? 5,
    limiteTardeMinutos: ubicacionDatos?.limiteTardeMinutos ?? 30,
  })

  // Agregar bandera de trazabilidad cuando es remoto
  if (modoRemoto.esRemoto && modoRemoto.origen) {
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
  } else if (ubicacionDatos) {
    lineas.push(`Ubicación: ${ubicacionDatos.nombre}`)
  }
  if (minutosTarde > 0) lineas.push(`Tardanza: ${minutosTarde} minutos`)
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
