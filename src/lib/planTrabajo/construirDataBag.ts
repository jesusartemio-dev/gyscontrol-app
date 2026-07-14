import type { PlanTrabajo, Cliente, Proyecto, PlanTrabajoGeneracion, PlanTrabajoImagen } from '@prisma/client'
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
import { calcularTotalHH } from './calcularDatos'
import { IMAGEN_PLACEHOLDER, type ImagenResueltaTag } from './exportDocx'
import { captionEfectivo } from './imagenCaption'

type ProyectoConCliente = Proyecto & { cliente: Cliente | null }

/** Default configurable (addendum C.3) — se usa solo si el plan no tiene numeroConsultor propio. */
const NUMERO_CONSULTOR_DEFAULT = process.env.PLAN_TRABAJO_NUMERO_CONSULTOR_DEFAULT ?? ''

export interface ConstruirDataBagOpciones {
  plan: PlanTrabajo
  proyecto: ProyectoConCliente
  organigramaPngBase64: string
  /** Generaciones previas de este plan, más antiguas primero (histórico real de la carátula). */
  generaciones?: Pick<PlanTrabajoGeneracion, 'numeroRevision' | 'generadoEn' | 'snapshotData'>[]
  /** Fallback de ubicación cuando cliente.direccion no está cargado. */
  ubicacionDetectadaTdr?: string | null
  /** Imágenes de alcanceDetallado (Bloque 4, Tarea 4) — vacío en planes sin imágenes. */
  imagenesAlcance?: PlanTrabajoImagen[]
  /** {data,width,height} ya resueltas por imagen (ver resolverImagenesAlcance.ts) — null = imagen inaccesible → placeholder. */
  imagenesResueltas?: Map<string, ImagenResueltaTag | null>
  /** PNG ya generado (ver generarHistogramaPng.ts) — null si no hay datos suficientes (Bloque 4.2, Tarea 3). */
  histogramaEquipoPng?: ImagenResueltaTag | null
  /** PNG ya generado (ver generarHistogramaPng.ts) — null si no hay datos suficientes (Bloque 4.2, Tarea 3). */
  histogramaHHPng?: ImagenResueltaTag | null
}

/**
 * Imágenes de UN nodo — EDT, subItem O tarea (Bloque 4.2 sesión 2, Tarea 3).
 * Exactamente un nivel por imagen: si `tareaRef` está presente, filtra SOLO
 * por tareaRef (ignora subItemRef); si no, filtra por subItemRef excluyendo
 * las que sí tienen tareaRef (esas pertenecen a una tarea, no al subItem).
 */
