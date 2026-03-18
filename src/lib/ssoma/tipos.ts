import { SsomaDocTipo, SsomaParSubtipo } from '@prisma/client'

// Qué PAR se genera según las actividades del proyecto
export interface SsomaActividadesAltoRiesgo {
  hayTrabajoElectrico: boolean
  nivelElectrico?: string | null   // "baja" | "media_alta"
  hayTrabajoAltura: boolean
  hayEspacioConfinado: boolean
  hayTrabajoCaliente: boolean
}

// Datos para los prompts IA
export interface SsomaPromptData {
  codigoCod: string
  nombreProyecto: string
  cliente: string
  planta: string
  descripcionTrabajos: string
  actividades: SsomaActividadesAltoRiesgo
  ingSeguridad: string
  gestorNombre: string
  ggNombre: string
  fecha: string // "DD/MM/YYYY"
}

// Qué documentos generar para un expediente
export interface SsomaDocSpec {
  tipo: SsomaDocTipo
  parSubtipo?: SsomaParSubtipo
  codigoDocumento: string
  titulo: string
  revision: string
}

// Genera la lista de documentos a crear según las actividades de alto riesgo
export function getDocSpecs(
  cod: string,
  actividades: SsomaActividadesAltoRiesgo
): SsomaDocSpec[] {
  const specs: SsomaDocSpec[] = [
    { tipo: 'PETS',            codigoDocumento: `GYS\u2013${cod}\u2013P\u2013001`,   titulo: 'Procedimiento Escrito de Trabajo Seguro',                       revision: '02' },
    { tipo: 'IPERC',           codigoDocumento: `GYS${cod}IPERC001`,                  titulo: 'Identificaci\u00f3n de Peligros, Evaluaci\u00f3n de Riesgos y Controles', revision: '01' },
    { tipo: 'MATRIZ_EPP',      codigoDocumento: `GYS\u2013SST\u2013MEPP\u2013001`,   titulo: 'Matriz de Equipos de Protecci\u00f3n Personal',                  revision: '01' },
    { tipo: 'PLAN_EMERGENCIA', codigoDocumento: `GYS\u2013${cod}\u2013PL\u2013002`,  titulo: 'Plan de Respuesta a Emergencias',                                revision: '01' },
  ]

  // PAR — uno por actividad de alto riesgo presente, numerados 001, 002...
  const parConfig: Array<{
    subtipo: SsomaParSubtipo
    titulo: string
    activa: boolean
  }> = [
    { subtipo: 'ELECTRICO',        titulo: 'PAR \u2014 Trabajos El\u00e9ctricos',           activa: actividades.hayTrabajoElectrico },
    { subtipo: 'ALTURA',           titulo: 'PAR \u2014 Trabajo en Altura',                  activa: actividades.hayTrabajoAltura },
    { subtipo: 'ESPACIO_CONFINADO', titulo: 'PAR \u2014 Trabajo en Espacio Confinado',      activa: actividades.hayEspacioConfinado },
    { subtipo: 'TRABAJO_CALIENTE', titulo: 'PAR \u2014 Trabajo en Caliente',                activa: actividades.hayTrabajoCaliente },
  ]

  let parIndex = 1
  for (const par of parConfig) {
    if (!par.activa) continue
    specs.push({
      tipo: 'PAR',
      parSubtipo: par.subtipo,
      codigoDocumento: `GYS\u2013${cod}\u2013PAR\u201300${parIndex}`,
      titulo: par.titulo,
      revision: '01',
    })
    parIndex++
  }

  return specs
}
