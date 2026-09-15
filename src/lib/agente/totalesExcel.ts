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

/** Ítem leído directamente de la tabla, con la forma que espera ExcelEquipoGrupo. */
export interface ItemBloque {
  descripcion: string
  codigo?: string
  unidad?: string
  cantidad: number
  precioLista: number
  precioInterno: number
  precioCliente: number
  factorCosto: number
  factorVenta: number
}

export interface BloqueDeclarado {
  titulo: string
  totalCliente: number
  /** Filas con monto del bloque. Vacío si la cabecera no calzó con el formato conocido. */
  items: ItemBloque[]
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

/**
 * Índices de columna de la tabla de un bloque, ubicados por el texto de la cabecera.
 * Devuelve null si la fila no parece la cabecera conocida — la plantilla cambia entre
 * años y ahí simplemente no se recupera nada, sin romper.
 */
interface Columnas {
  descripcion: number
  codigo: number
  unidad: number
  cantidad: number
  precioCliente: number
  totalCliente: number
  precioInterno: number
  lista: number
  factorCosto: number
  factorVenta: number
}

function ubicarColumnas(fila: unknown[]): Columnas | null {
  const encabezados = fila.map((c) => texto(c).toUpperCase())
  const indiceDe = (patron: RegExp) => encabezados.findIndex((h) => patron.test(h))
  const todos = (patron: RegExp) =>
    encabezados.reduce<number[]>((acc, h, i) => (patron.test(h) ? [...acc, i] : acc), [])

  const descripcion = indiceDe(/^DESCRIPCION$|^DESCRIPCIÓN$/)
  const cantidad = indiceDe(/^QTY$|^CANT/)
  const unitarios = todos(/^UNIT\s*PRICE$/)
  const totales = todos(/^TOTAL\s*PRICE$/)

  if (descripcion < 0 || cantidad < 0 || unitarios.length === 0 || totales.length === 0) {
    return null
  }

  return {
    descripcion,
    codigo: indiceDe(/^CAT$/),
    unidad: indiceDe(/^UNID$/),
    cantidad,
    precioCliente: unitarios[0],
    totalCliente: totales[0],
    precioInterno: unitarios[1] ?? -1,
    lista: indiceDe(/^LIST\s*PRICE$/),
    factorCosto: indiceDe(/^INTEGRADOR$/),
    factorVenta: indiceDe(/^CLIENTE$/),
  }
}

function leerItem(fila: unknown[], col: Columnas): ItemBloque | null {
  const totalCliente = aNumero(fila[col.totalCliente]) ?? 0
  // La columna de total es la que decide: las filas en cero son plantilla vacía o
  // ítems que quedaron fuera del alcance de esta cotización.
  if (totalCliente <= 0) return null

  const descripcion = texto(fila[col.descripcion])
  const codigo = col.codigo >= 0 ? texto(fila[col.codigo]) : ''
  if (!descripcion && !codigo) return null

  const cantidad = aNumero(fila[col.cantidad]) ?? 1
  const precioCliente = aNumero(fila[col.precioCliente]) ?? totalCliente
  const precioInterno =
    col.precioInterno >= 0 ? aNumero(fila[col.precioInterno]) ?? precioCliente : precioCliente
  const lista = col.lista >= 0 ? aNumero(fila[col.lista]) : null

  return {
    descripcion: descripcion || codigo,
    codigo: codigo || undefined,
    unidad: col.unidad >= 0 ? texto(fila[col.unidad]) || undefined : undefined,
    cantidad: cantidad || 1,
    precioLista: lista ?? precioInterno,
    precioInterno,
    precioCliente,
    factorCosto: (col.factorCosto >= 0 ? aNumero(fila[col.factorCosto]) : null) ?? 1,
    factorVenta: (col.factorVenta >= 0 ? aNumero(fila[col.factorVenta]) : null) ?? 1,
  }
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
    let columnas: Columnas | null = null
    let itemsActuales: ItemBloque[] = []

    for (const fila of filas) {
      const primera = texto(fila[0])

      if (esTitulo(fila)) {
        tituloActual = primera
        columnas = null
        itemsActuales = []
        continue
      }

      // La cabecera de la tabla abre la zona de datos del bloque
      if (!columnas) {
        const ubicadas = ubicarColumnas(fila)
        if (ubicadas) {
          columnas = ubicadas
          continue
        }
      } else if (!/^total/i.test(primera)) {
        const item = leerItem(fila, columnas)
        if (item) itemsActuales.push(item)
        continue
      }

      // Total de toda la hoja (encabeza el bloque índice "RESUMEN ECONÓMICO TOTAL")
      if (/^total\s+global\s+us/i.test(primera)) {
        totalCliente = numerosDe(fila)[0] ?? null
        continue
      }

      // Total de un bloque de equipos/gastos: cierra el bloque en curso
      if (/^total\s+us/i.test(primera)) {
        const valor = numerosDe(fila)[0]
        if (valor !== undefined && tituloActual) {
          bloques.push({ titulo: tituloActual, totalCliente: valor, items: itemsActuales })
        }
        columnas = null
        itemsActuales = []
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
