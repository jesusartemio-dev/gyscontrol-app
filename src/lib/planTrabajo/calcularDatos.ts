import type {
  OrgNodoContexto,
  PlanTrabajoContexto,
  PlanPersonal,
  PlanRaci,
  PlanRaciRol,
  PlanHistogramas,
  PlanHistogramaHHActividad,
  PlanCronograma,
  PlanReferencia,
  TdrContexto,
  CronogramaContexto,
} from '@/types/planTrabajo'
import { deduplicarSiglas, calcularSiglasBase } from './siglas'
import {
  calcularRolRaci,
  clasificarTipoEdt,
  esEdtDeSeguridad,
  esEdtDeDocumentacion,
  esEdtDeConstruccionOComisionamiento,
  prioridadAprobador,
} from './raciReglas'
import { REFERENCIAS_BASE } from './referenciasBase'

/**
 * Cálculo determinista de las secciones de "Etapa 1" del Plan de Trabajo
 * (personalAsignado, matrizRaci, histogramas, cronogramaResumen, referencias)
 * directamente desde BD, sin pasar por IA (informe §6 — "la IA redacta, no calcula").
 */

const EMPRESA_DEFAULT = 'GYS CONTROL INDUSTRIAL SAC'

export interface ResultadoCalculo<T> {
  data: T
  advertencias: string[]
}

interface PersonaCalculada extends PlanPersonal {
  userId: string
}

function profundidadNodo(nodo: OrgNodoContexto, todos: OrgNodoContexto[]): number {
  let profundidad = 0
  let actual: OrgNodoContexto | undefined = nodo
  const visitados = new Set<string>()
  while (actual?.parentId) {
    if (visitados.has(actual.id)) break // corta ciclos defensivamente
    visitados.add(actual.id)
    const padre = todos.find(n => n.id === actual!.parentId)
    if (!padre) break
    profundidad++
    actual = padre
  }
  return profundidad
}

/**
 * personalAsignado — directo de ProyectoOrgNodo (nodos con persona real asignada).
 * Desempate cuando una persona ocupa 2+ nodos: gana el nodo de nivel jerárquico
 * más profundo; si empatan, el de `createdAt` más reciente (no existe un campo
 * "fecha de asignación" dedicado en ProyectoOrgNodo — createdAt es el proxy).
 */
export function calcularPersonalAsignado(
  organigrama: OrgNodoContexto[]
): ResultadoCalculo<PersonaCalculada[]> {
  const advertencias: string[] = []
  const nodosConPersona = organigrama.filter(n => n.user !== null)

  if (nodosConPersona.length < 3) {
    advertencias.push(
      `Solo hay ${nodosConPersona.length} persona(s) con asignación real en el organigrama — la Matriz RACI puede quedar poco representativa. Asigná personas reales a más nodos del organigrama.`
    )
  }

  const porUsuario = new Map<string, OrgNodoContexto[]>()
  for (const nodo of nodosConPersona) {
    const uid = nodo.user!.id
    const lista = porUsuario.get(uid) ?? []
    lista.push(nodo)
    porUsuario.set(uid, lista)
  }

  const nodosGanadores: OrgNodoContexto[] = []
  for (const nodos of porUsuario.values()) {
    if (nodos.length === 1) {
      nodosGanadores.push(nodos[0])
      continue
    }
    const ordenados = [...nodos].sort((a, b) => {
      const profA = profundidadNodo(a, organigrama)
      const profB = profundidadNodo(b, organigrama)
      if (profA !== profB) return profB - profA // mayor profundidad primero
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() // más reciente primero
    })
    nodosGanadores.push(ordenados[0])
    const nombre = ordenados[0].user!.name ?? ordenados[0].user!.email
    advertencias.push(
      `"${nombre}" aparece en ${nodos.length} nodos del organigrama — se usó "${ordenados[0].cargoLabel}" (nivel jerárquico más profundo).`
    )
  }

  const personalCrudo: PersonaCalculada[] = nodosGanadores.map(nodo => ({
    nombre: nodo.user!.name ?? nodo.user!.email,
    cargo: nodo.cargoLabel,
    empresa: nodo.empresaOverride ?? EMPRESA_DEFAULT,
    siglas: calcularSiglasBase(nodo.user!.name ?? nodo.user!.email),
    cip: nodo.cipOverride ?? nodo.user!.empleado?.cip ?? undefined,
    email: nodo.user!.email,
    telefono: nodo.telefonoOverride ?? nodo.user!.empleado?.telefono ?? undefined,
    proyectoOrgNodoRefId: nodo.id,
    userId: nodo.user!.id,
  }))

  // Advertencia de colisión ANTES de deduplicar (requisito explícito de la Etapa 1).
  const conteoSiglasBase = new Map<string, number>()
  for (const p of personalCrudo) {
    conteoSiglasBase.set(p.siglas!, (conteoSiglasBase.get(p.siglas!) ?? 0) + 1)
  }
  for (const [sigla, count] of conteoSiglasBase) {
    if (count > 1) {
      advertencias.push(`Colisión de siglas: ${count} personas calculan "${sigla}" — se ajustó automáticamente al deduplicar.`)
    }
  }

  const personal = deduplicarSiglas(personalCrudo) as PersonaCalculada[]

  return { data: personal, advertencias }
}

