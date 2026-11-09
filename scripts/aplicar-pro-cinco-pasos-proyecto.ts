// Pasa la Procura (EDT PRO) de la LÍNEA BASE de un proyecto al estándar de
// 5 pasos por familia (como "Cables" de CJM52):
//   1. {alias} - Cotización y Evaluación Técnica       (5 h, 1 día)
//   2. {alias} - Aprobación Ficha Técnica por {CLIENTE} (1 día, sin horas)
//   3. ◆ {alias} - Emisión de Orden de Compra           (hito)
//   4. {alias} - Plazo de Entrega del Proveedor         (conserva su duración)
//   5. {alias} - Recepción e Inspección en Almacén GYS  (conserva su duración)
// Une Solicitud + Recepción de Cotizaciones + Evaluación Técnica en el paso 1,
// crea la aprobación donde no había, encadena 1→2→3→4→5 (FC) y adelanta las
// fechas como "Ajustar tareas a sus predecesoras" sobre el EDT (también la
// Entrega en Obra que depende de las recepciones). Las dependencias externas
// (Listado de Equipos → paso 1, recepciones → Entrega en Obra) se conservan.
//   npx tsx scripts/aplicar-pro-cinco-pasos-proyecto.ts CJM52           (muestra)
//   npx tsx scripts/aplicar-pro-cinco-pasos-proyecto.ts CJM52 --apply   (guarda)
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { horasLaborablesEntre, horasPorDiaCalendario, siguienteMomentoLaborable, sumarHorasLaborables } from '../src/lib/services/cronogramaHoras'
import { fechasPorPredecesoras } from '../src/lib/services/cronogramaDependencias'
import { recalcularFechasPadresDeTarea } from '../src/lib/services/cronogramaRollupFechas'

const codigo = process.argv[2]
const APLICAR = process.argv.includes('--apply')

const PASO = {
  cot: 'Cotización y Evaluación Técnica',
  apr: 'Aprobación Ficha Técnica',
  oc: 'Emisión de Orden de Compra',
  pla: 'Plazo de Entrega del Proveedor',
  rec: 'Recepción e Inspección en Almacén GYS',
} as const
type Clave = keyof typeof PASO | 'recCot' | 'eva'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
/** Qué paso es una tarea, por lo que sigue al prefijo "{alias} - ". */
function clasificar(nombre: string): { prefijo: string; clave: Clave | null } {
  const i = nombre.indexOf(' - ')
  const prefijo = i >= 0 ? nombre.slice(0, i + 3) : ''
  const s = norm(i >= 0 ? nombre.slice(i + 3) : nombre)
  const clave: Clave | null =
    s === norm('Solicitud de Cotización') || s === norm(PASO.cot) ? 'cot'
    : s === norm('Recepción de Cotizaciones') ? 'recCot'
    : s === norm('Evaluación Técnica') ? 'eva'
    : /^aprobacion\b/.test(s) ? 'apr'
    : s === norm(PASO.oc) ? 'oc'
    : s === norm('Seguimiento de Compra (Expediting)') || s === norm(PASO.pla) ? 'pla'
    : s === norm('Recepción en Almacén GYS') || s === norm(PASO.rec) ? 'rec'
    : null
  return { prefijo, clave }
}
const f = (d: Date) => d.toISOString().slice(5, 16).replace('T', ' ')

