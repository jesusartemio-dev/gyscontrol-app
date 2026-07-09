import type {
  OrgNodoContexto,
  PlanTrabajoContexto,
  PlanPersonal,
  PlanRaci,
  PlanRaciRol,
  PlanHistogramas,
  PlanCronograma,
  PlanReferencia,
  TdrContexto,
  CronogramaContexto,
} from '@/types/planTrabajo'
import { deduplicarSiglas, calcularSiglasBase } from './siglas'
import { calcularRolRaci, clasificarTipoEdt, esEdtDeSeguridad, esEdtDeDocumentacion, prioridadAprobador } from './raciReglas'
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
 * Una fila por EDT; rolesTexto se compone en construirDataBag, no acá.
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

interface EdtParaCronograma {
  id: string
  nombre: string
  faseNombre: string
  fechaInicioPlan: Date | null
  fechaFinPlan: Date | null
  horasPlan: number | null
  actividades: { nombre: string }[]
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
 * histogramaEquipo/HH y cronogramaResumen — mapeo directo desde ProyectoEdt
 * (una fila por EDT, granularidad elegida para GARANTIZAR que totalHH ==
 * Σ histogramaHH[].total == Σ cronogramaResumen[].horasPlan, ya que las tres
 * cifras derivan del mismo conjunto de EDTs con fecha y del mismo horasPlan
 * — informe §4.2, causa raíz de las cifras de HH incoherentes).
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
      horasPlan: e.horasPlan,
      actividades: e.actividades.map(a => ({ nombre: a.nombre })),
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

  const totalHH = edtsConFecha.reduce((sum, e) => sum + (e.horasPlan ?? 0), 0)

  const todasFechas = edtsConFecha.flatMap(e => [e.fechaInicioPlan, e.fechaFinPlan])
  const meses = todasFechas.length > 0
    ? mesesEntre(
        new Date(Math.min(...todasFechas.map(d => d.getTime()))),
        new Date(Math.max(...todasFechas.map(d => d.getTime())))
      )
    : []

  const equipoTrabajo = edtsConFecha.map(e => {
    const mesesEdt = new Set(mesesEntre(e.fechaInicioPlan, e.fechaFinPlan))
    const valoresPorMes: number[] = meses.map(m => (mesesEdt.has(m) ? 1 : 0))
    return { etiqueta: e.nombre, valoresPorMes, total: valoresPorMes.reduce((s, v) => s + v, 0) }
  })

  const horasHombre = edtsConFecha.map(e => {
    const mesesEdt = mesesEntre(e.fechaInicioPlan, e.fechaFinPlan)
    const horas = e.horasPlan ?? 0
    const horasPorMes = mesesEdt.length > 0 ? horas / mesesEdt.length : 0
    const mesesEdtSet = new Set(mesesEdt)
    const valoresPorMes = meses.map(m => (mesesEdtSet.has(m) ? horasPorMes : 0))
    return { etiqueta: e.nombre, valoresPorMes, total: horas }
  })

  const cronogramaFilas = edtsConFecha.map(e => ({
    fase: e.faseNombre,
    edt: e.nombre,
    actividad: resumenActividades(e.actividades),
    fechaInicio: e.fechaInicioPlan.toISOString().slice(0, 10),
    fechaFin: e.fechaFinPlan.toISOString().slice(0, 10),
    horasPlan: e.horasPlan ?? 0,
  }))

  // HH por fase — misma fuente (edtsConFecha) que totalHH, para que el bloque
  // de HECHOS de Etapa 2 pueda citar horas por fase sin que la IA las invente
  // (addendum B — el docx auditado mostró una distribución de HH por fase
  // completamente distinta a la real aunque el total coincidía).
  const porFaseMap = new Map<string, number>()
  for (const e of edtsConFecha) {
    porFaseMap.set(e.faseNombre, (porFaseMap.get(e.faseNombre) ?? 0) + (e.horasPlan ?? 0))
  }
  const porFase = Array.from(porFaseMap.entries()).map(([fase, total]) => ({ fase, total }))

  return {
    data: {
      histogramas: { meses, equipoTrabajo, horasHombre, porFase },
      cronogramaResumen: { filas: cronogramaFilas },
      totalHH,
    },
    advertencias,
  }
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
