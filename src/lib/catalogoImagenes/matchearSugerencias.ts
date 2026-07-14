/**
 * Puro, sin dependencias de servidor — se importa desde el cliente (chips de
 * sugerencia en la galería del alcance detallado) y podría reusarse en
 * servidor. Matching simple por substring normalizado (sin tildes,
 * lowercase) — nada de IA (Bloque 4.2, Tarea 6).
 */
import { normalizarTexto } from '@/lib/utils/normalizarTexto'

export interface CatalogoImagenParaSugerir {
  id: string
  nombre: string
  keywords: string[]
  categoria: string
  activo: boolean
}

export interface SugerenciaCatalogoImagen {
  id: string
  nombre: string
  categoria: string
}

/**
 * Migración suave (dato heredado o editado fuera del formulario, ej. Prisma
 * Studio): un elemento de `keywords` puede traer varios términos separados
 * por coma en un solo string ("roscadora, roscado, tubería, conduit") en vez
 * de un array ya dividido. El formulario de la Biblioteca (`CatalogoImagenModal`)
 * SIEMPRE divide antes de guardar, pero el matching se blinda igual — así una
 * imagen ya cargada con ese defecto empieza a sugerir sin necesidad de reeditarla.
 */
function keywordsPlanas(keywords: string[]): string[] {
  return keywords.flatMap(k => k.split(',').map(t => t.trim())).filter(Boolean)
}

/**
 * Devuelve las imágenes del catálogo cuyo nombre o alguna keyword aparece
 * como substring (en cualquier dirección) de alguno de los `textosContexto`
 * (nombres de herramientas/equipos del plan + nombres/descripciones de las
 * tareas del subItem). Solo imágenes activas; sin duplicados.
 */
export function matchearSugerenciasCatalogoImagen(
  catalogo: CatalogoImagenParaSugerir[],
  textosContexto: string[]
): SugerenciaCatalogoImagen[] {
  const contextoNormalizado = textosContexto
    .filter(t => t && t.trim().length > 0)
    .map(normalizarTexto)

  if (contextoNormalizado.length === 0) return []

  const coincide = (candidato: string): boolean => {
    const n = normalizarTexto(candidato)
    if (!n) return false
    return contextoNormalizado.some(ctx => ctx.includes(n) || n.includes(ctx))
  }

  const vistos = new Set<string>()
  const resultado: SugerenciaCatalogoImagen[] = []

  for (const img of catalogo) {
    if (!img.activo || vistos.has(img.id)) continue
    const terminos = [img.nombre, ...keywordsPlanas(img.keywords)]
    if (terminos.some(coincide)) {
      vistos.add(img.id)
      resultado.push({ id: img.id, nombre: img.nombre, categoria: img.categoria })
    }
  }

  return resultado
}
