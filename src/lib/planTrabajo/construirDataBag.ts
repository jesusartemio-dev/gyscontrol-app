import type { PlanTrabajo, Cliente, Proyecto, PlanTrabajoGeneracion } from '@prisma/client'
import type {
  PlanAlcanceDetalladoEdt,
  PlanAlcanceItem,
  PlanEPP,
  PlanHerramientasYEquipos,
  PlanRestriccion,
  PlanPersonal,
  PlanRaci,
  PlanHistogramas,
  PlanCronograma,
  PlanReferencia,
} from '@/types/planTrabajo'
import { deduplicarSiglas, calcularSiglasBase } from './siglas'
import { getSnapshotPlan } from './snapshotHelpers'
import { REFERENCIAS_BASE } from './referenciasBase'

type ProyectoConCliente = Proyecto & { cliente: Cliente | null }

export interface ConstruirDataBagOpciones {
  plan: PlanTrabajo
  proyecto: ProyectoConCliente
  organigramaPngBase64: string
  /** Generaciones previas de este plan, más antiguas primero (histórico real de la carátula). */
  generaciones?: Pick<PlanTrabajoGeneracion, 'numeroRevision' | 'generadoEn' | 'snapshotData'>[]
  /** Fallback de ubicación cuando cliente.direccion no está cargado. */
  ubicacionDetectadaTdr?: string | null
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  return date.toISOString().slice(0, 10)
}

/** codigoDocumento.replace(/^PN-/, prefijo) — o prefija el código completo si no empieza con PN-. */
function derivarCodigo(codigoDocumento: string, prefijo: 'OR-' | 'CR-'): string {
  if (!codigoDocumento) return ''
  return codigoDocumento.startsWith('PN-')
    ? codigoDocumento.replace(/^PN-/, prefijo)
    : `${prefijo}${codigoDocumento}`
}

function construirDetalleMeses(meses: string[], valoresPorMes: number[]): string {
  return meses.map((mes, i) => `${mes}: ${valoresPorMes[i] ?? 0}`).join(' · ')
}

interface FilaRevision {
  rev: string
  te: string
  descripcion: string
  des: string
  ver: string
  apr: string
  aut: string
  fecha: string
}

function filaRevisionDesdePlan(plan: PlanTrabajo, descripcion: string): FilaRevision {
  return {
    rev: plan.numeroRevision ?? 'A',
    te: plan.tipoEmision ?? '',
    descripcion,
    des: plan.preparadoPor ?? '',
    ver: plan.revisadoPor ?? '',
    apr: plan.aprobadoPor ?? '',
    aut: '',
    fecha: fmtDate(plan.fechaEmision ?? new Date()),
  }
}

/**
 * Histórico real de revisiones a partir de PlanTrabajoGeneracion (informe §4.5).
 * Si la revisión actual del plan todavía no tiene una generación registrada
 * (primer export, o cambios tras la última generación), se agrega como fila final.
 */
function construirRevisiones(
  plan: PlanTrabajo,
  generaciones: Pick<PlanTrabajoGeneracion, 'numeroRevision' | 'generadoEn' | 'snapshotData'>[]
): FilaRevision[] {
  const historicas = generaciones
    .slice()
    .sort((a, b) => a.generadoEn.getTime() - b.generadoEn.getTime())
    .map((gen, i) => {
      const snapshotPlan = getSnapshotPlan(gen.snapshotData)
      const base = snapshotPlan ?? plan
      const descripcion = i === 0 ? 'Emisión inicial' : 'Actualización de revisión'
      return filaRevisionDesdePlan({ ...base, numeroRevision: gen.numeroRevision }, descripcion)
    })

  const ultimaRevisionRegistrada = historicas[historicas.length - 1]?.rev
  const faltaRevisionActual = ultimaRevisionRegistrada !== (plan.numeroRevision ?? 'A')

  if (historicas.length === 0 || faltaRevisionActual) {
    historicas.push(filaRevisionDesdePlan(plan, historicas.length === 0 ? 'Emisión inicial' : 'Actualización de revisión'))
  }

  return historicas
}

function construirFirmantes(revisiones: FilaRevision[]): { siglas: string; nombre: string }[] {
  const nombres = new Set<string>()
  for (const r of revisiones) {
    for (const nombre of [r.des, r.ver, r.apr, r.aut]) {
      if (nombre && nombre.trim()) nombres.add(nombre.trim())
    }
  }
  return Array.from(nombres).map(nombre => ({ nombre, siglas: calcularSiglasBase(nombre) }))
}

