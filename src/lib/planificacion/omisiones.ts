// Etiquetas legibles para los códigos de razón devueltos por validarAsignacion/batchAsignar.
// Mantener en sync con src/services/planificacion/validarAsignacion.ts y batchAsignar.ts.
const RAZON_LABELS: Record<string, string> = {
  conflicto_ausencia: 'ausencia',
  fin_de_semana_no_excepcional: 'fin de semana',
  proyecto_no_activo: 'proyecto cerrado/pausado',
  fecha_fuera_de_rango_proyecto: 'fecha fuera del rango del proyecto',
  empleado_no_activo: 'persona sin empleado activo',
  celda_ausencia: 'celda con ausencia',
  validacion_fallida: 'validación fallida',
}

export function labelRazonOmision(razon: string): string {
  return RAZON_LABELS[razon] ?? razon.replace(/_/g, ' ')
}

/**
 * Construye los fragmentos del toast a partir de las omisiones, agrupadas por razón
 * con su etiqueta legible. Ej: ["⚠ 1 omitida (fecha fuera del rango del proyecto)"].
 */
export function resumenOmisiones(omitidas: Array<{ razon: string }>): string[] {
  const conteo = new Map<string, number>()
  for (const o of omitidas) {
    conteo.set(o.razon, (conteo.get(o.razon) ?? 0) + 1)
  }
  return [...conteo.entries()].map(
    ([razon, n]) => `⚠ ${n} omitida${n !== 1 ? 's' : ''} (${labelRazonOmision(razon)})`,
  )
}
