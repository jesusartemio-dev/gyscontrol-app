import type {
  ActividadPropuesta,
  CatalogoServicioParaWizard,
  ConfiguracionWizardPaso1,
  ResultadoActividadesDeterministas,
  TareaPropuesta,
} from '@/types/cronogramaIA'
import {
  evaluarSubalcanceCMM,
  aplicarSubalcanceCMM,
  type SubalcanceCMM,
  evaluarSubalcanceDisciplinas,
  aplicarSubalcanceDisciplina,
  type SubalcanceDisciplina,
  evaluarSubalcanceProtocolosIng,
  aplicarSubalcanceProtocolosIng,
  type SubalcanceProtocolosIng,
} from './derivarEdtsSoporte'
import { aplicarPrefijoDeActividad } from './aliasActividad'

/**
 * EDTs cuya agrupación en Actividades depende de IA (zonas de CON, familias
 * de PRO, controladores PLC detectados, estaciones HMI/SCADA detectadas) —
 * nunca pasan por este motor determinista. Ver Bloque D.
 */
export const EDTS_AGRUPACION_IA = ['CON', 'PRO', 'PLC', 'HMI'] as const

/**
 * De los 4 EDTs de EDTS_AGRUPACION_IA, CON y PRO pasan por el flujo de
 * esquemas en 2 etapas (Etapa A: 2-3 esquemas alternativos de nombres,
 * sin ids; Etapa B: el usuario elige/edita uno y recién ahí se asignan
 * tareas) — tienen ambigüedad real de "cómo agrupar" (zonas/familias).
 * PLC/HMI siguen el flujo de un solo paso: no hay varias formas válidas de
 * agrupar (una Actividad por controlador/estación real), así que la IA
 * decide nombres y asignación en la misma llamada, como siempre.
 */
export const EDTS_ESQUEMA_DOS_ETAPAS = ['CON', 'PRO'] as const
export const EDTS_AGRUPACION_UN_PASO = ['PLC', 'HMI'] as const

/**
 * EDTs seleccionados que requieren IA (EDTS_AGRUPACION_IA) y todavía no
 * tienen ninguna Actividad propuesta para ellos — usado tanto al crear un
 * borrador nuevo (actividadesExistentes=[], todos pendientes) como al
 * restaurar uno existente (actividadesExistentes=propuestaActividades ya
 * guardada, para no marcar como "pendiente" un EDT que ya se resolvió).
 */
export function calcularEdtsPendientesIA<T extends { id: string; nombre: string }>(
  edtsSeleccionados: T[],
  actividadesExistentes: Pick<ActividadPropuesta, 'edtNombre'>[]
): T[] {
  const edtsConPropuesta = new Set(actividadesExistentes.map(a => a.edtNombre))
  return edtsSeleccionados.filter(
    e => (EDTS_AGRUPACION_IA as readonly string[]).includes(e.nombre) && !edtsConPropuesta.has(e.nombre)
  )
}

export function calcularHorasEstimadas(
  horaBase: number | null,
  horaRepetido: number | null,
  cantidad: number,
  nivelDificultad: number
): number {
  const base = horaBase ?? 0
  const repetido = horaRepetido ?? 0
  return (base + Math.max(0, cantidad - 1) * repetido) * nivelDificultad
}

export type ConfiguracionCantidadDeterminista = Pick<ConfiguracionWizardPaso1, 'nPets' | 'tableros' | 'plcs' | 'hmiCantidad'>

const REGLAS_CANTIDAD_DETERMINISTA: { patron: RegExp; resolver: (config: ConfiguracionCantidadDeterminista) => number }[] = [
  { patron: /pets?/i, resolver: c => c.nPets },
  { patron: /tablero/i, resolver: c => c.tableros.length },
  { patron: /plc/i, resolver: c => c.plcs.length },
  { patron: /hmi|pantalla/i, resolver: c => c.hmiCantidad },
]

