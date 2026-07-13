import { FAMILIA_SOPORTES_FABRICADOS } from './vocabularioFamiliasPro'

export interface TareaCreadaParaDependencias {
  id: string
  /** Nombre REAL del catálogo (CatalogoServicio.nombre) — nunca el nombre de presentación, que puede llevar el prefijo "{alias} - " de CON/PRO. */
  nombreCatalogo: string
  edtNombre: string
  /** Nombre de la Actividad a la que pertenece — permite reglas que solo deben aplicar dentro de una zona/familia específica (ej. Soportes Fabricados). */
  actividadNombre: string
}

export interface DependenciaSugerida {
  tareaOrigenId: string
  tareaDependienteId: string
  tipo: 'finish_to_start'
}

export interface ResultadoDependencias {
  sugerencias: DependenciaSugerida[]
  advertencias: string[]
}

interface ExtremoRegla {
  edtNombre: string
  nombreCatalogo: string
  /** Si se da, la tarea debe pertenecer a esta Actividad exacta (ej. la familia "Soportes Fabricados" de PRO) — si se omite, matchea cualquier instancia del EDT. */
  actividadNombre?: string
}

interface ReglaDependencia {
  origen: ExtremoRegla
  dependiente: ExtremoRegla
  /** Advertencia a emitir cuando el dependiente existe pero el origen no (ej. falta PLA) — opcional, la mayoría de las reglas no la necesitan. */
  advertenciaSiFaltaOrigen?: string
}

/**
 * Pares (nombre REAL de catálogo, EDT[, Actividad]) — determinista, sin IA.
 * Cada regla solo genera una dependencia si AMBAS tareas nombradas existen
 * realmente en la generación (no todo proyecto incluye CMM, por ejemplo).
 * Matchea por el nombre real del catálogo, NUNCA por el nombre de
 * presentación — las tareas de CON/PRO llevan un prefijo de alias
 * ("{alias} - {tarea}") que rompería un match por nombre mostrado.
 */
const REGLAS: ReglaDependencia[] = [
  { origen: { edtNombre: 'CIE', nombreCatalogo: 'Firma del Acta de Conformidad' }, dependiente: { edtNombre: 'CIE', nombreCatalogo: 'Cierre Contractual' } },
  { origen: { edtNombre: 'CIE', nombreCatalogo: 'Firma del Acta de Conformidad' }, dependiente: { edtNombre: 'CIE', nombreCatalogo: 'Valorización Final y Conformidad HES' } },
  { origen: { edtNombre: 'CON', nombreCatalogo: 'Armado de Andamios' }, dependiente: { edtNombre: 'CON', nombreCatalogo: 'Desmontaje de Andamios' } },
  { origen: { edtNombre: 'CMM', nombreCatalogo: 'Energización de Tableros' }, dependiente: { edtNombre: 'CMM', nombreCatalogo: 'Comisionamiento en Frío' } },
  { origen: { edtNombre: 'CMM', nombreCatalogo: 'Comisionamiento en Frío' }, dependiente: { edtNombre: 'CMM', nombreCatalogo: 'Comisionamiento en Caliente' } },
  { origen: { edtNombre: 'PRO', nombreCatalogo: 'Recepción en Almacén GYS' }, dependiente: { edtNombre: 'CON', nombreCatalogo: 'Preparación y Traslado de Materiales' } },
  {
    origen: { edtNombre: 'PLA', nombreCatalogo: 'Planos Típicos de Montaje' },
    dependiente: { edtNombre: 'PRO', nombreCatalogo: 'Solicitud de Cotización', actividadNombre: FAMILIA_SOPORTES_FABRICADOS },
    advertenciaSiFaltaOrigen: 'Soportes Fabricados requiere planos previos — verifica quién los elabora.',
  },
]

function coincideExtremo(t: TareaCreadaParaDependencias, extremo: ExtremoRegla): boolean {
  if (t.edtNombre !== extremo.edtNombre || t.nombreCatalogo !== extremo.nombreCatalogo) return false
  if (extremo.actividadNombre && t.actividadNombre !== extremo.actividadNombre) return false
  return true
}

/** Dependencias sugeridas por coincidencia exacta de (edtNombre, nombre real de catálogo[, Actividad]) — nunca por IA. */
export function sugerirDependencias(tareasCreadas: TareaCreadaParaDependencias[]): ResultadoDependencias {
  const sugerencias: DependenciaSugerida[] = []
  const advertencias: string[] = []

  for (const regla of REGLAS) {
    const origen = tareasCreadas.find(t => coincideExtremo(t, regla.origen))
    const dependiente = tareasCreadas.find(t => coincideExtremo(t, regla.dependiente))

    if (dependiente && !origen && regla.advertenciaSiFaltaOrigen) {
      advertencias.push(regla.advertenciaSiFaltaOrigen)
      continue
    }
    if (origen && dependiente && origen.id !== dependiente.id) {
      sugerencias.push({ tareaOrigenId: origen.id, tareaDependienteId: dependiente.id, tipo: 'finish_to_start' })
    }
  }
  return { sugerencias, advertencias }
}