function construirImagenesDeNodo(
  edtRef: string,
  subItemRef: string | undefined,
  tareaRef: string | undefined,
  nombreDefault: string,
  imagenesAlcance: PlanTrabajoImagen[],
  imagenesResueltas: Map<string, ImagenResueltaTag | null>
): { img: ImagenResueltaTag; caption: string }[] {
  return imagenesAlcance
    .filter(img => {
      if (img.edtRef !== edtRef) return false
      if (tareaRef) return img.tareaRef === tareaRef
      return !img.tareaRef && (img.subItemRef ?? undefined) === subItemRef
    })
    .sort((a, b) => a.orden - b.orden)
    .map(img => ({
      // NUNCA null acá — un {%img} con valor null/falsy rompe doc.renderAsync
      // (ver IMAGEN_PLACEHOLDER en exportDocx.ts). Imagen inaccesible en Drive
      // → placeholder 1x1, mismo resultado visual que antes.
      img: imagenesResueltas.get(img.id) ?? IMAGEN_PLACEHOLDER,
      // Migración suave (Bloque 4.2, Tarea 1): si el caption persistido es el
      // filename subido, se sustituye por el nombre de la actividad/EDT/tarea.
      caption: captionEfectivo(img, nombreDefault),
    }))
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

/** trim + minúsculas + sin tildes — para comparar nombres sin que mayúsculas/acentos los dupliquen (addendum C.1). */
function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/** Si el nombre viene todo en mayúsculas (o sin ninguna minúscula), lo convierte a Title Case (addendum C — typo de origen no se corrige, solo se normaliza el render). */
function toTitleCase(nombre: string): string {
  if (!/[a-záéíóúñ]/.test(nombre)) {
    return nombre
      .toLowerCase()
      .split(/\s+/)
      .map(palabra => (palabra ? palabra[0].toUpperCase() + palabra.slice(1) : palabra))
      .join(' ')
  }
  return nombre
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

interface Firmante {
  nombre: string
  siglas: string
}

/**
 * Firmantes únicos para la leyenda de la carátula, deduplicados por nombre
 * normalizado (trim + minúsculas + sin tildes) — antes "JESUS MAMANI" y
 * "Jesus Mamani" salían como dos firmantes distintos (addendum C.1).
 * Se queda con la PRIMERA forma vista, renderizada en Title Case si venía
 * toda en mayúsculas (addendum C.4 — no corrige typos de origen, solo el render).
 */
function construirFirmantes(revisiones: FilaRevision[]): Firmante[] {
  const porClaveNormalizada = new Map<string, string>()
  for (const r of revisiones) {
    for (const nombreCrudo of [r.des, r.ver, r.apr, r.aut]) {
      if (!nombreCrudo || !nombreCrudo.trim()) continue
      const clave = normalizarNombre(nombreCrudo)
      if (!porClaveNormalizada.has(clave)) {
        porClaveNormalizada.set(clave, toTitleCase(nombreCrudo.trim()))
      }
    }
  }
  const crudos: Firmante[] = Array.from(porClaveNormalizada.values()).map(nombre => ({
    nombre,
    siglas: calcularSiglasBase(nombre),
  }))
  return deduplicarSiglas(crudos)
}

/** Sigla del firmante deduplicado que corresponde a un nombre crudo (comparación normalizada). */
function siglaDeNombre(nombreCrudo: string, firmantes: Firmante[]): string {
  if (!nombreCrudo || !nombreCrudo.trim()) return ''
  const clave = normalizarNombre(nombreCrudo)
  const encontrado = firmantes.find(f => normalizarNombre(f.nombre) === clave)
  return encontrado?.siglas ?? calcularSiglasBase(nombreCrudo)
}

/**
 * Las columnas Des./Ver./Apr./Aut. de la tabla de revisiones de la carátula
 * muestran SIGLAS (formato Nexa), no nombres completos — los nombres completos
 * van solo en la leyenda de firmantes (addendum C.2). Aut. sin dato → "-",
 * nunca vacía (addendum C.4).
 */
function revisionesConSiglas(revisiones: FilaRevision[], firmantes: Firmante[]): FilaRevision[] {
  return revisiones.map(r => ({
    ...r,
    des: siglaDeNombre(r.des, firmantes) || '-',
    ver: siglaDeNombre(r.ver, firmantes) || '-',
    apr: siglaDeNombre(r.apr, firmantes) || '-',
    aut: siglaDeNombre(r.aut, firmantes) || '-',
  }))
}

export function construirDataBag({
  plan,
  proyecto,
  organigramaPngBase64,
  generaciones = [],
  ubicacionDetectadaTdr = null,
  imagenesAlcance = [],
  imagenesResueltas = new Map(),
  histogramaEquipoPng = null,
  histogramaHHPng = null,
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
  const revisionesParaTemplate = revisionesConSiglas(revisiones, firmantes)

  const personalMapeado = deduplicarSiglas(
    personal.map(p => ({ nombre: p.nombre, siglas: p.siglas, empresa: p.empresa ?? '', cargo: p.cargo }))
  )

  const ubicacionProyecto = proyecto.cliente?.direccion?.trim() || ubicacionDetectadaTdr?.trim() || ''

  const totalHH = calcularTotalHH(histogramas)

  return {
    // ─── Cabecera y carátula (BD, sin IA) ───
    ordenCompra: proyecto.ordenCompraCliente ?? '',
    ordenCompraCliente: proyecto.ordenCompraCliente ?? '', // alias retrocompatible
    clienteNombre: proyecto.cliente?.nombre ?? '',
    nombreProyecto: proyecto.nombre,
    proyectoNombre: proyecto.nombre, // alias retrocompatible
    codigoDocumento,
    numeroConsultor: plan.numeroConsultor ?? NUMERO_CONSULTOR_DEFAULT,
    revision: plan.numeroRevision ?? 'A',
    numeroRevision: plan.numeroRevision ?? 'A', // alias retrocompatible
    tipoEmision: plan.tipoEmision ?? '',
    fechaEmision: fmtDate(plan.fechaEmision ?? new Date()),
    etapa: proyecto.estado ?? '',

    // {#revisiones}: Des./Ver./Apr./Aut. en siglas (formato Nexa) — nombres completos van en {firmantes}
    revisiones: revisionesParaTemplate,
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

    // ─── Alcance detallado — formato v3 con loop anidado {#subItems}/{#imagenes} ───
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
          // personalRequerido/imagenes solo existen en EDTs 'detallado' (Bloque 4, Tarea 1/4)
          personalRequerido: n.personalRequerido ?? [],
          // Plantilla v5: {#tienePersonalRequerido} envuelve el párrafo + el loop
          // {#personalRequerido} — sin el flag, docxtemplater no renderiza el bloque
          // condicional cuando personalRequerido está vacío.
          tienePersonalRequerido: (n.personalRequerido ?? []).length > 0,
          imagenes: n.edtRefId ? construirImagenesDeNodo(n.edtRefId, undefined, undefined, n.edtNombre, imagenesAlcance, imagenesResueltas) : [],
          // Mismos nombres que el builder/validador/editor (numeracion/actividadNombre/
          // descripcion) — NUNCA renombrar acá. La plantilla .docx ya usa estos nombres
          // dentro de {#subItems}; renombrarlos hacía que docxtemplater, al no encontrar
          // el tag en el subItem, resolviera contra el scope del EDT padre (numeracion/
          // descripcion clonados, actividadNombre vacío) — causa raíz del bug auditado.
          subItems: (n.subItems ?? []).map(s => ({
            numeracion: s.numeracion,
            actividadNombre: s.actividadNombre,
            descripcion: s.descripcion,
            // Viñetas de tareas por subItem (plantilla v4, {#tareas}{texto}{/tareas},
            // Bloque 4.2, Tarea 4) — texto redactado por IA, fallback = nombre de la
            // tarea (ver textoFallbackTarea en generarAlcanceDetallado.ts). Las fotos
            // se intercalan tras cada viñeta (plantilla v6, {#tareas}{#imagenes},
            // Bloque 4.2 sesión 2, Tarea 3) — caption default = nombre corto de la
            // tarea del cronograma, nunca la viñeta redactada completa.
            tareas: (s.tareas ?? []).map(t => ({
              texto: t.texto || t.nombre,
              imagenes: n.edtRefId && t.tareaRefId
                ? construirImagenesDeNodo(n.edtRefId, undefined, t.tareaRefId, t.nombre, imagenesAlcance, imagenesResueltas)
                : [],
            })),
            imagenes: n.edtRefId && s.actividadRefId
              ? construirImagenesDeNodo(n.edtRefId, s.actividadRefId, undefined, s.actividadNombre, imagenesAlcance, imagenesResueltas)
              : [],
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
        tienePersonalRequerido: false,
        imagenes: [],
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
    // NUNCA '' acá — un {%organigramaPng} con valor falsy rompe doc.renderAsync
    // (ver IMAGEN_PLACEHOLDER en exportDocx.ts, mismo motivo que en imagenes).
    organigramaPng: organigramaPngBase64 || IMAGEN_PLACEHOLDER,

    // ─── Gráficos de histograma (plantilla v4, sección 13) ───
    // PNG ya generado por generarHistogramaPng.ts (Bloque 4.2, Tarea 3), pasado
    // por el caller (exportar-docx/route.ts) — construirDataBag se mantiene puro/
    // síncrono, igual que con organigramaPngBase64/imagenesResueltas. El flag en
    // false (sin datos suficientes) hace que docxtemplater NUNCA renderice el
    // bloque {#tieneHistogramaXPng}; el placeholder es solo defensivo.
    tieneHistogramaEquipoPng: histogramaEquipoPng !== null,
    histogramaEquipoPng: histogramaEquipoPng ?? IMAGEN_PLACEHOLDER,
    tieneHistogramaHHPng: histogramaHHPng !== null,
    histogramaHHPng: histogramaHHPng ?? IMAGEN_PLACEHOLDER,
  }
}
