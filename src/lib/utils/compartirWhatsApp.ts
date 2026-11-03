/**
 * Mensajes para pegar en WhatsApp desde un pedido o una lista.
 *
 * Antes el mensaje era solo cabecera + enlace, así que quien lo recibía tenía
 * que entrar para saber de qué se trataba. Ahora lleva el detalle de los ítems
 * para que se entienda en el chat, y el enlace sigue ahí para quien necesite
 * operar sobre el documento.
 *
 * Deliberadamente NO lleva precios: estos mensajes salen a proveedores y a
 * grupos de obra.
 */

/** Lo mínimo que el mensaje necesita de un ítem — pedido y lista coinciden en esto. */
export interface ItemCompartible {
  codigo?: string | null
  descripcion?: string | null
  cantidad?: number | null
  unidad?: string | null
}

/** Más que esto y WhatsApp lo colapsa en "Leer más" sin que se entienda nada. */
const MAX_ITEMS = 15
/**
 * 160 y no menos: la mediana de las descripciones reales es ~38 caracteres y el
 * p90 ~80, pero las de alquiler llevan las medidas al final ("Ancho 2.07 m x
 * Largo 2.07 m, Altura 5.00 m...") y rondan los 170. Recortar a 80 dejaba fuera
 * justo el dato que el proveedor necesita. Con 160 pasa intacto el 98% y el
 * tope solo frena las descripciones desbocadas (la más larga tiene 573).
 */
const MAX_DESCRIPCION = 160

/** Las descripciones del catálogo traen saltos de línea y espacios dobles. */
function unaSolaLinea(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

function recortar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto
}

function formatearCantidad(cantidad: number): string {
  return Number.isInteger(cantidad) ? String(cantidad) : String(Number(cantidad.toFixed(2)))
}

/**
 * Bloque numerado de ítems, cantidad primero porque es lo que el que recibe
 * necesita leer de un vistazo. Devuelve '' si no hay ítems.
 */
function bloqueItems(items: ItemCompartible[]): string {
  if (items.length === 0) return ''

  const lineas = items.slice(0, MAX_ITEMS).map((item, i) => {
    const descripcion = recortar(unaSolaLinea(item.descripcion || item.codigo || 'Sin descripción'), MAX_DESCRIPCION)
    const cantidad = formatearCantidad(item.cantidad ?? 0)
    const unidad = (item.unidad || '').trim()
    const medida = unidad ? `${cantidad} ${unidad}` : cantidad
    return `${i + 1}. ${medida} · ${descripcion}`
  })

  const restantes = items.length - MAX_ITEMS
  if (restantes > 0) lineas.push(`… y ${restantes} ítem(s) más`)

  return lineas.join('\n')
}

interface OpcionesMensaje {
  icono: string
  codigo: string
  nombre?: string | null
  proyecto: string
  estado: string
  /** Líneas extra de cabecera, ej. "Necesario: 15/11/2026". */
  extras?: string[]
  items: ItemCompartible[]
  url: string
}

function construirMensaje({ icono, codigo, nombre, proyecto, estado, extras = [], items, url }: OpcionesMensaje): string {
  const titulo = nombre?.trim() ? `${icono} *${codigo}* — ${nombre.trim()}` : `${icono} *${codigo}*`

  const cabecera = [
    titulo,
    `Proyecto: ${proyecto}`,
    `Estado: ${estado} | ${items.length} ítem(s)`,
    ...extras,
  ]

  const detalle = bloqueItems(items)

  return [cabecera.join('\n'), detalle, `🔗 ${url}`].filter(Boolean).join('\n\n')
}

export function mensajeCompartirPedido(opts: Omit<OpcionesMensaje, 'icono'>): string {
  return construirMensaje({ ...opts, icono: '📦' })
}

export function mensajeCompartirLista(opts: Omit<OpcionesMensaje, 'icono'>): string {
  return construirMensaje({ ...opts, icono: '📋' })
}
