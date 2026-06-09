import type ExcelJS from 'exceljs'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'

/**
 * Escribe un valor en una celda respetando el formato de la plantilla:
 *  - Date    → se asigna como Date (la plantilla ya tiene el formato de fecha).
 *  - number  → directo.
 *  - string  → directo.
 *  - null/undefined (u otro tipo) → no escribe nada (deja la celda como está).
 */
export function escribirCelda(ws: ExcelJS.Worksheet, ref: string, valor: unknown): void {
  if (valor === null || valor === undefined) return
  const cell = ws.getCell(ref)
  if (valor instanceof Date) {
    cell.value = valor
    return
  }
  if (typeof valor === 'number' || typeof valor === 'string') {
    cell.value = valor
    return
  }
  // Otros tipos: no se escribe.
}

/** Días enteros entre dos fechas (a - b). Positivo = a es posterior a b. */
export function diasEntre(a: Date, b: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000
  return Math.round((a.getTime() - b.getTime()) / MS_POR_DIA)
}

/** Normaliza un nombre de fase para el match: MAYÚSCULAS, sin tildes, sin espacios extra. */
export function normalizarFase(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos (tildes)
    .toUpperCase()
    .trim()
}

/** Extensión de imagen para ExcelJS a partir del mime. */
export function extensionDesdeMime(mime: string): 'png' | 'jpeg' {
  return mime === 'image/png' ? 'png' : 'jpeg'
}

/**
 * ExcelJS NO puede LEER esta plantilla: sus drawings usan el namespace DrawingML por
 * defecto (sin prefijo `xdr:`), que el parser de ExcelJS no reconoce → al reconciliar
 * falla con "Cannot read properties of undefined (reading 'anchors')". Afecta a TODOS
 * los drawings (logos del encabezado y charts de Curva S / Histograma).
 *
 * Solución (Fase 1): devolver una copia EN MEMORIA de la plantilla SIN ningún drawing
 * ni chart, y sin las referencias desde las hojas, para que ExcelJS la cargue. Se
 * pierden los logos/charts precargados de la plantilla; las celdas, formato y merges se
 * conservan, y nuestras fotos se incrustan en un drawing nuevo que crea ExcelJS al
 * escribir. NO modifica el archivo en disco (pendiente: plantilla compatible con xdr:).
 */
export function limpiarPlantillaParaExcelJS(buf: Buffer): Buffer {
  const files = unzipSync(new Uint8Array(buf))

  // 1. Copiar todo menos drawings (+rels) y charts.
  const out: Record<string, Uint8Array> = {}
  for (const [name, data] of Object.entries(files)) {
    if (/^xl\/drawings\//.test(name)) continue
    if (/^xl\/charts\//.test(name)) continue
    out[name] = data
  }

  // 2. En cada hoja: quitar las rels a drawings y el elemento <drawing r:id=.../>.
  for (const name of Object.keys(out)) {
    if (!/^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(name)) continue
    const ridsQuitar: string[] = []
    const rels = strFromU8(out[name]).replace(/<Relationship\b[^>]*\/>/g, (tag) => {
      if (/Type="[^"]*\/drawing"/.test(tag) || /Target="[^"]*drawings\/drawing\d+\.xml"/.test(tag)) {
        const rid = tag.match(/Id="([^"]+)"/)?.[1]
        if (rid) ridsQuitar.push(rid)
        return ''
      }
      return tag
    })
    out[name] = strToU8(rels)

    const sheetName = name.replace('/_rels/', '/').replace(/\.rels$/, '')
    if (ridsQuitar.length && out[sheetName]) {
      let sx = strFromU8(out[sheetName])
      for (const rid of ridsQuitar) {
        sx = sx.replace(new RegExp(`<drawing[^>]*r:id="${rid}"[^>]*/>`, 'g'), '')
      }
      out[sheetName] = strToU8(sx)
    }
  }

  return Buffer.from(zipSync(out))
}

/** Letra(s) de columna ('A','B','AA'...) → índice 0-based (A=0, B=1, C=2...). */
function columnaAIndice0(letras: string): number {
  let n = 0
  for (const ch of letras.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/**
 * Convierte un rango 'C72:E80' al ancla de dos celdas que espera ExcelJS:
 * { tl, br } con col/row 0-indexados.
 *  - tl = esquina sup-izq de la celda inicial (col 0-based, row = fila-1).
 *  - br = esquina inf-der: usa el borde DERECHO de la última columna (col+1) y el
 *    borde INFERIOR de la última fila (= índice 0-based de la fila siguiente), de modo
 *    que la imagen cubra por completo la celda final (patrón two-cell anchor de ExcelJS).
 */
export function rangoAAncla(
  rango: string,
): { tl: { col: number; row: number }; br: { col: number; row: number } } {
  const m = rango.match(/^([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/)
  if (!m) throw new Error(`Rango inválido: ${rango}`)
  const [, colIni, filaIni, colFin, filaFin] = m
  return {
    tl: { col: columnaAIndice0(colIni), row: Number(filaIni) - 1 },
    br: { col: columnaAIndice0(colFin) + 1, row: Number(filaFin) },
  }
}
