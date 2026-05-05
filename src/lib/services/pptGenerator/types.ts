import type { ReporteAgregado } from '../reporteSeguridad'
import type { RegistroSeguridadDetalle } from '../registroSeguridad'

/**
 * Datos consumidos por el generador de PPT.
 * Todas las fotos vienen pre-descargadas como data URL base64 (o null si fallaron).
 *
 * `fotosPorRegistro` es un mapa registroId → array de data URLs (mismo orden que `fotos`).
 */
export interface PptGenInput {
  agregado: ReporteAgregado
  fotosPorRegistro: Map<string, (string | null)[]>
}

/** Helper para obtener todas las fotos de un registro como data URLs */
export function fotosDeRegistro(input: PptGenInput, registro: RegistroSeguridadDetalle): (string | null)[] {
  return input.fotosPorRegistro.get(registro.id) ?? []
}
