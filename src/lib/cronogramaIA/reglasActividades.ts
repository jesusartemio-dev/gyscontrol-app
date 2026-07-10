import type {
  ActividadPropuesta,
  CatalogoServicioParaWizard,
  ConfiguracionWizardPaso1,
  ResultadoActividadesDeterministas,
  TareaPropuesta,
} from '@/types/cronogramaIA'

/**
 * EDTs cuya agrupación en Actividades depende de IA (zonas de CON, familias
 * de PRO) — nunca pasan por este motor determinista. Ver Bloque D.
 */
export const EDTS_CON_IA = ['CON', 'PRO'] as const

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
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'>
): TareaPropuesta {
  const cantidad = servicio.cantidad ?? 1
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
  }
}

/** Orden real del catálogo (nunca el orden de llegada de la respuesta de la IA ni del fetch). */
export function ordenarPorCatalogo<T extends { orden: number }>(tareas: T[]): T[] {
  return [...tareas].sort((a, b) => a.orden - b.orden)
}

/** true si la actividad debe crearse (tiene al menos 1 tarea incluida tras el filtro de alcance). */
function tieneAlMenosUnaTareaIncluida(tareas: TareaPropuesta[]): boolean {
  return tareas.some(t => t.incluida)
}

function agruparPorTag(
  servicios: CatalogoServicioParaWizard[],
  edtNombre: string,
  tagLabels: Record<string, string>,
  config: ConfiguracionWizardPaso1
): ActividadPropuesta[] {
  const buckets = new Map<string, TareaPropuesta[]>()

  for (const servicio of servicios) {
    const tagReconocido = servicio.actividadTag.find(t => t in tagLabels)
    const label = tagReconocido ? tagLabels[tagReconocido] : 'Otros'
    const tarea = construirTareaPropuesta(servicio, config)
    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label)!.push(tarea)
  }

  const actividades: ActividadPropuesta[] = []
  for (const [actividadNombre, tareas] of buckets) {
    if (!tieneAlMenosUnaTareaIncluida(tareas)) continue
    actividades.push({ edtNombre, actividadNombre, tareas, origen: 'determinista' })
  }
  return actividades
}

function generarGES(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  return agruparPorTag(servicios, 'GES', { Inicio: 'Inicio', Documentos: 'Documentos de Gestión', Seguimiento: 'Control y Seguimiento' }, config)
}

function generarING(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  return agruparPorTag(servicios, 'ING', {
    Generales: 'Generales',
    Electrico: 'Disciplina Eléctrica',
    Instrumentacion: 'Disciplina Instrumentación',
    Control: 'Disciplina Control',
    Protocolos: 'Protocolos',
    Envios: 'Envíos',
  }, config)
}

function generarCIE(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  return agruparPorTag(servicios, 'CIE', { Tecnico: 'Cierre Técnico', Gestion: 'Cierre de Gestión' }, config)
}

function generarSEG(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  const tareas = servicios.map(s => construirTareaPropuesta(s, config))
  if (!tieneAlMenosUnaTareaIncluida(tareas)) return []
  return [{ edtNombre: 'SEG', actividadNombre: 'Documentos de Seguridad', tareas, origen: 'determinista' }]
}

function generarCMM(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  const tareas = servicios.map(s => construirTareaPropuesta(s, config))
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
  advertencias: string[]
): ActividadPropuesta[] {
  const TAG_LABELS_RESTO: Record<string, string> = {
    Electrico: 'Disciplina Eléctrica',
    Instrumentacion: 'Disciplina Instrumentación',
    Control: 'Disciplina Control',
    Envios: 'Envíos',
  }

  const tablero = servicios.filter(s => s.actividadTag.includes('Tablero'))
  const resto = servicios.filter(s => !s.actividadTag.includes('Tablero'))

  const actividades: ActividadPropuesta[] = []

  const nombresTablero = config.tableros.map(t => t.nombre).filter(Boolean)
  if (tablero.length > 0 && nombresTablero.length === 0) {
    advertencias.push('PLA tiene tareas de tablero pero no se especificó ningún tablero en el Paso 1 — no se generó ninguna Actividad de tablero (regla: N° de tableros > 0).')
  }
  for (const nombreTablero of nombresTablero) {
    const tareas = tablero.map(s => construirTareaPropuesta(s, config))
    if (tieneAlMenosUnaTareaIncluida(tareas)) {
      actividades.push({ edtNombre: 'PLA', actividadNombre: formatearNombreTablero(nombreTablero), tareas, origen: 'determinista' })
    }
  }

  actividades.push(...agruparPorTag(resto, 'PLA', TAG_LABELS_RESTO, config))
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
  return actividades
}

