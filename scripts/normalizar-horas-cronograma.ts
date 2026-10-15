/**
 * C0 — Normaliza las horas de las fechas del cronograma a "hora de obra"
 * (la hora tal cual en obra, guardada sin zona horaria, como MS Project).
 *
 * Hoy conviven tres convenciones:
 *  - 00:00 UTC exacto  → solo día (formulario, mover, posicionar en GYS):
 *                         inicio → 08:00 del mismo día, fin → 18:30 del mismo día.
 *  - Hora de obra ya escrita tal cual (wizard, conversiones): no se toca.
 *  - Instante real Perú (importado de MS Project, parseado en el navegador
 *    en hora Perú, UTC-5): se resta 5 h (13:00Z → 08:00).
 * Cada valor se decide por evidencia, no por suposición:
 *  - Hora UTC entre 19:00 y 23:59 → solo puede ser hora Perú (como hora de obra sería de noche).
 *  - Hora UTC entre 00:01 y 11:59 → solo puede ser hora de obra (como hora Perú sería antes de las 7:00).
 *  - Entre 12:00 y 18:59 es ambiguo → se usa la convención mayoritaria del
 *    cronograma, calculada con los valores no ambiguos (empate/sin evidencia:
 *    hora de obra si el proyecto se generó con el wizard, hora Perú si no).
 * El comercial no se toca. Las fechas reales (fechaInicioReal/FinReal) tampoco.
 * En ningún caso cambia el día: si una conversión cambiaría el día, se reporta y no se aplica.
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/normalizar-horas-cronograma.ts           (solo reporte)
 *   npx dotenv -e .env.production -o -- npx tsx scripts/normalizar-horas-cronograma.ts --aplicar (escribe)
 */
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')
// Opcional: los importados de MS Project terminan a las 17:00 (fin de jornada del
// calendario de 8 h de MS Project). Con --fin-jornada, ese 17:00 pasa a 18:30
// (fin de jornada del calendario de GYS), así un "día completo" sigue siéndolo.
const FIN_JORNADA = process.argv.includes('--fin-jornada')
const HORA_INICIO = { h: 8, m: 0 }
const HORA_FIN = { h: 18, m: 30 }
const OFFSET_PERU_MS = 5 * 3600 * 1000

type Origen = 'obra' | 'peru'
type Regla = 'solo_dia' | 'peru_menos_5h' | 'sin_cambio' | 'revisar'

/** Qué convención delata la hora del valor por sí sola (null = ambiguo o medianoche). */
function evidencia(d: Date | null): Origen | null {
  if (!d || esMedianocheFn(d)) return null
  const min = d.getUTCHours() * 60 + d.getUTCMinutes()
  if (min >= 19 * 60) return 'peru'
  if (min < 12 * 60) return 'obra'
  return null
}
function esMedianocheFn(d: Date) {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
}

const esMedianoche = (d: Date) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
const conHora = (d: Date, hm: { h: number; m: number }) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hm.h, hm.m))
const mismoDia = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
const hhmm = (d: Date) => d.toISOString().slice(11, 16)

let finesJornadaAjustados = 0

/** `origen` ya es la convención resuelta para la fila (ver procesar). */
function convertir(d: Date | null, esFin: boolean, origen: Origen): { nueva: Date | null; regla: Regla } {
  if (!d) return { nueva: null, regla: 'sin_cambio' }
  if (esMedianoche(d)) return { nueva: conHora(d, esFin ? HORA_FIN : HORA_INICIO), regla: 'solo_dia' }
  if (origen === 'obra') return { nueva: d, regla: 'sin_cambio' }
  let nueva = new Date(d.getTime() - OFFSET_PERU_MS)
  if (FIN_JORNADA && esFin && nueva.getUTCHours() === 17 && nueva.getUTCMinutes() === 0) {
    nueva = conHora(nueva, HORA_FIN)
    finesJornadaAjustados++
  }
  // Si restar 5 h cambia el día, no era hora Perú dentro de jornada: no se toca.
  if (!mismoDia(nueva, d)) return { nueva: d, regla: 'revisar' }
  return { nueva, regla: 'peru_menos_5h' }
}

