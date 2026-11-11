import type { PlanAlcanceDetalladoTarea } from '@/types/planTrabajo'

/**
 * Viñeta de una tarea en el Alcance Detallado: **Título:** descripción.
 *
 * Antes se mostraba `texto || nombre`: en cuanto se escribía una descripción,
 * el nombre de la tarea desaparecía de la vista y del Word. Ahora el título (el
 * nombre del cronograma) va siempre, y la descripción a continuación si existe.
 */

// Prefijo de código que repite la actividad ("T1-D2112 - ", "T1-2 - "):
// un bloque sin espacios con al menos un dígito, seguido de " - ".
const PREFIJO_CODIGO = /^(?=\S*\d)[\p{L}\d]+(?:[-./][\p{L}\d]+)*\s+[-–]\s+/u

/** Nombre de la tarea sin el prefijo de código: "T1-D2112 - Armado de Andamios" → "Armado de Andamios". */
export function tituloTarea(nombre: string): string {
  const n = (nombre ?? '').trim()
  const sin = n.replace(PREFIJO_CODIGO, '').trim()
  return sin || n
}

export function partesVineta(t: Pick<PlanAlcanceDetalladoTarea, 'nombre' | 'texto' | 'manualId'>): {
  titulo: string
  descripcion: string
} {
  const texto = (t.texto ?? '').trim()
  // Agregada a mano: no existe en el cronograma, su texto es todo.
  if (t.manualId) return { titulo: '', descripcion: texto || (t.nombre ?? '').trim() }
  const nombre = (t.nombre ?? '').trim()
  const titulo = tituloTarea(nombre)
  const igualAlNombre = !texto || texto === nombre || texto === titulo
  return { titulo, descripcion: igualAlNombre ? '' : texto }
}

/** Para texto plano (copiar, contexto de IA): "Título: descripción" o solo uno de los dos. */
export function vinetaComoTexto(t: Pick<PlanAlcanceDetalladoTarea, 'nombre' | 'texto' | 'manualId'>): string {
  const { titulo, descripcion } = partesVineta(t)
  if (titulo && descripcion) return `${titulo}: ${descripcion}`
  return titulo || descripcion
}
