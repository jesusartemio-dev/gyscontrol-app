import type ExcelJS from 'exceljs'

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
