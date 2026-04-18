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
  const banderas: string[] = []
  const diffMs = input.fechaMarcaje.getTime() - input.fechaEsperada.getTime()
  const minutosTarde = Math.max(0, Math.round(diffMs / 60000))

  if (!input.dentroGeofence) banderas.push('fuera_zona')
  if (input.dispositivoEraNuevo) banderas.push('dispositivo_nuevo')

  // Para salida, no se calcula "tarde" — queda a_tiempo si marcó.
  if (input.tipo === 'salida' || input.tipo === 'inicio_almuerzo' || input.tipo === 'fin_almuerzo') {
    let estado: EstadoMarcaje = 'a_tiempo'
    if (!input.dentroGeofence) estado = 'fuera_zona'
    else if (input.dispositivoEraNuevo) estado = 'dispositivo_nuevo'
    return { estado, minutosTarde: 0, banderas }
  }

  let estado: EstadoMarcaje
  if (minutosTarde <= input.toleranciaMinutos) estado = 'a_tiempo'
  else if (minutosTarde <= input.limiteTardeMinutos) estado = 'tarde'
  else estado = 'muy_tarde'

  if (minutosTarde > input.toleranciaMinutos) banderas.push('tarde')

  // Si hay fuera_zona o dispositivo_nuevo y el estado base era a_tiempo, degradar a la bandera
  if (!input.dentroGeofence && estado === 'a_tiempo') estado = 'fuera_zona'
  else if (input.dispositivoEraNuevo && estado === 'a_tiempo') estado = 'dispositivo_nuevo'

  return { estado, minutosTarde, banderas }
}

/**
 * Calcula la fecha esperada (hora de ingreso) para un marcaje según el
 * calendario laboral del proyecto/empresa.
 */
export async function calcularFechaEsperada(
  fechaMarcaje: Date,
  tipo: TipoMarcaje,
  entidadTipo = 'empresa',
  entidadId = 'default',
): Promise<Date> {
  const calendario = await obtenerCalendarioLaboral(entidadTipo, entidadId)
  const horaDefault = tipo === 'ingreso' ? '08:00' : tipo === 'salida' ? '18:00' : '13:00'
  const hhmm =
    tipo === 'ingreso'
      ? calendario?.horaInicioManana || horaDefault
      : tipo === 'salida'
      ? calendario?.horaFinTarde || horaDefault
      : tipo === 'inicio_almuerzo'
      ? calendario?.horaFinManana || '13:00'
      : calendario?.horaInicioTarde || '14:00'

  const [h, m] = hhmm.split(':').map(Number)
  const esperada = new Date(fechaMarcaje)
  esperada.setHours(h, m, 0, 0)
  return esperada
}

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
