// Dependencias entre tareas del cronograma de proyecto, como MS Project:
// tipo (FC, CC, FF, CF) y desfase en tiempo laborable. GYS trabaja en modo
// manual: una dependencia no mueve fechas sola. Aquí se calcula dónde DEBERÍA
// ir la sucesora, para avisar cuando no se cumple y para "Ajustar sucesora".

import { prisma } from '@/lib/prisma'
import {
  type CalendarioHoras,
  desplazarHorasLaborables,
  horasLaborablesEntre,
  restarHorasLaborables,
  siguienteMomentoLaborable,
  sumarHorasLaborables,
} from './cronogramaHoras'

export type TipoDependencia = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'

export const ABREVIATURA_DEPENDENCIA: Record<TipoDependencia, string> = {
  finish_to_start: 'FC',
  start_to_start: 'CC',
  finish_to_finish: 'FF',
  start_to_finish: 'CF',
}

interface Rango { inicio: Date; fin: Date }

/** Mueve `t` el desfase (en minutos laborables, con signo) tratándolo como inicio o fin. */
function aplicarDesfase(cal: CalendarioHoras, t: Date, lagMinutos: number, extremo: 'inicio' | 'fin'): Date {
  if (!lagMinutos) return extremo === 'inicio' ? siguienteMomentoLaborable(cal, t) : t
  return desplazarHorasLaborables(cal, t, lagMinutos / 60, extremo)
}

/**
 * Fechas que debería tener la sucesora para cumplir la dependencia, conservando
 * su duración (horas laborables). Un hito (duración 0) queda en el instante.
 */
export function fechasRequeridas(
  cal: CalendarioHoras,
  dep: { tipo: string; lagMinutos?: number | null },
  pred: Rango,
  duracionHoras: number,
): Rango {
  const lag = dep.lagMinutos ?? 0
  switch (dep.tipo as TipoDependencia) {
    case 'start_to_start': {
      const inicio = aplicarDesfase(cal, pred.inicio, lag, 'inicio')
      return { inicio, fin: sumarHorasLaborables(cal, inicio, duracionHoras) }
    }
    case 'finish_to_finish': {
      const fin = aplicarDesfase(cal, pred.fin, lag, 'fin')
      return { inicio: restarHorasLaborables(cal, fin, duracionHoras), fin }
    }
    case 'start_to_finish': {
      const fin = aplicarDesfase(cal, pred.inicio, lag, 'fin')
      return { inicio: restarHorasLaborables(cal, fin, duracionHoras), fin }
    }
    case 'finish_to_start':
    default: {
      // Un hito va justo cuando termina la predecesora (no al día siguiente).
      const inicio = duracionHoras > 0 || lag
        ? aplicarDesfase(cal, pred.fin, lag, 'inicio')
        : pred.fin
      return { inicio, fin: sumarHorasLaborables(cal, inicio, duracionHoras) }
    }
  }
}

/**
 * Horas laborables que la sucesora va ANTES de lo que exige la dependencia
 * (0 si se cumple). Como en modo manual de MS Project, ir después no es error.
 */
export function horasIncumplidas(
  cal: CalendarioHoras,
  dep: { tipo: string; lagMinutos?: number | null },
  pred: Rango,
  suc: Rango,
): number {
  const duracion = horasLaborablesEntre(cal, suc.inicio, suc.fin)
  const req = fechasRequeridas(cal, dep, pred, duracion)
  const tipo = dep.tipo as TipoDependencia
  const real = tipo === 'finish_to_finish' || tipo === 'start_to_finish' ? suc.fin : suc.inicio
  const exigido = tipo === 'finish_to_finish' || tipo === 'start_to_finish' ? req.fin : req.inicio
  // En tiempo laborable: empezar a las 12:00 cuando lo exigido es 13:00 (almuerzo
  // de por medio) o a las 18:30 en vez de las 08:00 del día siguiente es lo mismo.
  if (real.getTime() >= exigido.getTime()) return 0
  return horasLaborablesEntre(cal, real, exigido)
}

/**
 * Holgura: horas laborables que la sucesora va DESPUÉS de lo que exige la
 * dependencia (0 si va justo o antes). Sirve para ofrecer "Ajustar" y acercarla.
 */
export function horasHolgura(
  cal: CalendarioHoras,
  dep: { tipo: string; lagMinutos?: number | null },
  pred: Rango,
  suc: Rango,
): number {
  const duracion = horasLaborablesEntre(cal, suc.inicio, suc.fin)
  const req = fechasRequeridas(cal, dep, pred, duracion)
  const tipo = dep.tipo as TipoDependencia
  const real = tipo === 'finish_to_finish' || tipo === 'start_to_finish' ? suc.fin : suc.inicio
  const exigido = tipo === 'finish_to_finish' || tipo === 'start_to_finish' ? req.fin : req.inicio
  if (real.getTime() <= exigido.getTime()) return 0
  return horasLaborablesEntre(cal, exigido, real)
}