interface EdtParaRaci {
  id: string
  nombre: string
  responsableId: string | null
}

/**
 * matrizRaci — ProyectoEdt × personal, usando REGLAS_RACI_CARGO (raciReglas.ts).
 * Una fila por EDT; la grilla real (columnas por persona) se arma en
 * construirDataBag a partir de `asignaciones`, no acá.
 * Post-procesa cada fila para que haya máximo UN Aprobador (A) — si 2+ cargos
 * de gerencia matchean en el mismo EDT, prioridadAprobador() decide cuál queda
 * A y el resto baja a C (addendum D.2 — antes salían dos "A" por fila).
 */
export function calcularMatrizRaci(
  edts: EdtParaRaci[],
  personal: PersonaCalculada[]
): ResultadoCalculo<PlanRaci> {
  const advertencias: string[] = []
  const cargosNoMapeados = new Set<string>()

  // La grilla RACI de la plantilla reserva 1 columna por persona (340dxa cada
  // una, textDirection btLr) — con 19+ columnas el ancho disponible (~340×19
  // ≈ 6460dxa) empieza a comprimir la sigla hasta ilegibilidad. Es solo un
  // aviso de Etapa 1 (no bloquea el export).
  if (personal.length > 19) {
    advertencias.push(
      `La Matriz RACI tiene ${personal.length} personas — con más de 19 columnas el diseño de la grilla puede verse apretado en el docx.`
    )
  }

  const filas = edts.map(edt => {
    const tipoEdt = clasificarTipoEdt(edt.nombre)
    const esSeguridad = esEdtDeSeguridad(edt.nombre)
    const esDocumentacion = esEdtDeDocumentacion(edt.nombre)

    const asignacionesConCargo = personal.map(p => {
      const rol = calcularRolRaci({
        cargoLabel: p.cargo,
        tipoEdt,
        esResponsableDelEdt: edt.responsableId === p.userId,
        esEdtDeSeguridad: esSeguridad,
        esEdtDeDocumentacion: esDocumentacion,
      })
      if (rol === null) {
        cargosNoMapeados.add(p.cargo)
        return { siglas: p.siglas ?? '', cargo: p.cargo, rol: 'I' as PlanRaciRol }
      }
      return { siglas: p.siglas ?? '', cargo: p.cargo, rol }
    })

    // Máximo un Aprobador por EDT — prioridad Gerencia de Proyectos > Gerencia General.
    const aprobadores = asignacionesConCargo.filter(a => a.rol === 'A')
    if (aprobadores.length > 1) {
      const ganador = [...aprobadores].sort(
        (a, b) => prioridadAprobador(b.cargo) - prioridadAprobador(a.cargo)
      )[0]
      for (const a of asignacionesConCargo) {
        if (a.rol === 'A' && a !== ganador) a.rol = 'C'
      }
    }

    return {
      edt: edt.nombre,
      asignaciones: asignacionesConCargo.map(({ siglas, rol }) => ({ siglas, rol })),
    }
  })

  for (const cargo of cargosNoMapeados) {
    advertencias.push(`Cargo "${cargo}" no coincide con ninguna regla RACI configurada (src/lib/planTrabajo/raciReglas.ts) — se asignó "I" (Informado) por defecto.`)
  }

  return { data: { filas }, advertencias }
}

