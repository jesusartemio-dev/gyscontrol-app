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
  // Contexto adicional del proyecto (opcional)
  equiposProyecto?: string[]
  serviciosProyecto?: string[]
  alcanceTdr?: string | null
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
    { tipo: 'PETS',            codigoDocumento: `GYS-${cod}-P-001`,     titulo: 'Procedimiento Escrito de Trabajo Seguro',                       revision: '02' },
    { tipo: 'IPERC',           codigoDocumento: `GYS-${cod}-IPERC-001`, titulo: 'Identificación de Peligros, Evaluación de Riesgos y Controles', revision: '01' },
    { tipo: 'MATRIZ_EPP',      codigoDocumento: `GYS-${cod}-MEPP-001`,  titulo: 'Matriz de Equipos de Protección Personal',                      revision: '01' },
    { tipo: 'PLAN_EMERGENCIA', codigoDocumento: `GYS-${cod}-PL-002`,    titulo: 'Plan de Respuesta a Emergencias',                               revision: '01' },
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
      codigoDocumento: `GYS-${cod}-PAR-00${parIndex}`,
      titulo: par.titulo,
      revision: '01',
    })
    parIndex++
  }

  return specs
}
