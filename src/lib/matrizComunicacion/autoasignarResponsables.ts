import type { PersonaResoluble } from './utils'

export interface EdtParaMatching {
  proyectoEdtId: string
  /** ProyectoEdt.nombre (descriptivo) — mismo texto usado para generar la fila de la matriz. */
  nombre: string
  /** Código real del catálogo (ej. "CON"). */
  codigo: string
}

export interface CeldaMatriz {
  siglas: string
  valor: string
}

export interface ResultadoEleccion {
  userId: string | null
  codigoOrigen: 'R' | 'E' | null
  advertencia: string | null
}

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g')

/** lowercase + sin tildes — tolera mayúsculas/acentos, nunca sinónimos. */
export function normalizarTexto(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICOS, '')
}

/**
 * Empareja el texto libre de una fila de la Matriz contra los EDTs reales
 * del cronograma que se está procesando — es el mismo texto que se usó
 * para generar la fila (ProyectoEdt.nombre), así que la igualdad exacta
 * (normalizada) es confiable. Sin match -> null, nunca se inventa ni se
 * intenta un sinónimo.
 */
export function emparejarFilaConEdt(informacionFila: string, edts: EdtParaMatching[]): EdtParaMatching | null {
  const objetivo = normalizarTexto(informacionFila)
  return edts.find(e => normalizarTexto(e.nombre) === objetivo) ?? null
}

/**
 * Elige quién es el responsable a partir de las celdas de una fila de la
 * matriz: prioriza código "R" (Autoriza), cae a "E" (Emisor) si no hay
 * nadie con R, y nunca considera a un cliente ni a una sigla que ya no
 * resuelve a nadie (organigrama cambiado desde que se generó la matriz).
 */
export function elegirResponsableDeFila(celdas: CeldaMatriz[], personal: PersonaResoluble[]): ResultadoEleccion {
  const porSiglas = new Map(personal.map(p => [p.siglas, p]))

  const candidatas = celdas
    .map(c => ({ celda: c, persona: porSiglas.get(c.siglas) }))
    .filter((x): x is { celda: CeldaMatriz; persona: PersonaResoluble } => !!x.persona && !x.persona.esCliente && !!x.persona.userId)

  for (const codigo of ['R', 'E'] as const) {
    const conCodigo = candidatas.filter(x => x.celda.valor.toUpperCase().includes(codigo))
    if (conCodigo.length === 0) continue
    const elegida = conCodigo[0]
    const advertencia =
      conCodigo.length > 1
        ? `Varias personas con código "${codigo}" — se tomó la primera (${elegida.celda.siglas}).`
        : null
    return { userId: elegida.persona.userId, codigoOrigen: codigo, advertencia }
  }

  return { userId: null, codigoOrigen: null, advertencia: 'Sin persona con código "R" (Autoriza) ni "E" (Emisor) en esta fila.' }
}