/** Recurso resuelto de una tarea — mismo shape que `CronogramaContexto[...]tareas[].recurso` (ver cargarContexto.ts). */
export type RecursoDeTarea = NonNullable<CronogramaContexto['fases'][number]['edts'][number]['actividades'][number]['tareas'][number]['recurso']>

/**
 * HH real de UNA tarea = horasEstimadas × personas del recurso EN VIVO.
 * `horasEstimadas` es DURACIÓN, no horas-hombre (confirmado por su uso real
 * en la calendarización — ver docs/analisis-pesos-avance.md, sección 4): una
 * Cuadrilla 2P trabajando 4h de duración son 8 HH, no 4 (informe "el TOTAL
 * HH: 468 no son horas-hombre"). NUNCA usa `personasEstimadas` — ese campo es
 * un snapshot manual/histórico que casi siempre vale 1 aunque el recurso sea
 * una cuadrilla real (ver el análisis, sección 5) — la fuente autoritativa es
 * `Recurso`/`RecursoPerfil` en vivo, igual que ya hace `equipoTrabajo` (§13.1).
 *
 * "Sin dato no se rellena": sin recurso asignado, o cuadrilla sin perfiles
 * cargados, esta función devuelve 0 — NUNCA asume 1 persona por defecto. El
 * caller decide si eso amerita una advertencia (`calcularHistogramasYCronograma`
 * sí la emite; ver `tareasSinRecursoConHoras`).
 *
 * Exportada para que `contextoIA.ts` (bloque de resumen numérico de la IA)
 * use el MISMO número — nunca un cálculo propio derivado de personasEstimadas.
 */
export function calcularHHRealDeTarea(t: { horasEstimadas: number | null; recurso: RecursoDeTarea | null }): number {
  const horas = Number(t.horasEstimadas) || 0
  if (horas === 0 || !t.recurso) return 0
  if (t.recurso.tipo === 'individual') return horas
  const personas = t.recurso.perfiles.reduce((s, p) => s + p.cantidad, 0)
  return horas * personas
}

interface EdtParaCronograma {
  id: string
  nombre: string
  faseNombre: string
  fechaInicioPlan: Date | null
  fechaFinPlan: Date | null
  actividades: { nombre: string }[]
  /**
   * Tareas reales del EDT (todas las actividades aplanadas) — fuente de la
   * dotación por cargo de `equipoTrabajo` (informe §13, Bug 3) Y del HH real
   * de horasHombre/totalHH/cronogramaResumen (`horasEstimadas × personas del
   * recurso` — ver `hhRealDeTarea`, corrección del "468 no son horas-hombre").
   */
  tareasConFecha: { nombre: string; recurso: RecursoDeTarea | null; fechaInicio: Date; fechaFin: Date; horasEstimadas: number | null }[]
}

/**
 * Un "aporte" de personas de UN recurso (no de una tarea — ver más abajo) al
 * histograma de equipo, ya resuelto a cargo — informe §13, Bug 3 y su
 * corrección posterior tras el análisis de catálogo de recursos
 * (docs/analisis-composicion-recursos.md). La dotación real vive en
 * `Recurso.tipo`:
 * - `individual` → el recurso ES un cargo (`Recurso.nombre` — "Gestor",
 *   "Supervisor", "Tecnico"...) y aporta SIEMPRE 1 a su propio cargo — su
 *   propia composición es un POOL de la empresa que puede cubrir ese rol,
 *   nunca dotación de la tarea.
 * - `cuadrilla` → se descompone en sus PERFILES (`RecursoPerfil.activo=true`,
 *   recursos individuales × cantidad), cada uno aporta `recursoMiembroNombre`
 *   como cargo — mismo vocabulario `Recurso.nombre` que un individual, sin
 *   ningún join a `Empleado`/`Cargo` (antes esto leía `RecursoComposicion` y
 *   resolvía `empleadoId → Cargo.nombre`; se descubrió que esos empleados
 *   eran solo una referencia de costo repetida N veces — nunca dotación real
 *   ni cargo real de la cuadrilla — ver el análisis).
 *
 * UNA SOLA REGLA para individual y cuadrilla (confirmado por el usuario —
 * GYS planifica por RECURSO, no por tarea: si un frente necesita más gente
 * se planifica con una cuadrilla más grande, nunca varias cuadrillas chicas
 * en paralelo bajo el mismo recurso): cada RECURSO aporta su dotación UNA
 * VEZ por mes, sin importar en cuántas tareas concurrentes aparezca ese
 * mismo recursoId — la misma cuadrilla citada por 3 tareas del mismo mes es
 * la MISMA gente, no 3 cuadrillas (confirmado en producción: en CJM49,
 * "Cuadrilla 4P" es un único recursoId citado por 5 tareas). El dedup es por
 * `recurso.id` + mes (ver `calcularHistogramasYCronograma`), NO por
 * `empleadoId` (ya no hay empleado en el camino) ni por tarea.
 */