async function main() {
  if (!codigo) throw new Error('Uso: npx tsx scripts/aplicar-pro-cinco-pasos-proyecto.ts <codigo> [--apply]')
  const proyecto = await prisma.proyecto.findFirst({
    where: { codigo },
    select: { id: true, codigo: true, nombre: true, cliente: { select: { nombre: true } } },
  })
  if (!proyecto) throw new Error(`No existe el proyecto ${codigo}`)
  const cron = await prisma.proyectoCronograma.findFirst({ where: { proyectoId: proyecto.id, tipo: 'planificacion' }, select: { id: true, bloqueado: true } })
  if (!cron) throw new Error('El proyecto no tiene línea base')
  const edt = await prisma.proyectoEdt.findFirst({
    where: { proyectoId: proyecto.id, proyectoCronogramaId: cron.id, edt: { nombre: 'PRO' } },
    select: { id: true, nombre: true },
  })
  if (!edt) throw new Error('La línea base no tiene EDT PRO')
  const corto = (proyecto.cliente?.nombre ?? '').trim().split(/\s+/)[0]?.toUpperCase()
  const nombreApr = corto ? `${PASO.apr} por ${corto}` : PASO.apr
  const servApr = await prisma.catalogoServicio.findFirst({
    where: { edt: { nombre: 'PRO' }, nombre: { in: ['Aprobación del Cliente', PASO.apr] } },
    select: { id: true, recursoId: true },
  })
  const cal = await obtenerCalendarioProyecto(proyecto.id)
  const jornada = horasPorDiaCalendario(cal)

  console.log(`${APLICAR ? 'APLICANDO' : 'VISTA PREVIA'} — ${proyecto.codigo} ${proyecto.nombre} · línea base${cron.bloqueado ? ' (BLOQUEADA)' : ''} · ${edt.nombre}\n`)

  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoEdtId: edt.id, NOT: { nombre: 'Seguimiento y Entrega en Obra' } },
    orderBy: { orden: 'asc' },
    select: {
      id: true, nombre: true,
      proyectoTarea: {
        orderBy: { orden: 'asc' },
        select: {
          id: true, nombre: true, fechaInicio: true, fechaFin: true, horasEstimadas: true, esHito: true, orden: true,
          responsableId: true, recursoId: true, proyectoEdtId: true, proyectoCronogramaId: true,
          dependenciasComoDependiente: { select: { id: true, tareaOrigenId: true } },
          dependenciasComoOrigen: { select: { id: true, tareaDependienteId: true } },
        },
      },
    },
  })

  const operaciones: (() => Promise<unknown>)[] = []
  for (const act of actividades) {
    const tareas = act.proyectoTarea
    const porClave = new Map<Clave, (typeof tareas)[number]>()
    let prefijo = ''
    const sinClasificar: string[] = []
    for (const t of tareas) {
      const c = clasificar(t.nombre)
      if (c.clave && !porClave.has(c.clave)) { porClave.set(c.clave, t); if (!prefijo) prefijo = c.prefijo }
      else sinClasificar.push(t.nombre)
    }
    const cot = porClave.get('cot'), oc = porClave.get('oc'), pla = porClave.get('pla'), rec = porClave.get('rec')
    console.log(`■ ${act.nombre}`)
    if (!cot || !oc || !pla || !rec) {
      console.log(`  ✗ se omite: faltan pasos (${['cot', 'oc', 'pla', 'rec'].filter(k => !porClave.has(k as Clave)).join(', ')})\n`)
      continue
    }
    if (sinClasificar.length) console.log(`  ⚠ quedan aparte (no se tocan): ${sinClasificar.join(' | ')}`)

    const familia = new Set(tareas.map(t => t.id))
    const aBorrar = (['recCot', 'eva'] as const).map(k => porClave.get(k)).filter((t): t is NonNullable<typeof t> => !!t)
    // Dependencias externas de las que se borran: no debería haber; si hay, no se toca la familia.
    const externas = aBorrar.flatMap(t => [
      ...t.dependenciasComoDependiente.filter(d => !familia.has(d.tareaOrigenId)),
      ...t.dependenciasComoOrigen.filter(d => !familia.has(d.tareaDependienteId)),
    ])
    if (externas.length) { console.log(`  ✗ se omite: ${externas.length} dependencia(s) externa(s) en tareas a borrar\n`); continue }

    // 1. Cotización: 5 h en 1 día, desde su inicio actual.
    const cotFin = sumarHorasLaborables(cal, cot.fechaInicio, jornada)
    const apr = porClave.get('apr')
    const aprInicio = siguienteMomentoLaborable(cal, cotFin)
    const aprFin = sumarHorasLaborables(cal, aprInicio, jornada)
    console.log(`  1 ${prefijo}${PASO.cot} · 5 h · ${f(cot.fechaInicio)}→${f(cotFin)}  (era "${cot.nombre.slice(prefijo.length)}")`)
    console.log(`  2 ${prefijo}${nombreApr} · 0 h · 1 día ${apr ? `(era "${apr.nombre.slice(prefijo.length)}")` : '(NUEVA)'}`)
    console.log(`  3 ◆ ${prefijo}${PASO.oc}`)
    console.log(`  4 ${prefijo}${PASO.pla} · ${pla.horasEstimadas ?? 0} h · conserva ${(horasLaborablesEntre(cal, pla.fechaInicio, pla.fechaFin) / jornada).toFixed(1)} días`)
    console.log(`  5 ${prefijo}${PASO.rec} · ${rec.horasEstimadas ?? 0} h`)
    if (aBorrar.length) console.log(`  − se unen al paso 1 y se borran: ${aBorrar.map(t => t.nombre).join(' | ')}`)
    console.log('')

    const ahora = new Date()
    const aprId = apr?.id ?? randomUUID()
    const cadena = [cot.id, aprId, oc.id, pla.id, rec.id]
    operaciones.push(async () => {
      await prisma.$transaction(async (tx) => {
        // Dependencias internas viejas de la familia (se rehace la cadena).
        const internas = tareas.flatMap(t => t.dependenciasComoDependiente.filter(d => familia.has(d.tareaOrigenId)).map(d => d.id))
        if (internas.length) await tx.proyectoDependenciasTarea.deleteMany({ where: { id: { in: internas } } })
        if (aBorrar.length) await tx.proyectoTarea.deleteMany({ where: { id: { in: aBorrar.map(t => t.id) } } })
        await tx.proyectoTarea.update({ where: { id: cot.id }, data: { nombre: `${prefijo}${PASO.cot}`, horasEstimadas: 5, fechaFin: cotFin, orden: 0, updatedAt: ahora } })
        if (apr) {
          await tx.proyectoTarea.update({ where: { id: apr.id }, data: { nombre: `${prefijo}${nombreApr}`, horasEstimadas: 0, esHito: false, fechaInicio: aprInicio, fechaFin: aprFin, orden: 1, updatedAt: ahora } })
        } else {
          await tx.proyectoTarea.create({
            data: {
              id: aprId, proyectoEdtId: oc.proyectoEdtId, proyectoCronogramaId: oc.proyectoCronogramaId, proyectoActividadId: act.id,
              nombre: `${prefijo}${nombreApr}`, orden: 1, fechaInicio: aprInicio, fechaFin: aprFin, horasEstimadas: 0,
              responsableId: oc.responsableId, recursoId: servApr?.recursoId ?? oc.recursoId, catalogoServicioId: servApr?.id ?? null,
              updatedAt: ahora,
            },
          })
        }
        await tx.proyectoTarea.update({ where: { id: oc.id }, data: { nombre: `${prefijo}${PASO.oc}`, esHito: true, horasEstimadas: 0, orden: 2, updatedAt: ahora } })
        await tx.proyectoTarea.update({ where: { id: pla.id }, data: { nombre: `${prefijo}${PASO.pla}`, orden: 3, updatedAt: ahora } })
        await tx.proyectoTarea.update({ where: { id: rec.id }, data: { nombre: `${prefijo}${PASO.rec}`, orden: 4, updatedAt: ahora } })
        for (let i = 1; i < cadena.length; i++) {
          await tx.proyectoDependenciasTarea.create({
            data: { id: randomUUID(), tareaOrigenId: cadena[i - 1], tareaDependienteId: cadena[i], tipo: 'finish_to_start', lagMinutos: 0, updatedAt: ahora },
          })
        }
      }, { timeout: 60_000 })
    })
  }

  if (!APLICAR) { console.log('Nada guardado. Correr con --apply para aplicar.'); return }
  for (const op of operaciones) await op()
  console.log(`✓ ${operaciones.length} familia(s) actualizada(s). Ajustando fechas a sus predecesoras en el EDT…`)

  // Igual que "Ajustar tareas a sus predecesoras" del EDT (ajustar-actividad/route.ts).
  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoEdtId: edt.id },
    orderBy: [{ proyectoActividad: { orden: 'asc' } }, { orden: 'asc' }],
    select: {
      id: true, fechaInicio: true, fechaFin: true, esHito: true, proyectoActividadId: true,
      dependenciasComoDependiente: { select: { tipo: true, lagMinutos: true, tareaOrigenId: true, tareaOrigen: { select: { fechaInicio: true, fechaFin: true } } } },
    },
  })
  const propias = new Set(tareas.map(t => t.id))
  const fechas = new Map(tareas.map(t => [t.id, { inicio: t.fechaInicio, fin: t.fechaFin }]))
  const cambios: { id: string; actividadId: string | null; inicio: Date; fin: Date }[] = []
  const pendientes = [...tareas]
  while (pendientes.length) {
    const i = pendientes.findIndex(t => t.dependenciasComoDependiente.every(d => !propias.has(d.tareaOrigenId) || !pendientes.some(p => p.id === d.tareaOrigenId)))
    if (i < 0) throw new Error('Ciclo de dependencias en el EDT PRO')
    const t = pendientes.splice(i, 1)[0]
    if (!t.dependenciasComoDependiente.length) continue
    const actual = fechas.get(t.id)!
    const duracion = t.esHito ? 0 : horasLaborablesEntre(cal, actual.inicio, actual.fin)
    const req = fechasPorPredecesoras(cal, t.dependenciasComoDependiente.map(d => ({
      tipo: d.tipo, lagMinutos: d.lagMinutos, pred: fechas.get(d.tareaOrigenId) ?? { inicio: d.tareaOrigen.fechaInicio, fin: d.tareaOrigen.fechaFin },
    })), duracion)
    if (req.inicio.getTime() === actual.inicio.getTime() && req.fin.getTime() === actual.fin.getTime()) continue
    fechas.set(t.id, { inicio: req.inicio, fin: req.fin })
    cambios.push({ id: t.id, actividadId: t.proyectoActividadId, inicio: req.inicio, fin: req.fin })
  }
  const ahora = new Date()
  for (const c of cambios) await prisma.proyectoTarea.update({ where: { id: c.id }, data: { fechaInicio: c.inicio, fechaFin: c.fin, updatedAt: ahora } })
  const porActividad = new Map(cambios.map(c => [c.actividadId ?? c.id, c.id]))
  for (const tareaId of porActividad.values()) await recalcularFechasPadresDeTarea(tareaId)
  console.log(`✓ ${cambios.length} tarea(s) con fechas ajustadas.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
