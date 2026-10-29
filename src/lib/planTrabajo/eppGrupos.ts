import type { PlanEPP, PlanEPPItem } from '@/types/planTrabajo'

export interface GrupoEpp {
  titulo: string
  items: { texto: string }[]
}

/**
 * Grupo por defecto de un EPP de riesgo específico cuando no trae `grupo`
 * (planes generados antes de que existiera el campo), por palabras clave —
 * como el cuadro de EPP del plan aprobado por NEXA (Altura / Trabajos en
 * Caliente / Trabajos Eléctrico).
 */
const GRUPOS_POR_PALABRA: [RegExp, string][] = [
  [/arn[eé]s|l[ií]nea de vida|eslinga|absorbedor|altura|retr[aá]ctil/i, 'Altura'],
  [/diel[eé]ctric|arco|el[eé]ctric|voltaje|tensi[oó]n/i, 'Trabajos Eléctricos'],
  [/careta|esmeril|soldad|cuero|mandil|polaina|escarpin|caliente|chispa/i, 'Trabajos en Caliente'],
  [/respirador|filtro|cartucho|qu[ií]mic|vapor|tyvek|mascarilla/i, 'Protección Respiratoria y Química'],
]

export function grupoDeEpp(item: PlanEPPItem): string {
  if (item.grupo?.trim()) return item.grupo.trim()
  const texto = `${item.nombre} ${item.norma ?? ''} ${item.observaciones ?? ''}`
  return GRUPOS_POR_PALABRA.find(([re]) => re.test(texto))?.[1] ?? 'Otros'
}

/** "Casco de seguridad (ANSI Z89.1-2014)." — sin "()" vacío y con punto final, como la referencia. */
export function textoItemLista(nombre: string, norma?: string): string {
  const base = norma?.trim() ? `${nombre.trim()} (${norma.trim()})` : nombre.trim()
  return /[.!?:;]$/.test(base) ? base : `${base}.`
}

const tituloGrupo = (grupo: string) => (/^epp\b/i.test(grupo) ? grupo : `EPP ${grupo}`)

function agrupar(items: PlanEPPItem[], grupoPorDefecto?: string): GrupoEpp[] {
  const grupos = new Map<string, GrupoEpp>()
  for (const item of items) {
    if (!item.nombre?.trim()) continue
    const grupo = item.grupo?.trim() || grupoPorDefecto || grupoDeEpp(item)
    const titulo = tituloGrupo(grupo)
    if (!grupos.has(titulo)) grupos.set(titulo, { titulo, items: [] })
    grupos.get(titulo)!.items.push({ texto: textoItemLista(item.nombre, item.norma) })
  }
  return [...grupos.values()]
}

/** Columna izquierda (EPP básico + bioseguridad) y derecha (riesgo específico por tipo de trabajo) del cuadro de EPP. */
export function agruparEpp(epp: PlanEPP): { basico: GrupoEpp[]; riesgoEspecifico: GrupoEpp[] } {
  return {
    basico: [...agrupar(epp.basico ?? [], 'Generales'), ...agrupar(epp.bioseguridad ?? [], 'Bioseguridad')],
    riesgoEspecifico: agrupar(epp.riesgoEspecifico ?? []),
  }
}