/**
 * Resuelve `cantidad` sin IA cuando `notaCantidad` (parseado de la
 * descripción del catálogo por `parsearNotaCantidad`, ej. "Cantidad = N° de
 * PETS") apunta a un campo que el propio Paso 1 ya captura con certeza —
 * 100% confiable, sin alucinación posible, así que se prueba SIEMPRE antes
 * de intentar cualquier sugerencia por IA. Devuelve null si `notaCantidad`
 * no matchea ningún campo conocido (el caller debe caer a la sugerencia por
 * IA, o al default del catálogo) o si el valor resuelto sería <=0 (cantidad
 * 0 es un caso de exclusión de alcance, no de "cantidad determinística").
 */
export function resolverCantidadDeterminista(
  notaCantidad: string | null,
  config: ConfiguracionCantidadDeterminista
): number | null {
  if (!notaCantidad) return null
  const regla = REGLAS_CANTIDAD_DETERMINISTA.find(r => r.patron.test(notaCantidad))
  if (!regla) return null
  const valor = regla.resolver(config)
  return valor > 0 ? valor : null
}

/** Único punto de decisión sobre si un servicio aplica al proyecto según su filtroAlcance. */
export function evaluarAlcance(
  filtroAlcance: CatalogoServicioParaWizard['filtroAlcance'],
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'>
): { incluida: boolean; motivoExclusion?: string } {
  if (filtroAlcance === 'brownfield') {
    return config.brownfield
      ? { incluida: true }
      : { incluida: false, motivoExclusion: 'Solo aplica en proyectos brownfield (instalaciones existentes)' }
  }
  if (filtroAlcance === 'detalle') {
    return config.ingenieriaDetalle
      ? { incluida: true }
      : { incluida: false, motivoExclusion: 'Solo aplica en contratos con ingeniería de detalle' }
  }
  return { incluida: true }
}

export function construirTareaPropuesta(
  servicio: CatalogoServicioParaWizard,
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'> & ConfiguracionCantidadDeterminista
): TareaPropuesta {
  const cantidadDeterminista = resolverCantidadDeterminista(servicio.notaCantidad, config)
  const cantidad = cantidadDeterminista ?? servicio.cantidad ?? 1
  const nivelDificultad = servicio.nivelDificultad ?? 1
  const { incluida, motivoExclusion } = evaluarAlcance(servicio.filtroAlcance, config)
  return {
    catalogoServicioId: servicio.id,
    nombre: servicio.nombre,
    cantidad,
    nivelDificultad,
    horaBase: servicio.horaBase ?? 0,
    horaRepetido: servicio.horaRepetido ?? 0,
    horasEstimadas: calcularHorasEstimadas(servicio.horaBase, servicio.horaRepetido, cantidad, nivelDificultad),
    incluida,
    motivoExclusion,
    orden: servicio.orden ?? Number.MAX_SAFE_INTEGER,
    unidadNombre: servicio.unidadNombre,
    cantidadSugeridaPorIA: cantidadDeterminista !== null,
    notaCantidad: servicio.notaCantidad,
  }
}

/** Orden real del catálogo (nunca el orden de llegada de la respuesta de la IA ni del fetch). */
export function ordenarPorCatalogo<T extends { orden: number }>(tareas: T[]): T[] {
  return [...tareas].sort((a, b) => a.orden - b.orden)
}

/** true si la actividad debe crearse (tiene al menos 1 tarea incluida tras el filtro de alcance) — también usado por el wizard para decidir qué actividades filtrar antes de "Aplicar al Cronograma". */
export function tieneAlMenosUnaTareaIncluida(tareas: TareaPropuesta[]): boolean {
  return tareas.some(t => t.incluida)
}