interface AportePersona {
  cargo: string
  cantidad: number
}

function aportesDeRecurso(recurso: RecursoDeTarea): AportePersona[] {
  if (recurso.tipo === 'individual') {
    return [{ cargo: recurso.nombre, cantidad: 1 }]
  }
  return recurso.perfiles.map(p => ({ cargo: p.recursoMiembroNombre, cantidad: p.cantidad }))
}

/** "" si no hay actividades, el nombre si hay 1, "{n} actividades" si hay varias (nunca vacío — addendum E). */
function resumenActividades(actividades: { nombre: string }[]): string {
  if (actividades.length === 0) return ''
  if (actividades.length === 1) return actividades[0].nombre
  return `${actividades.length} actividades`
}

function mesKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function mesesEntre(inicio: Date, fin: Date): string[] {
  const meses: string[] = []
  const cursor = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1))
  const limite = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), 1))
  while (cursor.getTime() <= limite.getTime()) {
    meses.push(mesKey(cursor))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return meses
}

/**
 * histogramaHH y cronogramaResumen — una fila por EDT, con el HH REAL de ese
 * EDT (`hhRealDelEdt` = Σ de sus tareas, cada una `horasEstimadas × personas
 * del recurso en vivo` — NUNCA `edt.horasPlan` ni `personasEstimadas`, ver
 * `hhRealDeTarea`). Antes esta sección leía `edt.horasPlan` directo — que es
 * DURACIÓN sumada, no horas-hombre (el "TOTAL HH: 468" de CJM49 no eran
 * horas-hombre reales: una Cuadrilla 2P de 4h de duración sumaba 4, no 8).
 *
 * Granularidad elegida para GARANTIZAR que totalHH == Σ histogramaHH[].total
 * == Σ cronogramaResumen[].horasPlan (informe §4.2), ahora con el número real
 * — las tres leen `edtsConHH`, computado una sola vez.
 *
 * `equipoTrabajo` (dotación de personas, §13.1) es una granularidad DISTINTA
 * y NO se toca acá: baja hasta la tarea real para un pico por mes — ver su
 * propio comentario más abajo.
 * EDTs sin fechaInicioPlan/fechaFinPlan se excluyen (no se pueden ubicar en
 * un mes) y generan una advertencia — nunca se inventan fechas.
 */
