// ===================================================
// 📁 origenControles.ts
// 📌 De dónde salió cada control de una fila del IPERC.
//
// Tres procedencias:
//   catalogo — el texto está tal cual en el catálogo de /seguridad
//   ia       — lo redactó la IA (adaptó uno del catálogo, o lo inventó)
//   manual   — lo escribió una persona en la app
//
// Sirve para dos cosas: ordenar —primero lo del catálogo, después lo que la IA
// propone— y para que al revisar se vea de un vistazo qué es criterio de la
// empresa y qué es propuesta de la máquina.
//
// Se guarda en la columna `origenControles` y NO dentro de los campos de
// control, que siguen siendo texto plano. El Excel recibe texto, como siempre.
// ===================================================

import { itemsDeControl } from './riesgoResidual'

export type OrigenControl = 'catalogo' | 'ia' | 'manual'

export const CAMPOS_CONTROL = [
  'eliminar', 'sustituir', 'controlIngenieria', 'controlAdministrativo', 'controlReceptor',
] as const
export type CampoControl = (typeof CAMPOS_CONTROL)[number]

export interface ItemControl {
  texto: string
  origen: OrigenControl
}

export type OrigenControles = Partial<Record<CampoControl, ItemControl[]>>

/** Orden de presentación: lo de la empresa primero, lo propuesto después. */
const PESO: Record<OrigenControl, number> = { catalogo: 0, ia: 1, manual: 2 }

export function ordenarItems(items: ItemControl[]): ItemControl[] {
  return [...items].sort((a, b) => PESO[a.origen] - PESO[b.origen])
}

export const normalizarTextoControl = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').replace(/\.$/, '').trim()

const normalizar = normalizarTextoControl

/**
 * Clasifica los controles de una fila.
 *
 * @param previo lo que ya estaba guardado: un ítem que no cambió conserva su
 * procedencia, así una corrección de redacción no convierte en "manual" todo
 * lo que la persona no tocó.
 * @param origenNuevos qué son los ítems que aparecen por primera vez.
 */
export function clasificarControles(
  // Acepta cualquier objeto de fila: solo mira los campos de control y los
  // demas no le interesan.
  datos: Record<string, unknown>,
  catalogo: Set<string>,
  previo: OrigenControles | null | undefined,
  origenNuevos: OrigenControl,
): OrigenControles {
  const salida: OrigenControles = {}

  for (const campo of CAMPOS_CONTROL) {
    if (!(campo in datos)) {
      // Campo no tocado: se conserva lo que hubiera.
      if (previo?.[campo]) salida[campo] = previo[campo]
      continue
    }
    const antes = new Map(
      (previo?.[campo] ?? []).map(i => [normalizar(i.texto), i.origen]),
    )
    salida[campo] = itemsDeControl(datos[campo] as string | null | undefined).map(texto => {
      const clave = normalizar(texto)
      // El catálogo manda: si el texto es de la empresa, es de la empresa,
      // aunque antes figurara como propuesta de la IA.
      if (catalogo.has(clave)) return { texto, origen: 'catalogo' as const }
      const previoOrigen = antes.get(clave)
      return { texto, origen: previoOrigen ?? origenNuevos }
    })
  }

  return salida
}

/** Lee la columna Json sin confiar en su forma. */
export function leerOrigenControles(valor: unknown): OrigenControles {
  if (!valor || typeof valor !== 'object') return {}
  const salida: OrigenControles = {}
  for (const campo of CAMPOS_CONTROL) {
    const lista = (valor as Record<string, unknown>)[campo]
    if (!Array.isArray(lista)) continue
    salida[campo] = lista
      .filter((x): x is ItemControl =>
        !!x && typeof x === 'object' &&
        typeof (x as ItemControl).texto === 'string' &&
        ['catalogo', 'ia', 'manual'].includes((x as ItemControl).origen),
      )
      .map(x => ({ texto: x.texto, origen: x.origen }))
  }
  return salida
}

/**
 * Procedencia de los ítems de un campo, para pintar en la app.
 *
 * Si la columna no tiene nada —filas de antes de esto— devuelve los ítems del
 * texto sin marca, en vez de inventar una procedencia que no se sabe.
 */
export function itemsConOrigen(
  texto: string | null | undefined,
  origenes: OrigenControles,
  campo: CampoControl,
): Array<{ texto: string; origen: OrigenControl | null }> {
  const items = itemsDeControl(texto)
  const mapa = new Map((origenes[campo] ?? []).map(i => [normalizar(i.texto), i.origen]))
  if (mapa.size === 0) return items.map(t => ({ texto: t, origen: null }))
  return items.map(t => ({ texto: t, origen: mapa.get(normalizar(t)) ?? null }))
}

/** El texto del campo con los ítems ordenados por procedencia. */
export function textoOrdenado(items: ItemControl[]): string {
  return ordenarItems(items).map(i => i.texto).join('\n')
}