/**
 * `reglasPorTag` es un mapa opcional tag-crudo -> transformación de sub-alcance
 * (ver derivarEdtsSoporte.ts) aplicada a las tareas de ese bucket antes de
 * decidir si la Actividad se crea. Un bucket CON regla queda siempre visible
 * — aunque termine con 0 tareas incluidas, el usuario debe poder confirmar o
 * revertir esa exclusión, no que la Actividad desaparezca sin explicación.
 * Un bucket SIN regla mantiene el comportamiento de siempre: se omite si
 * ninguna de sus tareas quedó incluida.
 */
function agruparPorTag(
  servicios: CatalogoServicioParaWizard[],
  edtNombre: string,
  tagLabels: Record<string, string>,
  config: ConfiguracionWizardPaso1,
  reglasPorTag?: Record<string, (tareas: TareaPropuesta[]) => TareaPropuesta[]>
): ActividadPropuesta[] {
  const buckets = new Map<string, TareaPropuesta[]>()

  for (const servicio of servicios) {
    const tagReconocido = servicio.actividadTag.find(t => t in tagLabels)
    const claveBucket = tagReconocido ?? 'Otros'
    const tarea = construirTareaPropuesta(servicio, config)
    if (!buckets.has(claveBucket)) buckets.set(claveBucket, [])
    buckets.get(claveBucket)!.push(tarea)
  }

  const actividades: ActividadPropuesta[] = []
  for (const [claveBucket, tareasCrudas] of buckets) {
    const regla = reglasPorTag?.[claveBucket]
    const tareas = regla ? regla(tareasCrudas) : tareasCrudas
    if (!regla && !tieneAlMenosUnaTareaIncluida(tareas)) continue
    const actividadNombre = claveBucket === 'Otros' ? 'Otros' : tagLabels[claveBucket]
    actividades.push({ edtNombre, actividadNombre, tareas, origen: 'determinista' })
  }
  return actividades
}

function generarGES(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  return agruparPorTag(servicios, 'GES', { Inicio: 'Inicio', Documentos: 'Documentos de Gestión', Seguimiento: 'Control y Seguimiento' }, config)
}

function generarING(
  servicios: CatalogoServicioParaWizard[],
  config: ConfiguracionWizardPaso1,
  subalcanceDisciplina: SubalcanceDisciplina,
  subalcanceProtocolos: SubalcanceProtocolosIng
): ActividadPropuesta[] {
  return agruparPorTag(
    servicios,
    'ING',
    {
      Generales: 'Generales',
      Electrico: 'Disciplina Eléctrica',
      Instrumentacion: 'Disciplina Instrumentación',
      Control: 'Disciplina Control',
      Protocolos: 'Protocolos',
      Envios: 'Envíos',
    },
    config,
    {
      Control: tareas => aplicarSubalcanceDisciplina('ING', 'Control', tareas, subalcanceDisciplina),
      Instrumentacion: tareas => aplicarSubalcanceDisciplina('ING', 'Instrumentacion', tareas, subalcanceDisciplina),
      Protocolos: tareas => aplicarSubalcanceProtocolosIng(tareas, subalcanceProtocolos),
    }
  )
}

function generarCIE(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  return agruparPorTag(servicios, 'CIE', { Tecnico: 'Cierre Técnico', Gestion: 'Cierre de Gestión' }, config)
}

function generarSEG(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  const tareas = servicios.map(s => construirTareaPropuesta(s, config))
  if (!tieneAlMenosUnaTareaIncluida(tareas)) return []
  return [{ edtNombre: 'SEG', actividadNombre: 'Documentos de Seguridad', tareas, origen: 'determinista' }]
}

function generarCMM(
  servicios: CatalogoServicioParaWizard[],
  config: ConfiguracionWizardPaso1,
  subalcance: SubalcanceCMM
): ActividadPropuesta[] {
  const tareas = aplicarSubalcanceCMM(
    servicios.map(s => construirTareaPropuesta(s, config)),
    subalcance
  )
  if (!tieneAlMenosUnaTareaIncluida(tareas)) return []
  return [{ edtNombre: 'CMM', actividadNombre: 'Comisionamiento', tareas, origen: 'determinista' }]
}