export function calcularHistogramasYCronograma(
  fases: { nombre: string; edts: CronogramaContexto['fases'][number]['edts'] }[]
): ResultadoCalculo<{ histogramas: PlanHistogramas; cronogramaResumen: PlanCronograma; totalHH: number }> {
  const advertencias: string[] = []

  const edtsConFase: EdtParaCronograma[] = fases.flatMap(f =>
    f.edts.map(e => ({
      id: e.id,
      nombre: e.nombre,
      faseNombre: f.nombre,
      fechaInicioPlan: e.fechaInicioPlan,
      fechaFinPlan: e.fechaFinPlan,
      actividades: e.actividades.map(a => ({ nombre: a.nombre })),
      tareasConFecha: e.actividades.flatMap(a =>
        a.tareas.map(t => ({ nombre: t.nombre, recurso: t.recurso, fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, horasEstimadas: t.horasEstimadas }))
      ),
    }))
  )

  const edtsSinFecha = edtsConFase.filter(e => !e.fechaInicioPlan || !e.fechaFinPlan)
  if (edtsSinFecha.length > 0) {
    advertencias.push(
      `${edtsSinFecha.length} EDT(s) sin fecha de inicio/fin planificada — se excluyen de histogramas, cronograma resumen y totalHH: ${edtsSinFecha.map(e => e.nombre).join(', ')}.`
    )
  }

  const edtsConFecha = edtsConFase.filter(
    (e): e is EdtParaCronograma & { fechaInicioPlan: Date; fechaFinPlan: Date } =>
      e.fechaInicioPlan != null && e.fechaFinPlan != null
  )

  // HH REAL por tarea — ver `calcularHHRealDeTarea` (exportada para que
  // contextoIA.ts use el MISMO número, nunca uno propio derivado de
  // personasEstimadas). Reemplaza `edt.horasPlan` como fuente de
  // horasHombre/totalHH/cronogramaResumen/porFase.
  const tareasSinRecursoConHoras = new Set<string>()
  function hhRealDeTarea(t: { nombre: string; horasEstimadas: number | null; recurso: RecursoDeTarea | null }): number {
    if ((Number(t.horasEstimadas) || 0) > 0 && !t.recurso) tareasSinRecursoConHoras.add(t.nombre)
    return calcularHHRealDeTarea(t) // 0 si sin recurso, o cuadrilla sin perfiles — nunca fabrica una dotación
  }
  function hhRealDelEdt(e: Pick<EdtParaCronograma, 'tareasConFecha'>): number {
    return e.tareasConFecha.reduce((sum, t) => sum + hhRealDeTarea(t), 0)
  }
  // Se computa una sola vez por EDT — horasHombre, totalHH, cronogramaResumen y
  // porFase leen todos el mismo número (garantiza la triple igualdad).
  const edtsConHH = edtsConFecha.map(e => ({ ...e, hhReal: hhRealDelEdt(e) }))

  const totalHH = edtsConHH.reduce((sum, e) => sum + e.hhReal, 0)

  const todasFechas = edtsConFecha.flatMap(e => [e.fechaInicioPlan, e.fechaFinPlan])
  const meses = todasFechas.length > 0
    ? mesesEntre(
        new Date(Math.min(...todasFechas.map(d => d.getTime()))),
        new Date(Math.max(...todasFechas.map(d => d.getTime())))
      )
    : []

  // Dotación real por CARGO y mes (informe §13, Bug 3 y su corrección
  // posterior tras el análisis de catálogo de recursos). `equipoTrabajo` deja
  // de ser "una fila por EDT" — es "una fila por CARGO", igual que el manual
  // de referencia del cliente (Gestor de Proyecto, Supervisor, Supervisor de
  // Seguridad, Técnicos...). `total` sigue siendo el MÁXIMO de la fila (no la
  // suma — el rótulo "MÁX." de la plantilla ya es correcto, heredado del fix
  // anterior, no se toca la plantilla).
  const todasLasTareasConFecha = edtsConFecha.flatMap(e => e.tareasConFecha)

  // Cuadrilla usada en una tarea pero sin perfiles cargados todavía (esperado
  // justo después de la migración a RecursoPerfil, antes de que el usuario
  // recargue la composición) — 0 aporte + advertencia, nunca un default.
  const cuadrillasSinPerfiles = new Set<string>()
  for (const t of todasLasTareasConFecha) {
    if (t.recurso?.tipo === 'cuadrilla' && t.recurso.perfiles.length === 0) {
      cuadrillasSinPerfiles.add(t.recurso.nombre)
    }
  }
  if (cuadrillasSinPerfiles.size > 0) {
    advertencias.push(
      `${cuadrillasSinPerfiles.size} cuadrilla(s) sin perfiles configurados (${[...cuadrillasSinPerfiles].join(', ')}) — sus tareas no aportan dotación al histograma de equipo hasta que se recargue su composición en /catalogo/recursos.`
    )
  }
  if (tareasSinRecursoConHoras.size > 0) {
    advertencias.push(
      `${tareasSinRecursoConHoras.size} tarea(s) con horas estimadas cargadas pero SIN recurso asignado (${[...tareasSinRecursoConHoras].slice(0, 10).join(', ')}${tareasSinRecursoConHoras.size > 10 ? '...' : ''}) — no aportan a horasHombre/totalHH hasta que se les asigne un recurso (nunca se asume 1 persona por defecto).`
    )
  }

  // Por mes: recursos DISTINTOS activos ese mes, deduplicados por `recurso.id`
  // — la MISMA cuadrilla/individual citada por N tareas concurrentes del
  // mismo mes es la MISMA gente (GYS planifica por recurso, no por tarea: si
  // hace falta más gente se usa una cuadrilla más grande, nunca varias en
  // paralelo bajo el mismo recurso — confirmado con datos reales de CJM49).
  // Recursos DISTINTOS sí se suman entre sí (son crews/roles distintos
  // coexistiendo ese mes).
  function recursosDistintosDelMes(mes: string): RecursoDeTarea[] {
    const porId = new Map<string, RecursoDeTarea>()
    for (const t of todasLasTareasConFecha) {
      if (!t.recurso) continue
      if (!mesesEntre(t.fechaInicio, t.fechaFin).includes(mes)) continue
      porId.set(t.recurso.id, t.recurso)
    }
    return [...porId.values()]
  }

  const cargosDistintos = new Set<string>()
  for (const t of todasLasTareasConFecha) {
    if (!t.recurso) continue
    for (const aporte of aportesDeRecurso(t.recurso)) cargosDistintos.add(aporte.cargo)
  }

  const equipoTrabajo = [...cargosDistintos].map(cargo => {
    const valoresPorMes = meses.map(mes => {
      let suma = 0
      for (const recurso of recursosDistintosDelMes(mes)) {
        for (const aporte of aportesDeRecurso(recurso)) {
          if (aporte.cargo === cargo) suma += aporte.cantidad
        }
      }
      return suma
    })
    return { etiqueta: cargo, valoresPorMes, total: valoresPorMes.reduce((max, v) => Math.max(max, v), 0) }
  })

  const { data: hhPorActividadConCmn, advertencias: advHHActividad } = calcularHHPorActividadConCmn(fases)
  advertencias.push(...advHHActividad)

  const horasHombre = edtsConHH.map(e => {
    const mesesEdt = mesesEntre(e.fechaInicioPlan, e.fechaFinPlan)
    const horas = e.hhReal
    const horasPorMes = mesesEdt.length > 0 ? horas / mesesEdt.length : 0
    const mesesEdtSet = new Set(mesesEdt)
    const valoresPorMes = meses.map(m => (mesesEdtSet.has(m) ? horasPorMes : 0))
    return { etiqueta: e.nombre, valoresPorMes, total: horas }
  })

  const cronogramaFilas = edtsConHH.map(e => ({
    fase: e.faseNombre,
    edt: e.nombre,
    actividad: resumenActividades(e.actividades),
    fechaInicio: e.fechaInicioPlan.toISOString().slice(0, 10),
    fechaFin: e.fechaFinPlan.toISOString().slice(0, 10),
    horasPlan: e.hhReal,
  }))

  // HH por fase — misma fuente (edtsConHH) que totalHH, para que el bloque
  // de HECHOS de Etapa 2 pueda citar horas por fase sin que la IA las invente
  // (addendum B — el docx auditado mostró una distribución de HH por fase
  // completamente distinta a la real aunque el total coincidía).
  const porFaseMap = new Map<string, number>()
  for (const e of edtsConHH) {
    porFaseMap.set(e.faseNombre, (porFaseMap.get(e.faseNombre) ?? 0) + e.hhReal)
  }
  const porFase = Array.from(porFaseMap.entries()).map(([fase, total]) => ({ fase, total }))

  return {
    data: {
      histogramas: { meses, equipoTrabajo, horasHombre, porFase, hhPorActividadConCmn },
      cronogramaResumen: { filas: cronogramaFilas },
      totalHH,
    },
    advertencias,
  }
}