function generarPLC(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1, advertencias: string[]): ActividadPropuesta[] {
  const nombres = config.plcs.map(p => p.nombre).filter(Boolean)
  if (servicios.length > 0 && nombres.length === 0) {
    advertencias.push('PLC tiene servicios en el catálogo pero no se especificó ningún PLC en el Paso 1 — no se generó ninguna Actividad de PLC (regla: N° de PLCs > 0).')
  }
  return generarPorInstancia(servicios, 'PLC', nombres, config)
}

function generarTAB(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1, advertencias: string[]): ActividadPropuesta[] {
  const nombres = config.tableros.map(t => t.nombre).filter(Boolean)
  if (servicios.length > 0 && nombres.length === 0) {
    advertencias.push('TAB tiene servicios en el catálogo pero no se especificó ningún tablero en el Paso 1 — no se generó ninguna Actividad de TAB (regla: N° de tableros > 0).')
  }
  return generarPorInstancia(servicios, 'TAB', nombres.map(formatearNombreTablero), config)
}

const RX_SCADA = /scada/i

/** HMI: una Actividad por estación (nombres genéricos "Estación HMI N") + una "SCADA" si aplica, separada por nombre del servicio (campo estructurado, no descripción). */
function generarHMI(servicios: CatalogoServicioParaWizard[], config: ConfiguracionWizardPaso1): ActividadPropuesta[] {
  if (servicios.length === 0 || config.hmiCantidad <= 0) return []

  const scadaServicios = config.scada ? servicios.filter(s => RX_SCADA.test(s.nombre)) : []
  const estacionServicios = config.scada ? servicios.filter(s => !RX_SCADA.test(s.nombre)) : servicios

  const nombresEstaciones = Array.from({ length: config.hmiCantidad }, (_, i) => `Estación HMI ${i + 1}`)
  const actividades = generarPorInstancia(estacionServicios, 'HMI', nombresEstaciones, config)

  if (scadaServicios.length > 0) {
    const tareas = scadaServicios.map(s => construirTareaPropuesta(s, config))
    if (tieneAlMenosUnaTareaIncluida(tareas)) {
      actividades.push({ edtNombre: 'HMI', actividadNombre: 'SCADA', tareas, origen: 'determinista' })
    }
  }

  return actividades
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
export function generarActividadesDeterministas(
  edts: EdtParaGenerar[],
  config: ConfiguracionWizardPaso1
): ResultadoActividadesDeterministas {
  const advertencias: string[] = []
  const actividades: ActividadPropuesta[] = []

  for (const edt of edts) {
    if ((EDTS_CON_IA as readonly string[]).includes(edt.nombre)) {
      continue
    }
    switch (edt.nombre) {
      case 'GES':
        actividades.push(...generarGES(edt.servicios, config))
        break
      case 'ING':
        actividades.push(...generarING(edt.servicios, config))
        break
      case 'CIE':
        actividades.push(...generarCIE(edt.servicios, config))
        break
      case 'SEG':
        actividades.push(...generarSEG(edt.servicios, config))
        break
      case 'CMM':
        actividades.push(...generarCMM(edt.servicios, config))
        break
      case 'PLA':
        actividades.push(...generarPLA(edt.servicios, config, advertencias))
        break
      case 'PLC':
        actividades.push(...generarPLC(edt.servicios, config, advertencias))
        break
      case 'TAB':
        actividades.push(...generarTAB(edt.servicios, config, advertencias))
        break
      case 'HMI':
        actividades.push(...generarHMI(edt.servicios, config))
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
