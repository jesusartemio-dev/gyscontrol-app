// Cálculo del cronograma por horas laborables, como MS Project.
//
// Convención de fechas: "hora de obra". Los DateTime guardan la hora tal cual
// en obra (08:00 = 8 de la mañana) en los campos UTC, sin zona horaria — igual
// que MS Project, que no maneja zonas. Por eso todo aquí se lee con getUTC*.
//
// La jornada sale del calendario laboral: mañana y tarde por defecto, con
// configuración por día de semana (DiaCalendario) y excepciones por fecha
// (feriados, días no laborables, o días extra con su propio horario, p. ej.
// una parada de 07:00 a 19:00).

import type { CalendarioDesplazamiento } from './cronogramaDesplazamiento'

const DIA_MS = 86400000
const MIN_MS = 60000
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
// Tope de iteraciones (días) para no colgar el request con un calendario sin jornada.
const MAX_DIAS = 3660

/** Calendario con jornada. Los campos de hora son "HH:MM". */
export interface CalendarioHoras extends CalendarioDesplazamiento {
  horasPorDia?: number
  horaInicioManana?: string
  horaFinManana?: string
  horaInicioTarde?: string
  horaFinTarde?: string
  diaCalendario: {
    diaSemana: string
    esLaborable: boolean
    horaInicioManana?: string | null
    horaFinManana?: string | null
    horaInicioTarde?: string | null
    horaFinTarde?: string | null
  }[]
  excepcionCalendario: { fecha: Date; tipo: string; horaInicio?: string | null; horaFin?: string | null }[]
}

/** Intervalo de trabajo dentro de un día, en minutos desde las 00:00. */
type Intervalo = [number, number]