/** Tarea con los campos que necesita el reparto de HH por cargo (§13.3). */
interface TareaParaHHActividad {
  horasEstimadas: number | null
  recurso: RecursoDeTarea | null
}

interface HorasPorCargo {
  cargo: string
  horas: number
}

/**
 * Reparte el HH REAL de una tarea (horasEstimadas × personas del recurso —
 * ver `hhRealDeTarea`) entre los cargos que aporta su recurso: cada cargo se
 * lleva `horasEstimadas × cantidad_de_ese_cargo` (NUNCA normalizado por el
 * total de personas — normalizar volvía a la duración cruda, perdiendo
 * exactamente la corrección de personas que motivó este cambio). Para un
 * individual (`aportesDeRecurso` da 1 solo cargo con cantidad=1) esto es
 * `horasEstimadas × 1` — sin cambios. La suma de todos los cargos de una
 * tarea da exactamente su HH real (mismo número que `hhRealDeTarea`).
 */
function repartirHorasPorCargo(tarea: TareaParaHHActividad): HorasPorCargo[] {
  if (!tarea.recurso || !tarea.horasEstimadas) return []
  const aportes = aportesDeRecurso(tarea.recurso)
  return aportes.map(a => ({ cargo: a.cargo, horas: tarea.horasEstimadas! * a.cantidad }))
}

