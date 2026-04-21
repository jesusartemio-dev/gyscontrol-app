import { prisma } from '@/lib/prisma'
import type { EstadoMarcaje, TipoMarcaje } from '@prisma/client'
import { obtenerCalendarioLaboral } from '@/lib/utils/calendarioLaboral'
import { haversineMetros } from '@/lib/utils/geofence'

interface CalcularEstadoInput {
  fechaMarcaje: Date
  fechaEsperada: Date
  tipo: TipoMarcaje
  dentroGeofence: boolean
  dispositivoEraNuevo: boolean
  toleranciaMinutos: number
  limiteTardeMinutos: number
}

export interface CalcularEstadoResult {
  estado: EstadoMarcaje
  minutosTarde: number
  banderas: string[]
}

export function calcularEstado(input: CalcularEstadoInput): CalcularEstadoResult {
  // `estado` SOLO refleja puntualidad (a_tiempo / tarde / muy_tarde).
  // Las alertas (fuera_zona, dispositivo_nuevo) van exclusivamente en `banderas[]`.
  const banderas: string[] = []
  const diffMs = input.fechaMarcaje.getTime() - input.fechaEsperada.getTime()
  const minutosTarde = Math.max(0, Math.round(diffMs / 60000))

  if (!input.dentroGeofence) banderas.push('fuera_zona')
  if (input.dispositivoEraNuevo) banderas.push('dispositivo_nuevo')

  // Para salida y almuerzos, no se calcula "tarde" — queda a_tiempo si marcó.
  if (input.tipo === 'salida' || input.tipo === 'inicio_almuerzo' || input.tipo === 'fin_almuerzo') {
    return { estado: 'a_tiempo', minutosTarde: 0, banderas }
  }

  let estado: EstadoMarcaje
  if (minutosTarde <= input.toleranciaMinutos) estado = 'a_tiempo'
  else if (minutosTarde <= input.limiteTardeMinutos) estado = 'tarde'
  else estado = 'muy_tarde'

  if (minutosTarde > input.toleranciaMinutos) banderas.push('tarde')

  return { estado, minutosTarde, banderas }
}

/**
 * Calcula la fecha esperada (hora de ingreso/salida) para un marcaje.
 * Prioridad: override de jornada > horario de la Ubicación > CalendarioLaboral > default.
 */
export async function calcularFechaEsperada(
  fechaMarcaje: Date,
  tipo: TipoMarcaje,
  ubicacion?: { horaIngreso: string | null; horaSalida: string | null } | null,
  entidadTipo = 'empresa',
  entidadId = 'default',
  jornadaOverride?: { horaIngresoOverride: string | null; horaSalidaOverride: string | null } | null,
): Promise<Date> {
  let hhmm: string | null = null

  // Prioridad 1: override de la jornada del supervisor (turno B excepcional)
  if (jornadaOverride) {
    if (tipo === 'ingreso' && jornadaOverride.horaIngresoOverride) hhmm = jornadaOverride.horaIngresoOverride
    if (tipo === 'salida' && jornadaOverride.horaSalidaOverride) hhmm = jornadaOverride.horaSalidaOverride
  }

  // Prioridad 2: horario de la ubicación
  if (!hhmm && ubicacion) {
    if (tipo === 'ingreso' && ubicacion.horaIngreso) hhmm = ubicacion.horaIngreso
    if (tipo === 'salida' && ubicacion.horaSalida) hhmm = ubicacion.horaSalida
  }

  if (!hhmm) {
    const calendario = await obtenerCalendarioLaboral(entidadTipo, entidadId)
    if (tipo === 'ingreso') hhmm = calendario?.horaInicioManana || '08:00'
    else if (tipo === 'salida') hhmm = calendario?.horaFinTarde || '18:00'
    else if (tipo === 'inicio_almuerzo') hhmm = calendario?.horaFinManana || '13:00'
    else hhmm = calendario?.horaInicioTarde || '14:00'
  }

  const [h, m] = (hhmm || '08:00').split(':').map(Number)
  // Construir fecha esperada en zona horaria Lima (UTC-5) para evitar
  // que en el servidor (UTC) se interprete como UTC.
  const fechaLima = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fechaMarcaje)
  const esperada = new Date(
    `${fechaLima}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-05:00`,
  )
  return esperada
}

export { formatearTardanza } from '@/lib/utils/formatTardanza'

