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
  CronogramaContexto,
} from '@/types/planTrabajo'
import { deduplicarSiglas, calcularSiglasBase } from './siglas'
import {
  calcularRolRaci,
  clasificarEdtRaci,
  esEdtDeConstruccionOComisionamiento,
  esGerenciaDeProyectos,
  esGerenciaGeneral,
  prioridadAprobador,
  siglasCliente,
} from './raciReglas'
import { referenciasDelProyecto } from './referenciasBase'
import { ROL_CONTACTO_CLIENTE_LABELS } from '@/lib/config/rolesContactoCliente'

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

/** Rango de mando por cargo (texto libre del organigrama); menor = más alto. Sin match → entre ingeniería y apoyo. */
const RANGOS_CARGO: RegExp[] = [
  /gerent|gerenc/i,
  /gestor|jefe de proyecto|project manager/i,
  /residente/i,
  /supervisor(?!.*segur)/i,
  /ssoma|segur|prevenc/i,
  /ingenier|coordinador|cadista|dibujant|proyectista/i,
  /comercial|log[ií]stic|almac|administra|compras/i,
  /t[ée]cnico|operario|oficial|ayudante|soldador|electricista|andamier/i,
]
function rangoCargo(cargo: string): number {
  const i = RANGOS_CARGO.findIndex(r => r.test(cargo))
  return i === -1 ? 5.5 : i
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
  // Gerencia General solo va en el organigrama, no en el personal del Plan (ni en la RACI).
  const nodosConPersona = organigrama.filter(n => n.user !== null && !esGerenciaGeneral(n.cargoLabel))

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

  // Orden jerárquico (izquierda→derecha en la RACI, arriba→abajo en el Personal):
  // por rango del cargo; la profundidad del organigrama solo desempata (los
  // cargos de apoyo — Comercial, SSOMA, Logística — cuelgan alto pero no mandan).
  nodosGanadores.sort((a, b) =>
    rangoCargo(a.cargoLabel) - rangoCargo(b.cargoLabel) ||
    profundidadNodo(a, organigrama) - profundidadNodo(b, organigrama) ||
    a.orden - b.orden
  )

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
  /** Código del EDT de catálogo (CON, PLA…), si se conoce. */
  codigoEdt?: string
  /** Responsables de las tareas del EDT en el cronograma. */
  responsablesTareas?: string[]
}

/**
 * matrizRaci — ProyectoEdt × personal (+ columna del cliente). Un solo A por fila:
 *   - EDTs cuyos entregables aprueba el cliente (EDTS_APROBADOS_POR_CLIENTE:
 *     plan, seguridad, ingeniería, planos, comisionamiento, cierre) → A = cliente.
 *   - El resto → A = Gerencia de Proyectos. Se busca en el organigrama
 *     (`aprobadorUserId`), porque esa persona puede figurar en el personal con
 *     otro cargo (p. ej. también es Residente).
 * Luego: responsable del EDT o de alguna de sus tareas en el cronograma → R
 * (también la Gerencia de Proyectos en las filas donde aprueba el cliente),
 * y el resto por cargo, REGLAS_RACI_CARGO (raciReglas.ts).
 * Gerencia General no entra (salvo que sea el único que puede aprobar).
 * Una celda sin rol no va en `asignaciones` (la persona no participa en ese
 * EDT); construirDataBag arma las columnas por sigla, no por posición.
 */