/** "TCO-XXX-001" -> "Tablero TCO-XXX-001"; no duplica el prefijo si el usuario ya lo escribió. */
function formatearNombreTablero(nombre: string): string {
  return /^tablero\b/i.test(nombre.trim()) ? nombre.trim() : `Tablero ${nombre.trim()}`
}

/** PLA (tag Tablero, replicado por tablero) + resto por disciplina (mismo esquema que ING). */
function generarPLA(
  servicios: CatalogoServicioParaWizard[],
  config: ConfiguracionWizardPaso1,
  advertencias: string[],
  subalcanceDisciplina: SubalcanceDisciplina
): ActividadPropuesta[] {
  const TAG_LABELS_RESTO: Record<string, string> = {
    Electrico: 'Disciplina Eléctrica',
    Instrumentacion: 'Disciplina Instrumentación',
    Control: 'Disciplina Control',
    Envios: 'Envíos',
  }

  const tablero = servicios.filter(s => s.actividadTag.includes('Tablero'))
  const resto = servicios.filter(s => !s.actividadTag.includes('Tablero'))

  const nombresTablero = config.tableros.map(t => t.nombre).filter(Boolean)
  if (tablero.length > 0 && nombresTablero.length === 0) {
    advertencias.push('PLA: no se generaron Actividades de tablero porque el proyecto no tiene tableros en el Paso 1 — las tareas [Tablero] quedaron fuera; las de disciplina sí se generaron. Si el proyecto fabrica un tablero, agrégalo en el Paso 1.')
  }
  const actividadesTablero: ActividadPropuesta[] = []
  for (const nombreTablero of nombresTablero) {
    const tareas = tablero.map(s => construirTareaPropuesta(s, config))
    if (tieneAlMenosUnaTareaIncluida(tareas)) {
      actividadesTablero.push({ edtNombre: 'PLA', actividadNombre: formatearNombreTablero(nombreTablero), tareas, origen: 'determinista' })
    }
  }

  const actividades: ActividadPropuesta[] = [...aplicarPrefijoDeActividad(actividadesTablero)]

  actividades.push(
    ...agruparPorTag(resto, 'PLA', TAG_LABELS_RESTO, config, {
      Control: tareas => aplicarSubalcanceDisciplina('PLA', 'Control', tareas, subalcanceDisciplina),
      Instrumentacion: tareas => aplicarSubalcanceDisciplina('PLA', 'Instrumentacion', tareas, subalcanceDisciplina),
    })
  )
  return actividades
}

/** Una Actividad por instancia (nombre dado por el usuario), con el catálogo completo replicado en cada una. */
function generarPorInstancia(
  servicios: CatalogoServicioParaWizard[],
  edtNombre: string,
  nombresInstancia: string[],
  config: ConfiguracionWizardPaso1
): ActividadPropuesta[] {
  const actividades: ActividadPropuesta[] = []
  for (const nombreInstancia of nombresInstancia) {
    const tareas = servicios.map(s => construirTareaPropuesta(s, config))
    if (tieneAlMenosUnaTareaIncluida(tareas)) {
      actividades.push({ edtNombre, actividadNombre: nombreInstancia, tareas, origen: 'determinista' })
    }
  }
  return aplicarPrefijoDeActividad(actividades)
}

function generarTAB(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1, advertencias: string[]): ActividadPropuesta[] {
  const nombres = config.tableros.map(t => t.nombre).filter(Boolean)
  if (servicios.length > 0 && nombres.length === 0) {
    advertencias.push('TAB: no se generaron Actividades porque el proyecto no tiene tableros en el Paso 1 — sus tareas quedaron fuera. Si el proyecto fabrica un tablero, agrégalo en el Paso 1.')
  }
  return generarPorInstancia(servicios, 'TAB', nombres.map(formatearNombreTablero), config)
}