/**
 * Retrieve or create a Dispositivo for user+fingerprint.
 * Returns the device and whether it was newly created.
 */
export async function upsertDispositivo(params: {
  userId: string
  fingerprint: string
  userAgent: string
  plataforma: string
  modelo: string | null
  resolucion: string
}): Promise<{ dispositivoId: string; eraNuevo: boolean }> {
  const existente = await prisma.dispositivo.findUnique({
    where: { userId_fingerprint: { userId: params.userId, fingerprint: params.fingerprint } },
  })
  if (existente) {
    await prisma.dispositivo.update({
      where: { id: existente.id },
      data: { ultimaVez: new Date() },
    })
    return { dispositivoId: existente.id, eraNuevo: !existente.aprobado }
  }
  const creado = await prisma.dispositivo.create({
    data: {
      userId: params.userId,
      fingerprint: params.fingerprint,
      userAgent: params.userAgent,
      plataforma: params.plataforma,
      modelo: params.modelo,
      resolucion: params.resolucion,
      aprobado: false,
    },
  })
  return { dispositivoId: creado.id, eraNuevo: true }
}

/**
 * Check if a point is within a location geofence.
 */
export async function validarGeofenceUbicacion(
  ubicacionId: string,
  lat: number,
  lon: number,
): Promise<{ dentro: boolean; distanciaMetros: number }> {
  const u = await prisma.ubicacion.findUnique({ where: { id: ubicacionId } })
  if (!u) return { dentro: false, distanciaMetros: Infinity }
  const distancia = haversineMetros(lat, lon, u.latitud, u.longitud)
  return { dentro: distancia <= u.radioMetros, distanciaMetros: distancia }
}

/**
 * Obtiene la sede remota aprobada y vigente de un usuario (si existe).
 * Se usa para validar geofence en marcajes remotos.
 */
export async function obtenerSedeRemotaActiva(userId: string) {
  return prisma.ubicacionRemotaPersonal.findFirst({
    where: {
      userId,
      estado: 'aprobada',
    },
    orderBy: { vigenciaDesde: 'desc' },
  })
}

export type OrigenRemoto = 'solicitud' | 'modalidad_fija' | 'modalidad_hibrida'

export interface ModoRemotoResult {
  esRemoto: boolean
  esConfianza?: boolean
  origen?: OrigenRemoto
  solicitudId?: string
  razon?: string
}

const DIAS_ENUM: Array<'domingo' | 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'> = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
]

/**
 * Determina si un usuario está en modo remoto para la fecha dada.
 * Orden: 1) solicitud aprobada vigente, 2) modalidad=remoto, 3) hibrido con día en diasRemoto.
 */
export async function determinarModoRemoto(
  userId: string,
  fecha: Date = new Date(),
): Promise<ModoRemotoResult> {
  const inicioDia = new Date(fecha)
  inicioDia.setHours(0, 0, 0, 0)

  const solicitud = await prisma.solicitudTrabajoRemoto.findFirst({
    where: {
      solicitanteId: userId,
      estado: 'aprobado',
      fechaInicio: { lte: inicioDia },
      fechaFin: { gte: inicioDia },
    },
    select: { id: true, descripcion: true },
  })
  if (solicitud) {
    return {
      esRemoto: true,
      origen: 'solicitud',
      solicitudId: solicitud.id,
      razon: solicitud.descripcion || 'Solicitud aprobada',
    }
  }

  const empleado = await prisma.empleado.findUnique({
    where: { userId },
    select: { modalidadTrabajo: true, diasRemoto: true },
  })
  if (!empleado) return { esRemoto: false }

  if (empleado.modalidadTrabajo === 'confianza') {
    return { esRemoto: true, esConfianza: true, origen: 'modalidad_fija', razon: 'Personal de confianza' }
  }

  if (empleado.modalidadTrabajo === 'remoto') {
    return { esRemoto: true, origen: 'modalidad_fija', razon: '100% remoto' }
  }

  if (empleado.modalidadTrabajo === 'hibrido') {
    const dia = DIAS_ENUM[fecha.getDay()]
    if (empleado.diasRemoto.includes(dia as any)) {
      return {
        esRemoto: true,
        origen: 'modalidad_hibrida',
        razon: `Día remoto (${dia})`,
      }
    }
  }

  return { esRemoto: false }
}