async function main() {
  const cronogramas = await prisma.proyectoCronograma.findMany({
    where: { tipo: { in: ['planificacion', 'ejecucion'] } },
    select: {
      id: true, tipo: true, nombre: true, proyectoId: true,
      proyecto: { select: { codigo: true } },
      _count: { select: { generacionesIA: { where: { aplicadoEn: { not: null } } } } },
    },
  })
  // Origen por proyecto: wizard si alguna planificación del proyecto fue generada con el wizard.
  const wizardPorProyecto = new Map<string, boolean>()
  for (const c of cronogramas as any[]) {
    if (c.tipo === 'planificacion' && c._count.generacionesIA > 0) wizardPorProyecto.set(c.proyectoId, true)
  }

  type Cambio = { tabla: string; id: string; campo: string; antes: Date; despues: Date }
  const cambios: Cambio[] = []
  const resumen = new Map<string, Record<string, number>>()
  const revisar: string[] = []
  const finAntesDeInicio: string[] = []

  const contar = (clave: string, regla: Regla) => {
    const r = resumen.get(clave) ?? {}
    r[regla] = (r[regla] ?? 0) + 1
    resumen.set(clave, r)
  }

  for (const c of cronogramas as any[]) {
    const tareas = await prisma.proyectoTarea.findMany({ where: { proyectoCronogramaId: c.id }, select: { id: true, nombre: true, fechaInicio: true, fechaFin: true } })
    const acts = await prisma.proyectoActividad.findMany({ where: { proyectoCronogramaId: c.id }, select: { id: true, nombre: true, fechaInicioPlan: true, fechaFinPlan: true } })
    const edts = await prisma.proyectoEdt.findMany({ where: { proyectoCronogramaId: c.id }, select: { id: true, nombre: true, fechaInicioPlan: true, fechaFinPlan: true } })
    const fases = await prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: c.id }, select: { id: true, nombre: true, fechaInicioPlan: true, fechaFinPlan: true } })

    // Convención mayoritaria del cronograma según los valores no ambiguos.
    const todas = [
      ...tareas.flatMap(t => [t.fechaInicio, t.fechaFin]),
      ...acts.flatMap(t => [t.fechaInicioPlan, t.fechaFinPlan]),
      ...edts.flatMap(t => [t.fechaInicioPlan, t.fechaFinPlan]),
      ...fases.flatMap(t => [t.fechaInicioPlan, t.fechaFinPlan]),
    ]
    const ev = { peru: 0, obra: 0 }
    for (const d of todas) { const e = evidencia(d); if (e) ev[e]++ }
    const origen: Origen = ev.peru > ev.obra ? 'peru' : ev.obra > ev.peru ? 'obra' : wizardPorProyecto.get(c.proyectoId) ? 'obra' : 'peru'
    const clave = `${c.proyecto.codigo.padEnd(7)} ${c.tipo.padEnd(13)} [${origen} · evid peru=${ev.peru} obra=${ev.obra}]`

    const procesar = async (
      tabla: string,
      filas: { id: string; nombre: string; ini: Date | null; fin: Date | null }[],
      campos: [string, string],
    ) => {
      for (const f of filas) {
        // Una sola convención por fila: si inicio o fin la delatan, vale para ambos.
        const eIni = evidencia(f.ini)
        const eFin = evidencia(f.fin)
        if (eIni && eFin && eIni !== eFin) {
          revisar.push(`${clave} ${tabla} "${f.nombre}" inicio=${f.ini?.toISOString()} fin=${f.fin?.toISOString()} (convenciones distintas)`)
          contar(clave, 'revisar'); contar(clave, 'revisar')
          continue
        }
        const origenFila: Origen = eIni ?? eFin ?? origen
        const a = convertir(f.ini, false, origenFila)
        const b = convertir(f.fin, true, origenFila)
        for (const [x, campo, orig] of [[a, campos[0], f.ini], [b, campos[1], f.fin]] as const) {
          contar(clave, x.regla)
          if (x.regla === 'revisar') revisar.push(`${clave} ${tabla} "${f.nombre}" ${campo}=${orig?.toISOString()}`)
          if (orig && x.nueva && x.nueva.getTime() !== orig.getTime()) {
            cambios.push({ tabla, id: f.id, campo, antes: orig, despues: x.nueva })
          }
        }
        const yaVeniaMal = f.ini && f.fin && f.fin < f.ini
        if (a.nueva && b.nueva && b.nueva < a.nueva && !yaVeniaMal) {
          finAntesDeInicio.push(`${clave} ${tabla} "${f.nombre}" ${a.nueva.toISOString()} → ${b.nueva.toISOString()}`)
        }
      }
    }

    await procesar('tarea', tareas.map(t => ({ id: t.id, nombre: t.nombre, ini: t.fechaInicio, fin: t.fechaFin })), ['fechaInicio', 'fechaFin'])
    await procesar('actividad', acts.map(t => ({ id: t.id, nombre: t.nombre, ini: t.fechaInicioPlan, fin: t.fechaFinPlan })), ['fechaInicioPlan', 'fechaFinPlan'])
    await procesar('edt', edts.map(t => ({ id: t.id, nombre: t.nombre, ini: t.fechaInicioPlan, fin: t.fechaFinPlan })), ['fechaInicioPlan', 'fechaFinPlan'])
    await procesar('fase', fases.map(t => ({ id: t.id, nombre: t.nombre, ini: t.fechaInicioPlan, fin: t.fechaFinPlan })), ['fechaInicioPlan', 'fechaFinPlan'])
  }

  console.log('=== Resumen por cronograma (fechas evaluadas por regla) ===')
  for (const [clave, r] of [...resumen.entries()].sort()) {
    console.log(`${clave}  solo_dia=${r.solo_dia ?? 0}  peru_-5h=${r.peru_menos_5h ?? 0}  sin_cambio=${r.sin_cambio ?? 0}  revisar=${r.revisar ?? 0}`)
  }
  const diasCambiados = cambios.filter(c => !mismoDia(c.antes, c.despues))
  console.log(`\nFechas a modificar: ${cambios.length} | con cambio de día: ${diasCambiados.length} (debe ser 0)`)
  console.log(`Fines 17:00 → 18:30 (--fin-jornada ${FIN_JORNADA ? 'activo' : 'inactivo'}): ${finesJornadaAjustados}`)
  console.log(`A revisar (no se tocan): ${revisar.length}`)
  revisar.slice(0, 20).forEach(x => console.log('  ' + x))
  console.log(`Fin antes que inicio PROVOCADO por la conversión: ${finAntesDeInicio.length}`)
  finAntesDeInicio.slice(0, 20).forEach(x => console.log('  ' + x))

  // Muestra de conversiones por patrón horario
  const patrones = new Map<string, number>()
  for (const c of cambios) {
    const k = `${c.tabla.padEnd(9)} ${c.campo.padEnd(15)} ${hhmm(c.antes)} → ${hhmm(c.despues)}`
    patrones.set(k, (patrones.get(k) ?? 0) + 1)
  }
  console.log('\n=== Patrones de conversión ===')
  for (const [k, n] of [...patrones.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k}  x${n}`)

  if (!APLICAR) {
    console.log('\nSolo reporte. Para escribir: --aplicar')
    return
  }
  if (diasCambiados.length > 0) throw new Error('Hay conversiones que cambian el día; se aborta.')

  const respaldo = `scripts/respaldo-horas-cronograma-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  require('fs').writeFileSync(respaldo, JSON.stringify(cambios, null, 1))
  console.log(`Respaldo: ${respaldo}`)

  const modelo: Record<string, any> = {
    tarea: prisma.proyectoTarea, actividad: prisma.proyectoActividad, edt: prisma.proyectoEdt, fase: prisma.proyectoFase,
  }
  const porFila = new Map<string, { tabla: string; id: string; data: Record<string, Date> }>()
  for (const c of cambios) {
    const k = `${c.tabla}:${c.id}`
    const f = porFila.get(k) ?? { tabla: c.tabla, id: c.id, data: {} }
    f.data[c.campo] = c.despues
    porFila.set(k, f)
  }
  let n = 0
  for (const f of porFila.values()) {
    await modelo[f.tabla].update({ where: { id: f.id }, data: f.data })
    n++
  }
  console.log(`Aplicado: ${n} filas actualizadas.`)
}

main().finally(() => prisma.$disconnect())