/** Fallback genérico — EDTs sin regla propia (ej. CAD) o no contemplados: una única Actividad con todo el catálogo del EDT. */
function generarDefault(
  servicios: CatalogoServicioParaWizard[],
  edtNombre: string,
  edtDescripcion: string | null,
  config: ConfiguracionWizardPaso1
): ActividadPropuesta[] {
  const tareas = servicios.map(s => construirTareaPropuesta(s, config))
  if (!tieneAlMenosUnaTareaIncluida(tareas)) return []
  return [{ edtNombre, actividadNombre: edtDescripcion || edtNombre, tareas, origen: 'determinista' }]
}

export interface EdtParaGenerar {
  nombre: string
  descripcion: string | null
  servicios: CatalogoServicioParaWizard[]
}

/**
 * Genera el árbol de Actividades para todos los EDTs deterministas (todo
 * salvo CON/PRO, que requieren IA — ver Bloque D). Cero IA, 100% reglas.
 */
/**
 * `textoTdr` es señal DÉBIL adicional para los triggers textuales de
 * sub-alcance (neumática/proceso/control/instrumentos/protocolos) — el TDR
 * original del cliente puede mencionar trabajo que se redujo en la
 * negociación comercial, así que solo afecta esta preselección (siempre
 * editable después), nunca qué EDTs se seleccionaron en el Paso 1. Ver
 * derivarEdtsSoporte.ts.
 */
export function generarActividadesDeterministas(
  edts: EdtParaGenerar[],
  config: ConfiguracionWizardPaso1,
  textoTdr = ''
): ResultadoActividadesDeterministas {
  const advertencias: string[] = []
  const actividades: ActividadPropuesta[] = []

  // Sub-alcance de CMM: se evalúa una sola vez, sobre todo lo YA seleccionado
  // salvo CMM mismo (evitar que su propio texto dispare sus propios triggers).
  const subalcanceCMM = evaluarSubalcanceCMM(
    edts.filter(e => e.nombre !== 'CMM').flatMap(e => e.servicios),
    edts.map(e => e.nombre),
    config.alcanceLibre,
    textoTdr
  )
  // Sub-alcance de disciplinas ING/PLA (Control/Instrumentación) y de las
  // tareas de [Protocolos] de ING — mismo criterio: una sola evaluación,
  // reusada por ambos EDTs.
  const subalcanceDisciplina = evaluarSubalcanceDisciplinas(edts.map(e => e.nombre), config.alcanceLibre, textoTdr)
  const subalcanceProtocolosIng = evaluarSubalcanceProtocolosIng(config.alcanceLibre, textoTdr)

  for (const edt of edts) {
    if ((EDTS_AGRUPACION_IA as readonly string[]).includes(edt.nombre)) {
      continue
    }
    switch (edt.nombre) {
      case 'GES':
        actividades.push(...generarGES(edt.servicios, config))
        break
      case 'ING':
        actividades.push(...generarING(edt.servicios, config, subalcanceDisciplina, subalcanceProtocolosIng))
        break
      case 'CIE':
        actividades.push(...generarCIE(edt.servicios, config))
        break
      case 'SEG':
        actividades.push(...generarSEG(edt.servicios, config))
        break
      case 'CMM':
        actividades.push(...generarCMM(edt.servicios, config, subalcanceCMM))
        break
      case 'PLA':
        actividades.push(...generarPLA(edt.servicios, config, advertencias, subalcanceDisciplina))
        break
      case 'TAB':
        actividades.push(...generarTAB(edt.servicios, config, advertencias))
        break
      default:
        actividades.push(...generarDefault(edt.servicios, edt.nombre, edt.descripcion, config))
    }
  }

  for (const actividad of actividades) {
    actividad.tareas = ordenarPorCatalogo(actividad.tareas)
  }

  return { actividades, advertencias }
}
