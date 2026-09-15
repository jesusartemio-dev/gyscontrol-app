// Totales que el propio Excel declara, leídos sin IA.
//
// La plantilla de costeo se reusa entre cotizaciones y deja números sueltos en
// columnas sin cabecera; el modelo los llegó a tomar como precios e infló una
// cotización de 4,435.81 a 12,675.08. Estas filas de totales son la verdad del
// archivo y sirven para contrastar lo que el modelo devuelve.
//
// A propósito NO se parsea la tabla entera: la plantilla cambia entre años y un
// parser rígido se rompería. Solo se buscan las filas que dicen "TOTAL", que es
// lo único que se ha mantenido estable.

import * as XLSX from 'xlsx'

export interface BloqueDeclarado {
  titulo: string
  totalCliente: number
}

export interface TotalesHoja {
  hoja: string
  /** Total de la hoja según su fila "TOTAL GLOBAL US" o "TOTALES". null si no la declara. */
  totalCliente: number | null
  bloques: BloqueDeclarado[]
}

function texto(celda: unknown): string {
  return celda === null || celda === undefined ? '' : String(celda).trim()
}

function aNumero(celda: unknown): number | null {
  if (typeof celda === 'number') return Number.isFinite(celda) ? celda : null
  const limpio = texto(celda).replace(/[$\s]/g, '').replace(/,/g, '')
  if (!limpio || !/^-?\d*\.?\d+$/.test(limpio)) return null
  const n = parseFloat(limpio)
  return Number.isFinite(n) ? n : null
}

function numerosDe(fila: unknown[]): number[] {
  return fila.map(aNumero).filter((n): n is number => n !== null)
}

/** Fila de título de bloque: texto sin ninguna cifra y que no es la cabecera de la tabla. */
function esTitulo(fila: unknown[]): boolean {
  const primera = texto(fila[0])
  if (!primera || !/[a-záéíóúñ]/i.test(primera)) return false
  if (/^(it|total|totales|igv|tot\.)/i.test(primera)) return false
  if (fila.some((c) => /descripcion|descripción/i.test(texto(c)))) return false
  return numerosDe(fila).length === 0
}

export function leerTotalesDeclarados(buffer: Buffer): TotalesHoja[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const resultado: TotalesHoja[] = []

  for (const hoja of workbook.SheetNames) {
    const sheet = workbook.Sheets[hoja]
    if (!sheet) continue

    const filas = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
    })

    let totalCliente: number | null = null
    const bloques: BloqueDeclarado[] = []
    let tituloActual = ''

    for (const fila of filas) {
      const primera = texto(fila[0])

      if (esTitulo(fila)) {
        tituloActual = primera
        continue
      }

      // Total de toda la hoja (encabeza el bloque índice "RESUMEN ECONÓMICO TOTAL")
      if (/^total\s+global\s+us/i.test(primera)) {
        totalCliente = numerosDe(fila)[0] ?? null
        continue
      }

      // Total de un bloque de equipos/gastos
      if (/^total\s+us/i.test(primera)) {
        const valor = numerosDe(fila)[0]
        if (valor !== undefined && tituloActual) {
          bloques.push({ titulo: tituloActual, totalCliente: valor })
        }
        continue
      }

      // Hojas de servicios y de gastos con matriz: la fila TOTALES cierra con el monto,
      // precedido por las horas o cantidades de cada columna.
      if (/^totales$/i.test(primera)) {
        const numeros = numerosDe(fila)
        const valor = numeros[numeros.length - 1]
        if (valor !== undefined && totalCliente === null) totalCliente = valor
      }
    }

    // Si no declaró un total de hoja, se toma la suma de sus bloques.
    if (totalCliente === null && bloques.length > 0) {
      totalCliente = bloques.reduce((s, b) => s + b.totalCliente, 0)
    }

    resultado.push({ hoja, totalCliente, bloques })
  }

  return resultado
}

/** Normaliza para comparar títulos de bloque con los nombres de grupo que devuelve la IA. */
export function normalizarTitulo(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