/**
 * HH por actividad × cargo, SOLO EDTs de Construcción/Comisionamiento (§13.3
 * — detalle que complementa, sin reemplazar, el histograma de horasHombre
 * por EDT/mes de §13.2). Si 2 EDTs distintos tienen una actividad con el
 * MISMO nombre, sus horas se suman bajo esa única etiqueta (mismo criterio
 * de agregación por etiqueta que `equipoTrabajo`). Misma unidad HH real que
 * el resto del documento (§1/§2/§13.2/§14) — nunca duración cruda.
 *
 * COMPUERTA DE COBERTURA (post-mortem del gráfico al 23%): este detalle
 * depende de `horasEstimadas` a nivel TAREA, un campo que en la práctica se
 * carga de forma incompleta (mismo agujero de fondo que ya tuvo
 * `personasEstimadas` — nunca resuelto en origen, solo evitado). Un gráfico
 * parcial se ve igual de "completo" que uno real — nadie nota que falta un
 * tercio de las tareas. Por eso, si UNA SOLA tarea con recurso asignado en
 * un EDT de Construcción/Comisionamiento no tiene `horasEstimadas` cargada,
 * la sección ENTERA se omite (nunca un gráfico parcial) y se emite una
 * advertencia de Etapa 1 con la cobertura exacta — "sin dato no se rellena",
 * aplicado a la sección completa, no actividad por actividad.
 */
function calcularHHPorActividadConCmn(
  fases: { nombre: string; edts: CronogramaContexto['fases'][number]['edts'] }[]
): ResultadoCalculo<PlanHistogramaHHActividad> {
  const edtsConCmn = fases.flatMap(f => f.edts).filter(e => esEdtDeConstruccionOComisionamiento(e.nombre))
  const tareasConRecurso: TareaParaHHActividad[] = edtsConCmn.flatMap(e =>
    e.actividades.flatMap(a => a.tareas.filter(t => t.recurso !== null))
  )
  const tareasConHoras = tareasConRecurso.filter(t => t.horasEstimadas !== null)

  if (tareasConRecurso.length > 0 && tareasConHoras.length < tareasConRecurso.length) {
    const pct = Math.round((tareasConHoras.length / tareasConRecurso.length) * 100)
    return {
      data: { actividades: [], series: [] },
      advertencias: [
        `Detalle de HH por Actividad (Construcción/Comisionamiento, §13.3) NO se generó: solo ${tareasConHoras.length} de ${tareasConRecurso.length} tareas con recurso asignado (${pct}%) tienen "horas estimadas" cargadas. Completá las horas estimadas de TODAS las tareas de Construcción/Comisionamiento con recurso para habilitar este gráfico — un gráfico parcial se vería igual de completo que uno real.`,
      ],
    }
  }

  const horasPorActividadYCargo = new Map<string, Map<string, number>>()
  for (const edt of edtsConCmn) {
    for (const actividad of edt.actividades) {
      const porCargo = horasPorActividadYCargo.get(actividad.nombre) ?? new Map<string, number>()
      for (const tarea of actividad.tareas) {
        for (const aporte of repartirHorasPorCargo(tarea)) {
          porCargo.set(aporte.cargo, (porCargo.get(aporte.cargo) ?? 0) + aporte.horas)
        }
      }
      // Solo se registra la actividad si algún cargo aportó horas — una actividad
      // sin recurso/horasEstimadas válidos no debe aparecer como una barra vacía.
      if (porCargo.size > 0) horasPorActividadYCargo.set(actividad.nombre, porCargo)
    }
  }

  const actividades = [...horasPorActividadYCargo.keys()]
  const cargosDistintos = new Set<string>()
  for (const porCargo of horasPorActividadYCargo.values()) {
    for (const cargo of porCargo.keys()) cargosDistintos.add(cargo)
  }

  const series = [...cargosDistintos].map(cargo => ({
    cargo,
    valoresPorActividad: actividades.map(act => Math.round((horasPorActividadYCargo.get(act)!.get(cargo) ?? 0) * 10) / 10),
  }))

  return { data: { actividades, series }, advertencias: [] }
}