/** ¿Agregar origen → dependiente cierra un ciclo? (el origen ya depende del dependiente) */
export function creaCiclo(
  deps: { tareaOrigenId: string; tareaDependienteId: string }[],
  origenId: string,
  dependienteId: string,
): boolean {
  if (origenId === dependienteId) return true
  const sucesoras = new Map<string, string[]>()
  for (const d of deps) {
    const l = sucesoras.get(d.tareaOrigenId) ?? []
    l.push(d.tareaDependienteId)
    sucesoras.set(d.tareaOrigenId, l)
  }
  const pila = [dependienteId]
  const vistos = new Set<string>()
  while (pila.length) {
    const t = pila.pop()!
    if (t === origenId) return true
    if (vistos.has(t)) continue
    vistos.add(t)
    pila.push(...(sucesoras.get(t) ?? []))
  }
  return false
}

/** Desfase para mostrar: "+2d", "-4h", "+1.5d" (vacío si es 0). */
export function formatearDesfase(lagMinutos: number, horasPorDia: number): string {
  if (!lagMinutos) return ''
  const signo = lagMinutos > 0 ? '+' : '-'
  const horas = Math.abs(lagMinutos) / 60
  const r2 = (n: number) => Math.round(n * 100) / 100
  return `${signo}${horas >= horasPorDia ? `${r2(horas / horasPorDia)}d` : `${r2(horas)}h`}`
}

/** "+2d", "-4h", "3", "1.5d" → minutos laborables (null si no se entiende). Sin unidad = días. */
export function parsearDesfase(texto: string, horasPorDia: number): number | null {
  const t = texto.trim().toLowerCase().replace(',', '.')
  if (!t) return 0
  const m = /^([+-]?)\s*(\d+(?:\.\d+)?)\s*(d|h|días?|dias?|horas?|hrs?)?$/.exec(t)
  if (!m) return null
  const n = Number(m[2]) * (m[1] === '-' ? -1 : 1)
  const enHoras = m[3] && m[3].startsWith('h')
  return Math.round((enHoras ? n : n * horasPorDia) * 60)
}

/**
 * Guarda la dependencia origen → dependiente (sin desfase), como "Vincular
 * tareas" de MS Project. Si ya existe con otro tipo, la cambia. No la crea si
 * cerraría un ciclo o si son de cronogramas distintos.
 */
export async function vincularTareas(
  origenId: string,
  dependienteId: string,
  tipo: TipoDependencia,
): Promise<{ estado: 'creada' | 'actualizada' | 'existente' | 'ciclo' | 'omitida'; nombreOrigen?: string }> {
  const [origen, dependiente] = await Promise.all([
    prisma.proyectoTarea.findUnique({ where: { id: origenId }, select: { nombre: true, proyectoCronogramaId: true } }),
    prisma.proyectoTarea.findUnique({ where: { id: dependienteId }, select: { proyectoCronogramaId: true } }),
  ])
  if (!origen || !dependiente || origen.proyectoCronogramaId !== dependiente.proyectoCronogramaId) return { estado: 'omitida' }

  const existente = await prisma.proyectoDependenciasTarea.findFirst({ where: { tareaOrigenId: origenId, tareaDependienteId: dependienteId } })
  if (existente) {
    if (existente.tipo === tipo && existente.lagMinutos === 0) return { estado: 'existente', nombreOrigen: origen.nombre }
    await prisma.proyectoDependenciasTarea.update({ where: { id: existente.id }, data: { tipo, lagMinutos: 0 } })
    return { estado: 'actualizada', nombreOrigen: origen.nombre }
  }
  const deps = await prisma.proyectoDependenciasTarea.findMany({
    where: { tareaOrigen: { proyectoCronogramaId: origen.proyectoCronogramaId } },
    select: { tareaOrigenId: true, tareaDependienteId: true },
  })
  if (creaCiclo(deps, origenId, dependienteId)) return { estado: 'ciclo', nombreOrigen: origen.nombre }
  await prisma.proyectoDependenciasTarea.create({
    data: { id: crypto.randomUUID(), tareaOrigenId: origenId, tareaDependienteId: dependienteId, tipo, lagMinutos: 0 },
  })
  return { estado: 'creada', nombreOrigen: origen.nombre }
}