const aMinutos = (hhmm: string | null | undefined): number | null => {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

const inicioDia = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
const claveDia = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Mañana + tarde → intervalos válidos (se unen si se tocan o se superponen). */
function intervalosDesdeJornada(m1: number | null, m2: number | null, t1: number | null, t2: number | null): Intervalo[] {
  const lista: Intervalo[] = []
  if (m1 !== null && m2 !== null && m2 > m1) lista.push([m1, m2])
  if (t1 !== null && t2 !== null && t2 > t1) lista.push([t1, t2])
  lista.sort((a, b) => a[0] - b[0])
  const unidos: Intervalo[] = []
  for (const iv of lista) {
    const ult = unidos[unidos.length - 1]
    if (ult && iv[0] <= ult[1]) ult[1] = Math.max(ult[1], iv[1])
    else unidos.push([...iv] as Intervalo)
  }
  return unidos
}

const JORNADA_POR_DEFECTO = { m1: 8 * 60, m2: 12 * 60, t1: 13 * 60, t2: 17 * 60 }

function jornadaBase(cal: CalendarioHoras): Intervalo[] {
  const m1 = aMinutos(cal.horaInicioManana) ?? JORNADA_POR_DEFECTO.m1
  const m2 = aMinutos(cal.horaFinManana) ?? JORNADA_POR_DEFECTO.m2
  const t1 = aMinutos(cal.horaInicioTarde) ?? JORNADA_POR_DEFECTO.t1
  const t2 = aMinutos(cal.horaFinTarde) ?? JORNADA_POR_DEFECTO.t2
  return intervalosDesdeJornada(m1, m2, t1, t2)
}

/** Intervalos de trabajo de un día (vacío si no es laborable). */
export function intervalosDelDia(cal: CalendarioHoras, dia: Date): Intervalo[] {
  const ms = inicioDia(dia)
  const clave = claveDia(ms)
  const excepcion = cal.excepcionCalendario.find((e) => claveDia(inicioDia(new Date(e.fecha))) === clave)
  if (excepcion) {
    if (excepcion.tipo !== 'dia_laboral_extra') return []
    const ini = aMinutos(excepcion.horaInicio)
    const fin = aMinutos(excepcion.horaFin)
    return ini !== null && fin !== null && fin > ini ? [[ini, fin]] : jornadaBase(cal)
  }
  const diaSemana = DIAS_SEMANA[new Date(ms).getUTCDay()]
  const config = cal.diaCalendario.find((d) => d.diaSemana === diaSemana)
  if (config) {
    if (!config.esLaborable) return []
    const base = jornadaBase(cal)
    const tieneHorario = config.horaInicioManana || config.horaFinManana || config.horaInicioTarde || config.horaFinTarde
    if (!tieneHorario) return base
    return intervalosDesdeJornada(
      aMinutos(config.horaInicioManana), aMinutos(config.horaFinManana),
      aMinutos(config.horaInicioTarde), aMinutos(config.horaFinTarde),
    )
  }
  return cal.diasLaborables.includes(diaSemana) ? jornadaBase(cal) : []
}

/** Horas laborables de una jornada completa del calendario (para pasar horas ↔ días). */
export function horasPorDiaCalendario(cal: CalendarioHoras): number {
  if (cal.horasPorDia && cal.horasPorDia > 0) return cal.horasPorDia
  return jornadaBase(cal).reduce((s, [a, b]) => s + (b - a), 0) / 60 || 8
}

/** Horas laborables entre dos instantes (0 si fin <= inicio). */
export function horasLaborablesEntre(cal: CalendarioHoras, inicio: Date, fin: Date): number {
  if (fin.getTime() <= inicio.getTime()) return 0
  let minutos = 0
  let dia = inicioDia(inicio)
  const ultimo = inicioDia(fin)
  for (let i = 0; dia <= ultimo && i < MAX_DIAS; i++, dia += DIA_MS) {
    for (const [a, b] of intervalosDelDia(cal, new Date(dia))) {
      const desde = Math.max(dia + a * MIN_MS, inicio.getTime())
      const hasta = Math.min(dia + b * MIN_MS, fin.getTime())
      if (hasta > desde) minutos += (hasta - desde) / MIN_MS
    }
  }
  return minutos / 60
}

/**
 * Primer momento laborable desde `t` (inclusive). Si `t` cae justo al final de
 * un tramo (p. ej. 12:00), salta al siguiente (13:00): es donde arranca lo
 * que va "después de" algo que terminó en `t`.
 */
export function siguienteMomentoLaborable(cal: CalendarioHoras, t: Date): Date {
  let dia = inicioDia(t)
  for (let i = 0; i < MAX_DIAS; i++, dia += DIA_MS) {
    for (const [a, b] of intervalosDelDia(cal, new Date(dia))) {
      const ini = dia + a * MIN_MS
      const fin = dia + b * MIN_MS
      if (t.getTime() < ini) return new Date(ini)
      if (t.getTime() < fin) return new Date(t.getTime())
    }
  }
  return t
}

/**
 * Suma `horas` laborables a `inicio` (como Fin = Inicio + Duración en MS Project).
 * Si el trabajo termina justo al final de un tramo, devuelve ese final (12:00 o
 * 18:30), no el inicio del siguiente. Con 0 horas devuelve `inicio` (un hito).
 */
export function sumarHorasLaborables(cal: CalendarioHoras, inicio: Date, horas: number): Date {
  if (!(horas > 0)) return inicio
  let restante = Math.round(horas * 60)
  let dia = inicioDia(inicio)
  for (let i = 0; i < MAX_DIAS; i++, dia += DIA_MS) {
    for (const [a, b] of intervalosDelDia(cal, new Date(dia))) {
      const desde = Math.max(dia + a * MIN_MS, inicio.getTime())
      const hasta = dia + b * MIN_MS
      if (hasta <= desde) continue
      const disponible = (hasta - desde) / MIN_MS
      if (restante <= disponible) return new Date(desde + restante * MIN_MS)
      restante -= disponible
    }
  }
  return inicio
}

/**
 * Resta `horas` laborables a `fin` (inverso de sumarHorasLaborables). Si cae
 * justo al inicio de un tramo, devuelve ese inicio (08:00 o 13:00).
 */
export function restarHorasLaborables(cal: CalendarioHoras, fin: Date, horas: number): Date {
  if (!(horas > 0)) return fin
  let restante = Math.round(horas * 60)
  let dia = inicioDia(fin)
  for (let i = 0; i < MAX_DIAS; i++, dia -= DIA_MS) {
    const tramos = intervalosDelDia(cal, new Date(dia))
    for (let k = tramos.length - 1; k >= 0; k--) {
      const [a, b] = tramos[k]
      const desde = dia + a * MIN_MS
      const hasta = Math.min(dia + b * MIN_MS, fin.getTime())
      if (hasta <= desde) continue
      const disponible = (hasta - desde) / MIN_MS
      if (restante <= disponible) return new Date(hasta - restante * MIN_MS)
      restante -= disponible
    }
  }
  return fin
}

/** Horas laborables con signo para ir de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diferenciaHorasLaborables(cal: CalendarioHoras, desde: Date, hasta: Date): number {
  return hasta >= desde ? horasLaborablesEntre(cal, desde, hasta) : -horasLaborablesEntre(cal, hasta, desde)
}

/**
 * Mueve una fecha `deltaHoras` laborables (con signo). Es lo que se aplica a
 * cada fecha al mover un bloque. Inicio y fin se tratan distinto, como en MS Project:
 * - un inicio nunca queda en el cierre de un tramo: pasa al siguiente momento
 *   laborable (18:30 → 08:00 del día laborable siguiente);
 * - un fin nunca queda en la apertura de un tramo: vuelve al cierre del tramo
 *   anterior (08:00 → 18:30 del día laborable anterior).
 */
export function desplazarHorasLaborables(
  cal: CalendarioHoras,
  t: Date,
  deltaHoras: number,
  extremo: 'inicio' | 'fin',
): Date {
  if (deltaHoras === 0) return t
  const r = deltaHoras > 0
    ? sumarHorasLaborables(cal, extremo === 'inicio' ? siguienteMomentoLaborable(cal, t) : t, deltaHoras)
    : restarHorasLaborables(cal, t, -deltaHoras)
  if (extremo === 'inicio') return siguienteMomentoLaborable(cal, r)
  const trabajaAntes = horasLaborablesEntre(cal, new Date(r.getTime() - MIN_MS), r) > 0
  const trabajaDespues = horasLaborablesEntre(cal, r, new Date(r.getTime() + MIN_MS)) > 0
  if (!trabajaAntes && trabajaDespues) {
    return new Date(restarHorasLaborables(cal, r, 1 / 60).getTime() + MIN_MS)
  }
  return r
}

/**
 * Cómo mover un instante suelto (un hito): si cae en el cierre de un tramo
 * (justo cuando terminó algo, p. ej. 18:30) se mueve como un fin; si no, como
 * un inicio. Así un hito a fin de jornada sigue a fin de jornada.
 */
export function extremoDeInstante(cal: CalendarioHoras, t: Date): 'inicio' | 'fin' {
  const trabajaDespues = horasLaborablesEntre(cal, t, new Date(t.getTime() + MIN_MS)) > 0
  return trabajaDespues ? 'inicio' : 'fin'
}

/** Inicio y fin de la jornada de un día (si no es laborable, los de la jornada base). */
export function inicioJornada(cal: CalendarioHoras, dia: Date): Date {
  const iv = intervalosDelDia(cal, dia)
  const [a] = iv.length > 0 ? iv[0] : jornadaBase(cal)[0] ?? [JORNADA_POR_DEFECTO.m1]
  return new Date(inicioDia(dia) + a * MIN_MS)
}
export function finJornada(cal: CalendarioHoras, dia: Date): Date {
  const iv = intervalosDelDia(cal, dia)
  const ult = iv.length > 0 ? iv[iv.length - 1] : jornadaBase(cal).slice(-1)[0] ?? [0, JORNADA_POR_DEFECTO.t2]
  return new Date(inicioDia(dia) + ult[1] * MIN_MS)
}

/**
 * Fecha recibida de un formulario. "YYYY-MM-DD" (solo día) se lleva al inicio
 * o al fin de la jornada de ese día; con hora, se respeta tal cual (hora de obra).
 */
export function fechaDeFormulario(cal: CalendarioHoras, valor: string, extremo: 'inicio' | 'fin'): Date {
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())
  if (soloDia) {
    const dia = new Date(`${valor.trim()}T00:00:00Z`)
    return extremo === 'inicio' ? inicioJornada(cal, dia) : finJornada(cal, dia)
  }
  // "YYYY-MM-DDTHH:MM" sin zona → hora de obra. Con zona (ISO completo) → tal cual.
  const conHoraSinZona = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(valor.trim())
  return new Date(conHoraSinZona ? `${valor.trim()}Z` : valor)
}

/** Duración para mostrar, como MS Project: "0d", "4h", "1.5d", "12d". */
export function formatearDuracion(horas: number, horasPorDia: number): string {
  if (!(horas > 0)) return '0d'
  if (horas < horasPorDia) return `${Math.round(horas * 10) / 10}h`
  return `${Math.round((horas / horasPorDia) * 10) / 10}d`
}
