import type { ActividadPropuesta } from '@/types/cronogramaIA'

/**
 * Alias corto por Actividad usado para prefijar el nombre de sus tareas
 * ("{alias} - {nombre de tarea}") cuando el mismo catálogo se repite en
 * varias Actividades del mismo EDT (ej. "Armado de Andamios" en cada zona
 * de CON) — sin el prefijo son indistinguibles en vistas planas (listas,
 * reportes, asignaciones). La IA propone el alias en la Etapa A de
 * CON/PRO (ver prompts.ts); el resto de los EDTs (TAB/PLA/PLC/HMI) no
 * tiene ese paso y el alias se deriva siempre en código a partir del
 * nombre de la Actividad. En ambos casos el invariante (no vacío, una
 * palabra, único dentro del grupo) se garantiza acá, nunca se le confía
 * al LLM ni al usuario.
 */

const MAX_LARGO_ALIAS = 12
const MAX_LARGO_NOMBRE_TAREA = 45

/** Conectores sin valor distintivo — nunca elegidos como alias salvo que no quede ninguna otra palabra en el nombre. */
const STOPWORDS_ALIAS = new Set(['zona', 'área', 'area', 'de', 'del', 'por', 'la', 'el', 'los', 'las', 'y', 'en', 'a', 'al', 'tablero'])

function limpiarToken(token: string): string {
  return token.replace(/[^\p{L}\p{N}-]/gu, '')
}

function tokenizar(nombre: string): string[] {
  return nombre
    .split(/[\s/(),.]+/)
    .map(limpiarToken)
    .filter(t => t.length > 0)
}

/**
 * Deriva un alias candidato de un nombre de Actividad: la palabra
 * `indice` (0 = primera) entre las no-stopword, o si ninguna es
 * distintiva (ej. el catch-all "General/Transversal"), la primera
 * palabra cruda. Es el fallback determinístico — se usa cuando no hay
 * alias propuesto o el propuesto no pasa la validación formal.
 */
export function derivarAliasCandidato(nombreActividad: string, indice = 0): string {
  const tokens = tokenizar(nombreActividad)
  if (tokens.length === 0) return 'G'
  const distintivas = tokens.filter(t => !STOPWORDS_ALIAS.has(t.toLowerCase()))
  const disponibles = distintivas.length > 0 ? distintivas : tokens
  const palabra = disponibles[Math.min(indice, disponibles.length - 1)]
  return palabra.slice(0, MAX_LARGO_ALIAS)
}

/** Un alias propuesto (por la IA o editado a mano) es formalmente válido si es una sola palabra no vacía dentro del largo máximo. */
export function esAliasFormalmenteValido(alias: unknown): alias is string {
  if (typeof alias !== 'string') return false
  const limpio = alias.trim()
  if (limpio.length === 0 || limpio.length > MAX_LARGO_ALIAS) return false
  if (/\s/.test(limpio)) return false
  return true
}

/**
 * Resuelve un alias único por nombre de Actividad, preservando el orden
 * de entrada. Nunca confía el invariante al LLM/usuario: si el alias
 * propuesto no es formalmente válido, lo deriva del nombre; si colisiona
 * con uno ya asignado, prueba la siguiente palabra distintiva del mismo
 * nombre y, como último recurso, un sufijo numérico sobre el candidato
 * inicial.
 */
export function resolverAliasParaNombres(
  nombres: { nombre: string; aliasPropuesto?: string | null }[]
): Map<string, string> {
  const usados = new Set<string>()
  const resultado = new Map<string, string>()

  for (const { nombre, aliasPropuesto } of nombres) {
    const inicial = esAliasFormalmenteValido(aliasPropuesto) ? aliasPropuesto.trim() : derivarAliasCandidato(nombre)

    let candidato = inicial
    if (usados.has(candidato.toLowerCase())) {
      let resuelto = false
      for (let indice = 1; indice <= 6; indice++) {
        const siguiente = derivarAliasCandidato(nombre, indice)
        if (!usados.has(siguiente.toLowerCase())) {
          candidato = siguiente
          resuelto = true
          break
        }
      }
      if (!resuelto) {
        // Reservamos el largo del sufijo ANTES de truncar la base: si se
        // trunca después de concatenar, un candidato ya en el largo máximo
        // puede volver a producir el mismo string (bucle infinito).
        let n = 2
        let sufijado: string
        do {
          const sufijo = String(n)
          const base = inicial.slice(0, Math.max(0, MAX_LARGO_ALIAS - sufijo.length))
          sufijado = `${base}${sufijo}`
          n++
        } while (usados.has(sufijado.toLowerCase()))
        candidato = sufijado
      }
    }

    usados.add(candidato.toLowerCase())
    resultado.set(nombre, candidato)
  }

  return resultado
}

/** "{alias} - {nombreTarea}", recortando el nombre de tarea si hiciera falta para no superar el largo total máximo. */
export function prefijarNombreTarea(alias: string, nombreTarea: string, maxLargoTotal = MAX_LARGO_NOMBRE_TAREA): string {
  const prefijo = `${alias} - `
  const espacioDisponible = Math.max(0, maxLargoTotal - prefijo.length)
  const nombreFinal = nombreTarea.length > espacioDisponible ? nombreTarea.slice(0, espacioDisponible).trimEnd() : nombreTarea
  return `${prefijo}${nombreFinal}`
}

/**
 * Prefija "{alias} - " en el nombre de cada tarea de cada Actividad, SOLO
 * si el grupo tiene 2 o más Actividades (con una sola, el prefijo es
 * ruido). `aliasPropuestoPorNombre` es opcional: si una Actividad no
 * tiene alias propuesto ahí (ej. TAB/PLA/PLC/HMI, que no pasan por la
 * Etapa A de esquemas), se deriva genéricamente de su nombre.
 */
export function aplicarPrefijoDeActividad(
  actividades: ActividadPropuesta[],
  aliasPropuestoPorNombre?: Map<string, string>
): ActividadPropuesta[] {
  if (actividades.length < 2) return actividades

  const aliasPorNombre = resolverAliasParaNombres(
    actividades.map(a => ({ nombre: a.actividadNombre, aliasPropuesto: aliasPropuestoPorNombre?.get(a.actividadNombre) }))
  )

  return actividades.map(actividad => {
    const alias = aliasPorNombre.get(actividad.actividadNombre)
    if (!alias) return actividad
    return {
      ...actividad,
      tareas: actividad.tareas.map(t => ({ ...t, nombre: prefijarNombreTarea(alias, t.nombre) })),
    }
  })
}