export function construirDataBag({
  plan,
  proyecto,
  organigramaPngBase64,
  generaciones = [],
  ubicacionDetectadaTdr = null,
}: ConstruirDataBagOpciones): Record<string, unknown> {
  const personal = (plan.personalAsignado as PlanPersonal[] | null) ?? []
  const raci = (plan.matrizRaci as PlanRaci | null) ?? { filas: [] }
  const epp = (plan.eppRequeridos as PlanEPP | null) ?? { basico: [], bioseguridad: [], riesgoEspecifico: [] }
  const herramientas = (plan.herramientasYEquipos as PlanHerramientasYEquipos | null) ?? { equipos: [], herramientas: [], materiales: [] }
  const restricciones = (plan.restricciones as PlanRestriccion[] | null) ?? []
  const alcanceDetallado = (plan.alcanceDetallado as Array<PlanAlcanceDetalladoEdt | PlanAlcanceItem> | null) ?? []
  const histogramas = (plan.histogramas as PlanHistogramas | null) ?? { meses: [], equipoTrabajo: [], horasHombre: [] }
  const cronograma = (plan.cronogramaResumen as PlanCronograma | null) ?? { filas: [] }
  const referencias = (plan.referencias as PlanReferencia[] | null) ?? []

  const codigoDocumento = plan.codigoDocumento ?? ''
  const revisiones = construirRevisiones(plan, generaciones)
  const firmantes = construirFirmantes(revisiones)

  const personalMapeado = deduplicarSiglas(
    personal.map(p => ({ nombre: p.nombre, siglas: p.siglas, empresa: p.empresa ?? '', cargo: p.cargo }))
  )

  const ubicacionProyecto = proyecto.cliente?.direccion?.trim() || ubicacionDetectadaTdr?.trim() || ''

  const totalHH = histogramas.horasHombre.reduce((sum, f) => sum + (f.total || 0), 0)

  return {
    // ─── Cabecera y carátula (BD, sin IA) ───
    ordenCompra: proyecto.ordenCompraCliente ?? '',
    ordenCompraCliente: proyecto.ordenCompraCliente ?? '', // alias retrocompatible
    clienteNombre: proyecto.cliente?.nombre ?? '',
    nombreProyecto: proyecto.nombre,
    proyectoNombre: proyecto.nombre, // alias retrocompatible
    codigoDocumento,
    numeroConsultor: plan.numeroConsultor ?? '',
    revision: plan.numeroRevision ?? 'A',
    numeroRevision: plan.numeroRevision ?? 'A', // alias retrocompatible
    tipoEmision: plan.tipoEmision ?? '',
    fechaEmision: fmtDate(plan.fechaEmision ?? new Date()),
    etapa: proyecto.estado ?? '',

    revisiones,
    firmantes,

    // Firmantes individuales (retrocompat con la cabecera actual)
    preparadoPor: plan.preparadoPor ?? '',
    preparadoCargo: plan.preparadoCargo ?? '',
    revisadoPor: plan.revisadoPor ?? '',
    revisadoCargo: plan.revisadoCargo ?? '',
    aprobadoPor: plan.aprobadoPor ?? '',
    aprobadoCargo: plan.aprobadoCargo ?? '',

    // ─── Códigos derivados por regla (sin IA) ───
    codigoOR: derivarCodigo(codigoDocumento, 'OR-'),
    codigoCR: derivarCodigo(codigoDocumento, 'CR-'),

    // ─── Secciones IA (redacción sobre datos reales) ───
    objetivo: plan.objetivo ?? '',
    alcanceGeneral: plan.alcanceGeneral ?? '',
    tieneUbicacion: Boolean(ubicacionProyecto),
    ubicacionProyecto,

    // ─── Referencias: normativa base (código, siempre) + BD/IA — dedup por código ───
    referencias: (() => {
      const combinadas = [...REFERENCIAS_BASE, ...referencias]
      const vistos = new Set<string>()
      return combinadas
        .filter(r => {
          const clave = (r.codigoDocumento ?? r.titulo).trim().toLowerCase()
          if (vistos.has(clave)) return false
          vistos.add(clave)
          return true
        })
        .map(r => ({
          codigo: r.codigoDocumento ?? '',
          descripcion: r.titulo,
          origen: r.origen, // alias retrocompatible
        }))
    })(),

    // Definiciones específicas por proyecto — NO ENCONTRADO en el modelo de datos
    // (no hay campo que las respalde hoy); se envía vacío en vez de inventarlas.
    definicionesEspecificas: [],

    // ─── Personal (BD/IA, siglas deduplicadas server-side) ───
    personalAsignado: personalMapeado,

    // ─── RACI (BD/IA — texto precompuesto porque Docxtemplater no soporta columnas dinámicas) ───
    matrizRaci: raci.filas.map(fila => ({
      edtNombre: fila.edt,
      edt: fila.edt, // alias retrocompatible
      rolesTexto: fila.asignaciones.map(a => `${a.siglas}: ${a.rol}`).join(' · '),
    })),

    // ─── EPP ───
    eppBasico: epp.basico.map(e => ({ nombre: e.nombre, norma: e.norma ?? '', observaciones: e.observaciones ?? '' })),
    eppBioseguridad: epp.bioseguridad.map(e => ({ nombre: e.nombre, norma: e.norma ?? '', observaciones: e.observaciones ?? '' })),
    eppRiesgoEspecifico: epp.riesgoEspecifico.map(e => ({ nombre: e.nombre, norma: e.norma ?? '', observaciones: e.observaciones ?? '' })),
    hayEppBioseguridad: epp.bioseguridad.length > 0,

    // ─── Herramientas y Equipos ───
    equipos: herramientas.equipos.map(h => ({ nombre: h.nombre, cantidad: h.cantidad ?? '', unidad: h.unidad ?? '', observaciones: h.observaciones ?? '' })),
    herramientas: herramientas.herramientas.map(h => ({ nombre: h.nombre, cantidad: h.cantidad ?? '', unidad: h.unidad ?? '', observaciones: h.observaciones ?? '' })),
    materiales: herramientas.materiales.map(h => ({ nombre: h.nombre, cantidad: h.cantidad ?? '', unidad: h.unidad ?? '', observaciones: h.observaciones ?? '' })),

    // ─── Restricciones ───
    restricciones: restricciones.map(r => ({ texto: r.texto, categoria: r.categoria ?? '' })),

    // ─── Alcance detallado — formato v3 con loop anidado {#subItems} ───
    // Compatible con formato legacy (PlanAlcanceItem) y nuevo (PlanAlcanceDetalladoEdt)
    alcanceDetallado: alcanceDetallado.map(a => {
      if ('edtNombre' in a && a.edtNombre) {
        const n = a as PlanAlcanceDetalladoEdt
        return {
          numeracion: n.numeracion,
          numero: n.numeracion, // alias retrocompatible
          edtNombre: n.edtNombre,
          nombre: `${n.numeracion}. ${n.edtNombre}`, // alias retrocompatible
          faseNombre: n.faseNombre ?? '',
          fase: n.faseNombre ?? '', // alias retrocompatible
          codigo: n.edtCodigo ?? '',
          descripcion: n.descripcion,
          ubicacion: n.ubicacion ?? '',
          personalRequerido: [], // NO ENCONTRADO — sin mapeo por EDT en el modelo actual
          subItems: (n.subItems ?? []).map(s => ({
            subnumero: s.numeracion,
            subnombre: s.actividadNombre,
            subdescripcion: s.descripcion,
          })),
        }
      }
      const l = a as PlanAlcanceItem
      return {
        numeracion: l.numero ?? '',
        numero: l.numero ?? '',
        edtNombre: l.nombre ?? '',
        nombre: l.nombre ?? '',
        faseNombre: '',
        fase: '',
        codigo: '',
        descripcion: l.descripcion ?? '',
        ubicacion: l.ubicacion ?? '',
        personalRequerido: [],
        subItems: [],
      }
    }),
    alcanceDetalladoFormateado: alcanceDetallado.map(a => {
      if ('edtNombre' in a && a.edtNombre) {
        const n = a as PlanAlcanceDetalladoEdt
        const fase = n.faseNombre || n.faseAbreviatura || ''
        const titulo = `${n.numeracion}.  ${fase ? `${fase.toUpperCase()} — ` : ''}${n.edtNombre}${n.ubicacion ? `  |  ${n.ubicacion}` : ''}`
        const subs = (n.subItems ?? []).map(s =>
          `      ${s.numeracion}  ${s.actividadNombre}\n      ${s.descripcion}`
        ).join('\n\n')
        return [titulo, n.descripcion, subs].filter(Boolean).join('\n')
      }
      const l = a as PlanAlcanceItem
      return [l.nombre, l.descripcion].filter(Boolean).join('\n')
    }).join('\n\n'),

    // ─── Histogramas (con desglose mensual — informe §4.6) ───
    histogramaEquipo: histogramas.equipoTrabajo.map(f => ({
      etiqueta: f.etiqueta,
      detalleMeses: construirDetalleMeses(histogramas.meses, f.valoresPorMes),
      total: f.total,
    })),
    histogramaHH: histogramas.horasHombre.map(f => ({
      etiqueta: f.etiqueta,
      detalleMeses: construirDetalleMeses(histogramas.meses, f.valoresPorMes),
      total: f.total,
    })),
    totalHH,

    // ─── Cronograma ───
    cronogramaResumen: cronograma.filas.map(f => ({
      fase: f.fase,
      edt: f.edt,
      actividad: f.actividad ?? '',
      fechaInicio: f.fechaInicio,
      fechaFin: f.fechaFin,
      horasPlan: f.horasPlan,
    })),

    // ─── Toggles de inclusión (informe §4.5 — antes desconectados del export) ───
    incluirMatriz: plan.incluirMatriz !== false,
    incluirCronograma: plan.incluirCronograma !== false,
    incluirHistogramas: plan.incluirHistogramas !== false,
    incluirTDR: plan.incluirTDR !== false,

    // ─── Imagen del organigrama ───
    organigramaPng: organigramaPngBase64,
  }
}