/**
 * referencias — REFERENCIAS_BASE (normativa SSOMA estándar) + normas del
 * análisis TDR si existe. construirDataBag ya deduplica esto mismo al
 * exportar; se persiste también acá para que la UI muestre el resultado
 * completo apenas corre la Etapa 1, no solo al exportar el docx.
 */
export function calcularReferencias(tdr: TdrContexto | null): PlanReferencia[] {
  const extra: PlanReferencia[] = []
  const normas = tdr?.normasAplicables
  if (Array.isArray(normas)) {
    for (const item of normas) {
      if (typeof item === 'string' && item.trim()) {
        extra.push({ titulo: item.trim(), origen: 'NORMATIVA' })
        continue
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        const titulo =
          (typeof obj.titulo === 'string' && obj.titulo) ||
          (typeof obj.nombre === 'string' && obj.nombre) ||
          (typeof obj.descripcion === 'string' && obj.descripcion) ||
          null
        if (titulo) {
          const codigoDocumento =
            (typeof obj.codigo === 'string' && obj.codigo) ||
            (typeof obj.codigoDocumento === 'string' && obj.codigoDocumento) ||
            undefined
          extra.push({ codigoDocumento, titulo, origen: 'NORMATIVA' })
        }
      }
    }
  }
  return [...REFERENCIAS_BASE, ...extra]
}

/**
 * Fuente única de "totalHH" — usada por construirDataBag (export) y por el
 * bloque de hechos inyectado en el prompt de Etapa 2 (contextoIA.ts), para
 * garantizar que ambos citen exactamente la misma cifra (informe §4.2).
 */
export function calcularTotalHH(histogramas: PlanHistogramas): number {
  return histogramas.horasHombre.reduce((sum, f) => sum + (f.total || 0), 0)
}

export interface DatosEtapa1 {
  personalAsignado: PlanPersonal[]
  matrizRaci: PlanRaci
  histogramas: PlanHistogramas
  cronogramaResumen: PlanCronograma
  referencias: PlanReferencia[]
  totalHH: number
}

/** Orquesta el cálculo completo de la Etapa 1 a partir del contexto ya cargado. */
export function calcularDatosEtapa1(contexto: PlanTrabajoContexto): ResultadoCalculo<DatosEtapa1> {
  const advertencias: string[] = []

  const { data: personalCalculado, advertencias: advPersonal } = calcularPersonalAsignado(contexto.organigrama)
  advertencias.push(...advPersonal)

  const cron = contexto.cronograma.cronogramaSeleccionado
  const fases = cron ? cron.fases.map(f => ({ nombre: f.nombre, edts: f.edts })) : []

  const edtsPlanos: EdtParaRaci[] = fases.flatMap(f =>
    f.edts.map(e => ({ id: e.id, nombre: e.nombre, responsableId: e.responsableId }))
  )
  const { data: matrizRaci, advertencias: advRaci } = calcularMatrizRaci(edtsPlanos, personalCalculado)
  advertencias.push(...advRaci)

  const { data: datosHistograma, advertencias: advHist } = calcularHistogramasYCronograma(fases)
  advertencias.push(...advHist)

  const referencias = calcularReferencias(contexto.tdr)

  const personalAsignado: PlanPersonal[] = personalCalculado.map(({ userId: _userId, ...resto }) => resto)

  return {
    data: {
      personalAsignado,
      matrizRaci,
      histogramas: datosHistograma.histogramas,
      cronogramaResumen: datosHistograma.cronogramaResumen,
      referencias,
      totalHH: datosHistograma.totalHH,
    },
    advertencias,
  }
}
