import { jsonrepair } from 'jsonrepair'

/**
 * Extrae y parsea JSON del output de un modelo de IA.
 * Maneja: markdown code fences, caracteres de control inválidos,
 * comillas sin escapar y JSON truncado por límite de tokens.
 */
export function parseJsonIA(texto: string): unknown {
  const stripped = texto
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  try {
    return JSON.parse(stripped)
  } catch {
    // Intenta reparar el JSON (caracteres de control, comillas, truncados, etc.)
    const reparado = jsonrepair(stripped)
    return JSON.parse(reparado)
  }
}