export function calcularMatrizRaci(
  edts: EdtParaRaci[],
  personalTodo: PersonaCalculada[],
  opciones: { aprobadorUserId?: string | null; siglaCliente?: string | null } = {}
): ResultadoCalculo<PlanRaci> {
  const advertencias: string[] = []
  const cargosNoMapeados = new Set<string>()

  // Aprobador: Gerencia de Proyectos del organigrama; si no hay, la gerencia
  // con más prioridad entre el personal.
  const aprobadorUserId =
    opciones.aprobadorUserId ??
    personalTodo.find(p => esGerenciaDeProyectos(p.cargo))?.userId ??
    [...personalTodo]
      .filter(p => prioridadAprobador(p.cargo) > 0)
      .sort((a, b) => prioridadAprobador(b.cargo) - prioridadAprobador(a.cargo))[0]?.userId ??
    null
  if (!aprobadorUserId) {
    advertencias.push('No hay Gerencia de Proyectos con persona asignada en el organigrama — la Matriz RACI queda sin Aprobador (A).')
  }
  const personal = personalTodo.filter(p => p.userId === aprobadorUserId || !esGerenciaGeneral(p.cargo))

  // La grilla RACI de la plantilla reserva 1 columna por persona (340dxa cada
  // una, textDirection btLr) — con 19+ columnas el ancho disponible (~340×19
  // ≈ 6460dxa) empieza a comprimir la sigla hasta ilegibilidad. Es solo un
  // aviso de Etapa 1 (no bloquea el export).
  if (personal.length > 19) {
    advertencias.push(
      `La Matriz RACI tiene ${personal.length} personas — con más de 19 columnas el diseño de la grilla puede verse apretado en el docx.`
    )
  }

  // Columna del cliente (sin cliente cargado, aprueba la Gerencia de Proyectos en todo).
  let siglaCliente = opciones.siglaCliente || null
  if (siglaCliente && personal.some(p => p.siglas === siglaCliente)) siglaCliente = `${siglaCliente}-C`

  const filas = edts.map(edt => {
    const clase = clasificarEdtRaci(edt.nombre, edt.codigoEdt)
    const responsables = new Set([edt.responsableId, ...(edt.responsablesTareas ?? [])].filter(Boolean))
    const apruebaCliente = Boolean(siglaCliente && clase.esEdtAprobadoPorCliente)

    const asignaciones = personal.flatMap(p => {
      let rol: PlanRaciRol | '' | null
      if (p.userId === aprobadorUserId && !apruebaCliente) rol = 'A'
      else if (responsables.has(p.userId)) rol = 'R'
      else rol = calcularRolRaci({ cargoLabel: p.cargo, ...clase })
      if (rol === null) {
        cargosNoMapeados.add(p.cargo)
        return []
      }
      return rol ? [{ siglas: p.siglas ?? '', rol }] : []
    })
    if (apruebaCliente) asignaciones.push({ siglas: siglaCliente!, rol: 'A' })

    return { edt: edt.nombre, asignaciones }
  })

  for (const cargo of cargosNoMapeados) {
    advertencias.push(`Cargo "${cargo}" no coincide con ninguna regla RACI configurada (src/lib/planTrabajo/raciReglas.ts) — su celda queda vacía salvo que sea responsable en el cronograma.`)
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

function esCargoUnoPorDia(cargo: string): boolean {
  return /ssoma|sso\b|hseq|hse\b|seguridad|supervisor/i.test(cargo)
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

function diaKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Redondea a 1 decimal y deja la diferencia de redondeo en el mes con más
 * horas, para que la fila siga sumando su total.
 */
function redondearConTotal(valores: number[], total: number): number[] {
  const r = valores.map(v => Math.round(v * 10) / 10)
  const dif = Math.round((total - r.reduce((s, v) => s + v, 0)) * 10) / 10
  if (dif !== 0 && r.length > 0) {
    const i = r.reduce((im, v, k) => (v > r[im] ? k : im), 0)
    r[i] = Math.round((r[i] + dif) * 10) / 10
  }
  return r
}

/** Días (inclusive) entre dos fechas — usado por `equipoTrabajo` para el pico DIARIO (§13.1). */
function diasEntre(inicio: Date, fin: Date): string[] {
  const dias: string[] = []
  const cursor = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate()))
  const limite = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate()))
  while (cursor.getTime() <= limite.getTime()) {
    dias.push(diaKey(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dias
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

  // Pico DIARIO, no mensual (informe "el mes es un balde demasiado grueso"):
  // dos recursos que nunca coincidieron un mismo día, pero caen en el mismo
  // mes, NO deben sumarse — eso declara gente simultánea que nunca estuvo.
  // La dedup por `recurso.id` de antes se mantiene, pero pasa a ser POR DÍA:
  // el mismo recurso en N tareas del mismo día aporta una sola vez (GYS
  // planifica por recurso, no por tarea — confirmado con datos reales de
  // CJM49). Recursos DISTINTOS activos el MISMO día sí se suman entre sí.
  // `valoresPorMes[cargo][mes]` = MÁXIMO sobre los días de ese mes (nunca la
  // suma) — la columna se rotula "MÁX." porque es un pico simultáneo, no un
  // acumulado.
  const recursosPorDia = new Map<string, Map<string, RecursoDeTarea>>()
  for (const t of todasLasTareasConFecha) {
    if (!t.recurso) continue
    for (const dia of diasEntre(t.fechaInicio, t.fechaFin)) {
      const porId = recursosPorDia.get(dia) ?? new Map<string, RecursoDeTarea>()
      porId.set(t.recurso.id, t.recurso)
      recursosPorDia.set(dia, porId)
    }
  }

  const personasPorCargoPorDia = new Map<string, Map<string, number>>()
  for (const [dia, recursosDelDia] of recursosPorDia) {
    const porCargo = new Map<string, number>()
    for (const recurso of recursosDelDia.values()) {
      for (const aporte of aportesDeRecurso(recurso)) {
        porCargo.set(aporte.cargo, (porCargo.get(aporte.cargo) ?? 0) + aporte.cantidad)
      }
    }
    // SSOMA y Supervisor: uno por día aunque haya cuadrillas en paralelo — cada
    // cuadrilla los trae en su composición, pero en obra son los mismos para todo el frente.
    for (const [cargo, n] of porCargo) {
      if (n > 1 && esCargoUnoPorDia(cargo)) porCargo.set(cargo, 1)
    }
    personasPorCargoPorDia.set(dia, porCargo)
  }

  const diasPorMes = new Map<string, string[]>()
  for (const dia of personasPorCargoPorDia.keys()) {
    const mes = dia.slice(0, 7)
    const arr = diasPorMes.get(mes) ?? []
    arr.push(dia)
    diasPorMes.set(mes, arr)
  }

  const cargosDistintos = new Set<string>()
  for (const t of todasLasTareasConFecha) {
    if (!t.recurso) continue
    for (const aporte of aportesDeRecurso(t.recurso)) cargosDistintos.add(aporte.cargo)
  }

  const equipoTrabajo = [...cargosDistintos].map(cargo => {
    const valoresPorMes = meses.map(mes => {
      const diasDelMes = diasPorMes.get(mes) ?? []
      let pico = 0
      for (const dia of diasDelMes) {
        pico = Math.max(pico, personasPorCargoPorDia.get(dia)?.get(cargo) ?? 0)
      }
      return pico
    })
    return { etiqueta: cargo, valoresPorMes, total: valoresPorMes.reduce((max, v) => Math.max(max, v), 0) }
  })

  const { data: hhPorActividadConCmn, advertencias: advHHActividad } = calcularHHPorActividadConCmn(fases)
  advertencias.push(...advHHActividad)

  // Cada tarea reparte su HH entre los meses según sus días hábiles (L–V) en
  // cada uno — antes el HH del EDT se dividía en partes iguales entre todos sus
  // meses (31 h en 3 meses = 10.333… aunque casi todo caía en uno solo).
  const horasHombre = edtsConHH.map(e => {
    const porMes = new Map<string, number>()
    for (const t of e.tareasConFecha) {
      const hh = calcularHHRealDeTarea(t)
      if (hh <= 0) continue
      const dias = diasEntre(t.fechaInicio, t.fechaFin)
      const habiles = dias.filter(d => { const w = new Date(`${d}T00:00:00Z`).getUTCDay(); return w !== 0 && w !== 6 })
      const reparto = habiles.length > 0 ? habiles : dias
      for (const d of reparto) {
        const mes = d.slice(0, 7)
        porMes.set(mes, (porMes.get(mes) ?? 0) + hh / reparto.length)
      }
    }
    return { etiqueta: e.nombre, valoresPorMes: redondearConTotal(meses.map(m => porMes.get(m) ?? 0), e.hhReal), total: e.hhReal }
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
 * referencias — documentos contractuales del proyecto (ver referenciasBase.ts).
 * Se persisten para que la UI las muestre y se editen; el docx exporta solo estas.
 */
export function calcularReferencias(contexto: Pick<PlanTrabajoContexto, 'proyecto' | 'cotizacion'>): PlanReferencia[] {
  return referenciasDelProyecto({
    cotizacionCodigo: contexto.cotizacion.codigo,
    ordenCompra: contexto.proyecto.ordenCompraCliente,
    clienteNombre: contexto.proyecto.cliente?.nombre,
  })
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

/** Qué contacto del cliente aprueba en la RACI cuando hay varios (ver rolesContactoCliente.ts). */
const PRIORIDAD_CONTACTO_APROBADOR = ['jefe_proyecto_cliente', 'administrador_contrato', 'inspector_supervisor']
const ordenAprobador = (rol: string) => {
  const i = PRIORIDAD_CONTACTO_APROBADOR.indexOf(rol)
  return i === -1 ? PRIORIDAD_CONTACTO_APROBADOR.length : i
}

/** Orquesta el cálculo completo de la Etapa 1 a partir del contexto ya cargado. */
export function calcularDatosEtapa1(contexto: PlanTrabajoContexto): ResultadoCalculo<DatosEtapa1> {
  const advertencias: string[] = []

  const { data: personalCalculado, advertencias: advPersonal } = calcularPersonalAsignado(contexto.organigrama)
  advertencias.push(...advPersonal)

  const cron = contexto.cronograma.cronogramaSeleccionado
  const fases = cron ? cron.fases.map(f => ({ nombre: f.nombre, edts: f.edts })) : []

  const edtsPlanos: EdtParaRaci[] = fases.flatMap(f =>
    f.edts.map(e => ({
      id: e.id,
      nombre: e.nombre,
      responsableId: e.responsableId,
      codigoEdt: e.codigoEdt,
      responsablesTareas: e.actividades.flatMap(a => a.tareas.map(t => t.responsableId ?? '')).filter(Boolean),
    }))
  )
  // Gerencia de Proyectos del organigrama (aunque en el personal figure con otro cargo).
  const aprobadorUserId = contexto.organigrama.find(n => n.user && esGerenciaDeProyectos(n.cargoLabel))?.user?.id ?? null
  // Aprobador del cliente: el contacto del proyecto (el mismo de la Matriz de
  // Comunicaciones, p. ej. "HP"); sin contacto, la empresa ("NEXA").
  const contactoCliente = [...(contexto.contactosCliente ?? [])].sort(
    (a, b) => ordenAprobador(a.rolEnProyecto) - ordenAprobador(b.rolEnProyecto)
  )[0]
  const siglaCliente = contactoCliente
    ? calcularSiglasBase(contactoCliente.nombre)
    : contexto.proyecto.cliente?.nombre ? siglasCliente(contexto.proyecto.cliente.nombre) : null
  const { data: matrizRaci, advertencias: advRaci } = calcularMatrizRaci(edtsPlanos, personalCalculado, {
    aprobadorUserId,
    siglaCliente,
  })
  advertencias.push(...advRaci)

  const { data: datosHistograma, advertencias: advHist } = calcularHistogramasYCronograma(fases)
  advertencias.push(...advHist)

  const referencias = calcularReferencias(contexto)

  // Involucrados del cliente (contactos del proyecto) al final del Personal, con
  // la empresa del cliente — como el plan de referencia NEXA. No entran a la RACI
  // como filas propias: ahí el cliente ya figura con su sigla de aprobador.
  // Cliente PRIMERO (columnas de la RACI y filas del Personal), el aprobador adelante.
  const contactosOrdenados = [...(contexto.contactosCliente ?? [])].sort(
    (a, b) => ordenAprobador(a.rolEnProyecto) - ordenAprobador(b.rolEnProyecto)
  )
  const personalCliente: PlanPersonal[] = contactosOrdenados.map(c => ({
    // En mayúsculas como el resto de la tabla (los nombres del organigrama ya vienen así).
    nombre: c.nombre.toUpperCase(),
    cargo: (c.cargo?.trim() || ROL_CONTACTO_CLIENTE_LABELS[c.rolEnProyecto] || c.rolEnProyecto).toUpperCase(),
    empresa: contexto.proyecto.cliente?.nombre ?? '',
    siglas: calcularSiglasBase(c.nombre),
  }))
  // Siglas deduplicadas con el personal GYS adelante (sus siglas ya están en la
  // RACI y no deben cambiar); recién después el cliente pasa al inicio.
  const conSiglas = deduplicarSiglas([
    ...personalCalculado.map(({ userId: _userId, ...resto }) => resto),
    ...personalCliente,
  ])
  const personalAsignado: PlanPersonal[] = [
    ...conSiglas.slice(personalCalculado.length),
    ...conSiglas.slice(0, personalCalculado.length),
  ]

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
