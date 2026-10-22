/**
 * CJM51 — reestructura PROCURA según el esquema del gestor (oct-2026):
 *  - Feriados 08/12 y 25/12/2026 en el calendario Peru-STD (si faltan).
 *  - PRO "Suministro de Equipos": 9 familias en paralelo desde el inicio de PROCURA
 *    (Definición Técnica de instrumentos adelantada) + "Seguimiento y Entrega en Obra"
 *    con 3 traslados agrupados y su hito "En Obra". Reemplaza las actividades actuales.
 *  - PLA: "Tablero de Botonera" (plano de fabricación + hito de aprobación NEXA) que
 *    habilita la OC del tablero.
 *  - TAB (nuevo, EJECUCION): armado del cubículo de arranque en taller con Schneider y E300.
 *  - Enlaces a obra: traslados → CON, TAB → montaje del MCC.
 * Las duraciones son días laborables del calendario (como MS Project); "Plazo" = 0 h.
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/reestructurar-procura-cjm51.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { finJornada, inicioJornada, intervalosDelDia, siguienteMomentoLaborable } from '../src/lib/services/cronogramaHoras'
import { prefijarNombreTarea } from '../src/lib/cronogramaIA/aliasActividad'
import { resolverOrganigramaProyecto } from '../src/lib/cronogramaResponsables/resolverOrganigrama'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'

const APLICAR = process.argv.includes('--aplicar')
const CODIGO = 'CJM51'
const FERIADOS = [
  { fecha: '2026-12-08', nombre: 'Inmaculada Concepción' },
  { fecha: '2026-12-25', nombre: 'Navidad' },
]
const f = (d: Date) => d.toISOString().slice(0, 10)

type Rec = 'Gestor' | 'Tecnico' | 'Cuadrilla 2P' | 'Cadista' | 'Supervisor'
interface TareaPlan {
  key: string
  nombre: string
  dias: number // 0 = hito
  horas: number
  recurso: Rec
  servicio?: string // nombre en el catálogo (PRO/TAB/PLA) para enlazar
  preds: string[] // keys de tareas (FS)
  desde?: Date // inicio mínimo (sin predecesoras)
  // calculado
  id?: string
  inicio?: Date
  fin?: Date
}
interface ActividadPlan { nombre: string; alias?: string; tareas: TareaPlan[] }

async function main() {
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo: CODIGO } }, select: { id: true, proyectoId: true, bloqueado: true } })
  if (cron.bloqueado) throw new Error('Cronograma bloqueado')

  // ── Calendario + feriados (en memoria para la vista previa) ──
  const calDb = await prisma.calendarioLaboral.findFirstOrThrow({ where: { nombre: 'Peru-STD' }, include: { excepcionCalendario: true } })
  const feriadosFaltan = FERIADOS.filter(x => !calDb.excepcionCalendario.some(e => f(e.fecha) === x.fecha))
  const cal = await obtenerCalendarioProyecto(cron.proyectoId)
  for (const x of feriadosFaltan) {
    cal.excepcionCalendario.push({ fecha: new Date(`${x.fecha}T00:00:00Z`), tipo: 'feriado', horaInicio: null, horaFin: null } as never)
  }
  const tareasEnFeriado = await prisma.proyectoTarea.findMany({
    where: { OR: FERIADOS.map(x => ({ fechaInicio: { lte: new Date(`${x.fecha}T23:59:59Z`) }, fechaFin: { gte: new Date(`${x.fecha}T00:00:00Z`) } })) },
    select: { nombre: true, proyectoCronograma: { select: { tipo: true, proyecto: { select: { codigo: true } } } } },
  })

  const esLaborable = (d: Date) => intervalosDelDia(cal, d).length > 0
  const sigDia = (t: Date) => siguienteMomentoLaborable(cal, t) // siguiente momento laborable
  /** n días laborables desde el día de `desde` (ya laborable). */
  const bloque = (desde: Date, n: number) => {
    let dia = desde
    while (!esLaborable(dia)) dia = new Date(dia.getTime() + 864e5)
    const inicio = inicioJornada(cal, dia)
    let fin = finJornada(cal, dia)
    for (let i = 1; i < n; i++) fin = finJornada(cal, sigDia(fin))
    return { inicio, fin }
  }

  // ── Estructura actual ──
  const edts = await prisma.proyectoEdt.findMany({
    where: { proyectoCronogramaId: cron.id },
    include: { edt: true, proyectoFase: true, proyectoActividad: { include: { proyectoTarea: true } } },
  })
  const porCod = (c: string) => edts.find(e => e.edt.nombre === c)
  const pro = porCod('PRO')!
  const pla = porCod('PLA')!
  const con = porCod('CON')!
  if (porCod('TAB')) throw new Error('CJM51 ya tiene TAB')
  const tareaCon = (nombre: string) => {
    const t = con.proyectoActividad.flatMap(a => a.proyectoTarea).find(x => x.nombre === nombre)
    if (!t) throw new Error(`No existe en CON: ${nombre}`)
    return t
  }
  const mccPreparacion = tareaCon('MCC - Preparación y Traslado de Materiales')
  const mccMontaje = tareaCon('MCC - Montaje de tableros eléctricos')
  const bombaInstrumentos = tareaCon('Bomba - Instalación de instrumentos de campo')

  const inicioProcura = sigDia(pro.proyectoFase?.fechaInicioPlan ?? pro.fechaInicioPlan ?? new Date())

  // ── Plan ──
  const compra = (alias: string, plazo: number, extra: Partial<Record<'cot' | 'oc', string[]>> = {}): TareaPlan[] => [
    { key: `${alias}.cot`, nombre: 'Solicitud de Cotización', dias: 1, horas: 2, recurso: 'Gestor', servicio: 'Solicitud de Cotización', preds: extra.cot ?? [], desde: inicioProcura },
    { key: `${alias}.oc`, nombre: 'Emisión de Orden de Compra', dias: 1, horas: 1, recurso: 'Gestor', servicio: 'Emisión de Orden de Compra', preds: [`${alias}.cot`, ...(extra.oc ?? [])] },
    { key: `${alias}.plazo`, nombre: 'Plazo de Entrega del Proveedor', dias: plazo, horas: 0, recurso: 'Gestor', servicio: 'Seguimiento de Compra (Expediting)', preds: [`${alias}.oc`] },
    { key: `${alias}.rec`, nombre: 'Recepción en Almacén GYS', dias: 1, horas: 2, recurso: 'Tecnico', servicio: 'Recepción en Almacén GYS', preds: [`${alias}.plazo`] },
  ]
  const instrumento = (alias: string, definicion: string, diasCot: number): TareaPlan[] => [
    { key: `${alias}.def`, nombre: `Definición Técnica (${definicion})`, dias: 1, horas: 2, recurso: 'Gestor', preds: [], desde: inicioProcura },
    { key: `${alias}.cot`, nombre: 'Solicitud de Cotización', dias: diasCot, horas: 2, recurso: 'Gestor', servicio: 'Solicitud de Cotización', preds: [`${alias}.def`] },
    { key: `${alias}.oc`, nombre: 'Emisión de Orden de Compra', dias: 1, horas: 1, recurso: 'Gestor', servicio: 'Emisión de Orden de Compra', preds: [`${alias}.cot`] },
    { key: `${alias}.plazo`, nombre: 'Plazo de Entrega del Proveedor', dias: 25, horas: 0, recurso: 'Gestor', servicio: 'Seguimiento de Compra (Expediting)', preds: [`${alias}.oc`] },
    { key: `${alias}.rec`, nombre: 'Recepción en Almacén GYS', dias: 1, horas: 2, recurso: 'Tecnico', servicio: 'Recepción en Almacén GYS', preds: [`${alias}.plazo`] },
  ]

  const actividadesPla: ActividadPlan[] = [{
    nombre: 'Tablero de Botonera',
    tareas: [
      { key: 'pla.plano', nombre: 'Plano de Fabricación – Tablero de Botonera', dias: 1, horas: 9.5, recurso: 'Cadista', servicio: 'Planos Generales de Tablero', preds: [], desde: inicioProcura },
      { key: 'pla.envio', nombre: 'Envío y Aprobación – Plano Tablero de Botonera', dias: 4, horas: 2, recurso: 'Gestor', servicio: 'Envío y Aprobación de Planos', preds: ['pla.plano'] },
      { key: 'pla.hito', nombre: 'Plano Tablero de Botonera Aprobado por NEXA', dias: 0, horas: 0, recurso: 'Gestor', preds: ['pla.envio'] },
    ],
  }]

  const actividadesPro: ActividadPlan[] = [
    { nombre: 'Cables de Fuerza y Control', alias: 'Cables', tareas: compra('Cables', 5) },
    { nombre: 'Cable de Instrumentación', alias: 'Instrumentación', tareas: compra('Instrumentación', 15) },
    { nombre: 'Canalización y Soportería', alias: 'Canalización', tareas: compra('Canalización', 7) },
    { nombre: 'Comunicación', alias: 'Comunicación', tareas: compra('Comunicación', 5) },
    {
      nombre: 'Tablero de Botonera', alias: 'Botonera',
      tareas: compra('Botonera', 10, { oc: ['pla.hito'] }).map(t => t.key === 'Botonera.plazo' ? { ...t, nombre: 'Plazo de Fabricación del Proveedor' } : t),
    },
    { nombre: 'Equipos Eléctricos – Schneider', alias: 'Schneider', tareas: compra('Schneider', 5) },
    {
      nombre: 'Equipos Eléctricos – Allen-Bradley', alias: 'Allen-Bradley',
      tareas: [
        { key: 'AB.cot', nombre: 'Solicitud de Cotización', dias: 1, horas: 2, recurso: 'Gestor', servicio: 'Solicitud de Cotización', preds: [], desde: inicioProcura },
        { key: 'AB.oc', nombre: 'Emisión de Orden de Compra (Entrega Parcial)', dias: 1, horas: 1, recurso: 'Gestor', servicio: 'Emisión de Orden de Compra', preds: ['AB.cot'] },
        { key: 'AB.plazoP', nombre: 'Plazo de Entrega – Pulsadores (Stock)', dias: 5, horas: 0, recurso: 'Gestor', servicio: 'Seguimiento de Compra (Expediting)', preds: ['AB.oc'] },
        { key: 'AB.recP', nombre: 'Recepción en Almacén GYS – Pulsadores', dias: 1, horas: 2, recurso: 'Tecnico', servicio: 'Recepción en Almacén GYS', preds: ['AB.plazoP'] },
        { key: 'AB.plazoE', nombre: 'Plazo de Entrega – E300 (Importación)', dias: 15, horas: 0, recurso: 'Gestor', servicio: 'Seguimiento de Compra (Expediting)', preds: ['AB.oc'] },
        { key: 'AB.recE', nombre: 'Recepción en Almacén GYS – E300', dias: 1, horas: 2, recurso: 'Tecnico', servicio: 'Recepción en Almacén GYS', preds: ['AB.plazoE'] },
      ],
    },
    { nombre: 'Instrumentos – Transmisores de Presión', alias: 'Transmisores', tareas: instrumento('Transmisores', 'Rango 0–25 bar', 1) },
    { nombre: 'Instrumentos – Válvulas Automáticas', alias: 'Válvulas', tareas: instrumento('Válvulas', 'Bola o Bermad', 2) },
    {
      nombre: 'Seguimiento y Entrega en Obra',
      tareas: [
        { key: 'seg', nombre: 'Seguimiento a Proveedores', dias: -1, horas: 8, recurso: 'Gestor', preds: ['Cables.oc'] }, // hasta la última recepción
        { key: 'tr1', nombre: 'Traslado 1: Cables Fuerza y Control, Canalización, Soportería, Comunicación', dias: 1, horas: 5, recurso: 'Cuadrilla 2P', servicio: 'Traslado y Entrega en Sitio', preds: ['Cables.rec', 'Canalización.rec', 'Comunicación.rec'] },
        { key: 'tr1h', nombre: 'Traslado 1: En Obra', dias: 0, horas: 0, recurso: 'Gestor', preds: ['tr1'] },
        { key: 'tr2', nombre: 'Traslado 2: Cable Instrumentación, Tablero Botonera, Pulsadores', dias: 1, horas: 5, recurso: 'Cuadrilla 2P', servicio: 'Traslado y Entrega en Sitio', preds: ['Instrumentación.rec', 'Botonera.rec', 'AB.recP'] },
        { key: 'tr2h', nombre: 'Traslado 2: En Obra', dias: 0, horas: 0, recurso: 'Gestor', preds: ['tr2'] },
        { key: 'tr3', nombre: 'Traslado 3: Transmisores y Válvulas', dias: 1, horas: 5, recurso: 'Cuadrilla 2P', servicio: 'Traslado y Entrega en Sitio', preds: ['Transmisores.rec', 'Válvulas.rec'] },
        { key: 'tr3h', nombre: 'Traslado 3: En Obra', dias: 0, horas: 0, recurso: 'Gestor', preds: ['tr3'] },
      ],
    },
  ]

  // TAB: armado del cubículo en taller (pasos del catálogo TAB que aplican a un cubículo de arranque).
  const pasosTab: [string, Rec | null][] = [
    ['Recepción y Verificación de Materiales', null],
    ['Montaje de Componentes', null],
    ['Cableado de Fuerza', null],
    ['Cableado de Control (PLC-I/O)', null],
    ['Etiquetado y Marcado', null],
    ['Revisión de Calidad y Continuidad', null],
    ['Pruebas FAT', null],
    ['Despacho y Entrega del Tablero', null],
  ]
  const tabCat = await prisma.edt.findUniqueOrThrow({ where: { nombre: 'TAB' }, include: { catalogoServicio: { include: { recurso: true } } } })
  const actividadesTab: ActividadPlan[] = [{
    nombre: 'Cubículo de Arranque',
    tareas: pasosTab.map(([nombre], i) => {
      const s = tabCat.catalogoServicio.find(c => c.nombre === nombre)
      if (!s) throw new Error(`TAB sin servicio ${nombre}`)
      return {
        key: `tab.${i}`, nombre, dias: Math.max(1, Math.ceil((s.horaBase ?? 0) / 9.5)), horas: s.horaBase ?? 0,
        recurso: (s.recurso?.nombre ?? 'Tecnico') as Rec, servicio: nombre,
        preds: i === 0 ? ['Schneider.rec', 'AB.recE'] : [`tab.${i - 1}`],
      }
    }),
  }]

  // ── Programación (FS por días laborables) ──
  const todas = [...actividadesPla, ...actividadesPro, ...actividadesTab].flatMap(a => a.tareas)
  const porKey = new Map(todas.map(t => [t.key, t]))
  const programar = (t: TareaPlan): void => {
    if (t.fin) return
    for (const p of t.preds) { const pt = porKey.get(p); if (!pt) throw new Error(`pred ${p}`); programar(pt) }
    const finPreds = t.preds.map(p => porKey.get(p)!.fin!.getTime())
    if (t.dias === 0) {
      const fin = new Date(Math.max(...finPreds))
      t.inicio = fin; t.fin = fin
      return
    }
    const desde = finPreds.length ? sigDia(new Date(Math.max(...finPreds))) : t.desde!
    if (t.dias === -1) return // se resuelve al final
    const b = bloque(desde, t.dias)
    t.inicio = b.inicio; t.fin = b.fin
  }
  for (const t of todas) if (t.dias !== -1) programar(t)
  const seg = porKey.get('seg')!
  const recepciones = todas.filter(t => t.recurso === 'Tecnico' && t.key.includes('rec') || t.key.startsWith('AB.rec'))
  seg.inicio = sigDia(porKey.get('Cables.oc')!.fin!)
  seg.inicio = inicioJornada(cal, seg.inicio)
  seg.fin = new Date(Math.max(...recepciones.map(r => r.fin!.getTime())))

  // ── Vista previa ──
  console.log(`${CODIGO} — PROCURA desde ${f(inicioProcura)}`)
  if (feriadosFaltan.length) console.log(`+ Feriados en Peru-STD: ${feriadosFaltan.map(x => `${x.fecha} ${x.nombre}`).join(', ')}`)
  if (tareasEnFeriado.length) {
    console.log(`  ⚠ ${tareasEnFeriado.length} tareas existentes tocan esos días (sus fechas NO se mueven; esos días pasan a contar 0 h):`)
    const agrup = new Map<string, number>()
    for (const t of tareasEnFeriado) { const k = `${t.proyectoCronograma?.proyecto?.codigo} ${t.proyectoCronograma?.tipo}`; agrup.set(k, (agrup.get(k) ?? 0) + 1) }
    console.log('   ', [...agrup].map(([k, n]) => `${k}: ${n}`).join(' · '))
  }
  console.log(`- Quitar de PRO: ${pro.proyectoActividad.map(a => `${a.nombre} (${a.proyectoTarea.length})`).join(', ')}`)
  const imprimir = (titulo: string, acts: ActividadPlan[]) => {
    console.log(`\n${titulo}`)
    for (const a of acts) {
      const ini = Math.min(...a.tareas.map(t => t.inicio!.getTime())); const fin = Math.max(...a.tareas.map(t => t.fin!.getTime()))
      console.log(`  ${a.nombre}  [${f(new Date(ini))} → ${f(new Date(fin))}]`)
      for (const t of a.tareas) {
        const nom = a.alias ? prefijarNombreTarea(a.alias, t.nombre) : t.nombre
        console.log(`    ${t.dias === 0 ? '◆' : '·'} ${nom.padEnd(70)} ${f(t.inicio!)} → ${f(t.fin!)}  ${t.dias === -1 ? '' : t.dias + 'd'} ${t.horas}h ${t.recurso}${t.preds.length ? `  ← ${t.preds.join(', ')}` : ''}`)
      }
    }
  }
  imprimir('PLA — Planos de Ingeniería (nueva actividad)', actividadesPla)
  imprimir('PRO — Suministro de Equipos', actividadesPro)
  imprimir('TAB — Armado de Tableros (EDT nuevo en EJECUCION)', actividadesTab)
  const enlaces = [
    { de: 'tr1h', a: mccPreparacion }, { de: 'tr2h', a: mccPreparacion },
    { de: 'tr3h', a: bombaInstrumentos }, { de: `tab.${pasosTab.length - 1}`, a: mccMontaje },
  ]
  console.log('\nEnlaces a obra (FC):')
  for (const e of enlaces) {
    const o = porKey.get(e.de)!
    const ok = o.fin!.getTime() <= e.a.fechaInicio.getTime()
    console.log(`  ${o.nombre} (${f(o.fin!)}) → ${e.a.nombre} (${f(e.a.fechaInicio)})  ${ok ? 'OK' : '⚠ NO SE CUMPLE'}`)
  }
  console.log(`  (se reemplaza: Cables - Recepción en Almacén GYS → ${mccPreparacion.nombre})`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  // ── Aplicar ──
  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-procura-${CODIGO}-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ pro: pro.proyectoActividad }, null, 2))
  const recursos = new Map((await prisma.recurso.findMany({ where: { nombre: { in: ['Gestor', 'Tecnico', 'Cuadrilla 2P', 'Cadista', 'Supervisor'] } }, select: { id: true, nombre: true } })).map(r => [r.nombre, r.id]))
  const servicios = await prisma.catalogoServicio.findMany({ where: { edt: { nombre: { in: ['PRO', 'TAB', 'PLA'] } } }, select: { id: true, nombre: true, edt: { select: { nombre: true } } } })
  const servicioId = (edt: string, nombre?: string) => (nombre ? servicios.find(s => s.edt?.nombre === edt && s.nombre === nombre)?.id ?? null : null)
  const org = resolverOrganigramaProyecto(await prisma.proyectoOrgNodo.findMany({ where: { proyectoId: cron.proyectoId }, select: { id: true, userId: true, cargoLabel: true, orden: true, user: { select: { name: true } } } }))
  const gestor = org.porRol.get('gestor')?.userId ?? null
  const residente = org.porRol.get('residente')?.userId ?? null
  const faseEjec = await prisma.proyectoFase.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, nombre: 'EJECUCION' } })
  const tabId = randomUUID()
  for (const t of todas) t.id = randomUUID()
  const idsQuitar = pro.proyectoActividad.flatMap(a => a.proyectoTarea.map(t => t.id))

  await prisma.$transaction(async tx => {
    for (const x of feriadosFaltan) {
      await tx.excepcionCalendario.create({ data: { id: randomUUID(), calendarioLaboralId: calDb.id, fecha: new Date(`${x.fecha}T00:00:00Z`), tipo: 'feriado', nombre: x.nombre } })
    }
    await tx.proyectoTarea.deleteMany({ where: { id: { in: idsQuitar } } })
    await tx.proyectoActividad.deleteMany({ where: { proyectoEdtId: pro.id } })
    // TAB antes de CON/CMM en EJECUCION
    await tx.proyectoEdt.updateMany({ where: { proyectoFaseId: faseEjec.id }, data: { orden: { increment: 1 } } })
    await tx.proyectoEdt.create({ data: {
      id: tabId, proyectoId: cron.proyectoId, proyectoCronogramaId: cron.id, proyectoFaseId: faseEjec.id, edtId: tabCat.id,
      nombre: tabCat.descripcion ?? 'Armado de Tableros', orden: 0, responsableId: residente, updatedAt: ahora, horasPlan: 0,
    } })
    const crear = async (edtId: string, edtCod: string, acts: ActividadPlan[], ordenBase: number, responsable: string | null) => {
      for (const [ai, a] of acts.entries()) {
        const actId = randomUUID()
        await tx.proyectoActividad.create({ data: {
          id: actId, proyectoEdtId: edtId, proyectoCronogramaId: cron.id, nombre: a.nombre, orden: ordenBase + ai, responsableId: responsable, updatedAt: ahora,
          fechaInicioPlan: new Date(Math.min(...a.tareas.map(t => t.inicio!.getTime()))), fechaFinPlan: new Date(Math.max(...a.tareas.map(t => t.fin!.getTime()))),
          horasPlan: a.tareas.reduce((s, t) => s + t.horas, 0),
        } })
        await tx.proyectoTarea.createMany({ data: a.tareas.map((t, ti) => ({
          id: t.id!, proyectoEdtId: edtId, proyectoActividadId: actId, proyectoCronogramaId: cron.id,
          nombre: a.alias ? prefijarNombreTarea(a.alias, t.nombre) : t.nombre, orden: ti,
          fechaInicio: t.inicio!, fechaFin: t.fin!, horasEstimadas: t.horas, esHito: t.dias === 0,
          catalogoServicioId: servicioId(edtCod, t.servicio), recursoId: recursos.get(t.recurso) ?? null,
          responsableId: responsable, updatedAt: ahora,
        })) })
      }
    }
    await crear(pla.id, 'PLA', actividadesPla, pla.proyectoActividad.length, residente)
    await crear(pro.id, 'PRO', actividadesPro, 0, gestor)
    await crear(tabId, 'TAB', actividadesTab, 0, residente)
    await tx.proyectoDependenciasTarea.createMany({ data: [
      ...todas.flatMap(t => t.preds.map(p => ({ id: randomUUID(), tareaOrigenId: porKey.get(p)!.id!, tareaDependienteId: t.id!, tipo: 'finish_to_start' as const, lagMinutos: 0 }))),
      ...enlaces.map(e => ({ id: randomUUID(), tareaOrigenId: porKey.get(e.de)!.id!, tareaDependienteId: e.a.id, tipo: 'finish_to_start' as const, lagMinutos: 0 })),
    ], skipDuplicates: true })
  }, { timeout: 60_000 })

  const actsTocadas = await prisma.proyectoActividad.findMany({ where: { proyectoEdtId: { in: [pro.id, pla.id, tabId] } }, select: { id: true } })
  for (const a of actsTocadas) await recalcularActividadPadre(a.id)
  for (const id of [pro.id, pla.id, tabId]) await recalcularEdtPadre(id)
  for (const fid of new Set([pro.proyectoFaseId, pla.proyectoFaseId, faseEjec.id])) if (fid) await recalcularFasePadre(fid)
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
