/**
 * Docxtemplater NO actualiza `<w:tblGrid>` cuando un loop `{-w:tc tag}`
 * duplica una celda `<w:tc>` (usado por la grilla RACI, plantilla v7 —
 * `{-w:tc raciPersonas}{sigla}{/raciPersonas}` en la cabecera y
 * `{-w:tc roles}{rol}{/roles}` por fila de `{#matrizRaci}`): la tabla queda
 * con N celdas reales por fila pero el `<w:tblGrid>` sigue declarando el
 * conteo de columnas ORIGINAL de la plantilla (3, antes de expandir) —
 * confirmado por el usuario renderizando la plantilla real (no es un bug
 * teórico): con `tblLayout w:type="fixed"`, Word usa `tblGrid` para las
 * posiciones X de columna, así que el desalineo se ve como columnas
 * colapsadas/superpuestas en el docx final.
 *
 * Esta función corre DESPUÉS de `doc.renderAsync()` (ver exportDocx.ts) y
 * reconstruye `<w:tblGrid>` de CADA tabla del documento a partir del ancho
 * real (`<w:tcW>`) de las celdas de su fila más ancha — no asume que el
 * desalineo ocurre solo en la tabla RACI.
 */

interface CeldaAncho {
  /** Ancho de la celda en twips (`<w:tcW w:type="dxa" w:w="...">`) — 0 si no declara ancho (no debería pasar sin vMerge). */
  ancho: number
  /** `<w:gridSpan w:val="N">` — 1 si la celda no fusiona columnas. */
  gridSpan: number
}

/** Todas las columnas que ocupa una celda, repartiendo su ancho en partes iguales si fusiona varias (gridSpan > 1). */
function columnasDeCelda(celda: CeldaAncho): number[] {
  const anchoPorColumna = Math.round(celda.ancho / celda.gridSpan)
  return Array.from({ length: celda.gridSpan }, () => anchoPorColumna)
}

function extraerAtributoNumerico(xml: string, tag: string, atributo: string): number | null {
  const match = xml.match(new RegExp(`<w:${tag}\\b[^>]*\\sw:${atributo}="(\\d+)"`))
  return match ? Number(match[1]) : null
}

function celdasDeFila(filaXml: string): CeldaAncho[] {
  const celdas = filaXml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []
  return celdas.map(tc => ({
    ancho: extraerAtributoNumerico(tc, 'tcW', 'w') ?? 0,
    gridSpan: extraerAtributoNumerico(tc, 'gridSpan', 'val') ?? 1,
  }))
}

/**
 * Quita cualquier tabla anidada (a cualquier profundidad) del cuerpo de una
 * tabla — así, al buscar `<w:tr>` en lo que queda, solo aparecen las filas
 * PROPIAS de esta tabla, nunca las de una tabla anidada dentro de una celda.
 */
function quitarTablasAnidadas(cuerpoXml: string): string {
  let resultado = ''
  let i = 0
  while (i < cuerpoXml.length) {
    const inicioAnidada = cuerpoXml.indexOf('<w:tbl>', i)
    if (inicioAnidada === -1) {
      resultado += cuerpoXml.slice(i)
      break
    }
    resultado += cuerpoXml.slice(i, inicioAnidada)

    let profundidad = 1
    let j = inicioAnidada + '<w:tbl>'.length
    while (profundidad > 0) {
      const siguienteApertura = cuerpoXml.indexOf('<w:tbl>', j)
      const siguienteCierre = cuerpoXml.indexOf('</w:tbl>', j)
      if (siguienteCierre === -1) {
        // XML mal formado (no debería pasar en un docx válido) — no seguir recortando.
        return resultado + cuerpoXml.slice(inicioAnidada)
      }
      if (siguienteApertura !== -1 && siguienteApertura < siguienteCierre) {
        profundidad++
        j = siguienteApertura + '<w:tbl>'.length
      } else {
        profundidad--
        j = siguienteCierre + '</w:tbl>'.length
      }
    }
    i = j
  }
  return resultado
}

/** Fila "representativa" para reconstruir tblGrid: la de MÁS celdas literales (menos gridSpan = ancho por columna más confiable). */
function filaRepresentativa(filas: string[]): CeldaAncho[] | null {
  let mejor: CeldaAncho[] | null = null
  for (const fila of filas) {
    const celdas = celdasDeFila(fila)
    if (celdas.length === 0) continue
    if (!mejor || celdas.length > mejor.length) mejor = celdas
  }
  return mejor
}

/** Cuenta de columnas de grilla que ocupa una fila (celdas fusionadas cuentan su gridSpan completo). */
function columnasEfectivas(celdas: CeldaAncho[]): number {
  return celdas.reduce((suma, c) => suma + c.gridSpan, 0)
}

function reconstruirTablaSiHaceFalta(tablaXml: string): { xml: string; corregida: boolean } {
  const inicioTblGrid = tablaXml.indexOf('<w:tblGrid')
  const finCierreTblGrid = inicioTblGrid === -1 ? -1 : tablaXml.indexOf('</w:tblGrid>', inicioTblGrid)
  if (inicioTblGrid === -1 || finCierreTblGrid === -1) return { xml: tablaXml, corregida: false } // tabla sin tblGrid (no debería pasar) — no tocar
  const finTblGrid = finCierreTblGrid + '</w:tblGrid>'.length

  const gridColActual = tablaXml.slice(inicioTblGrid, finTblGrid).match(/<w:gridCol/g)?.length ?? 0

  const cuerpo = tablaXml.slice(finTblGrid)
  const cuerpoPropio = quitarTablasAnidadas(cuerpo)
  const filas = cuerpoPropio.match(/<w:tr>[\s\S]*?<\/w:tr>/g) ?? []
  const representativa = filaRepresentativa(filas)
  if (!representativa) return { xml: tablaXml, corregida: false } // tabla vacía — no hay de dónde reconstruir

  const columnasReales = columnasEfectivas(representativa)
  if (columnasReales === gridColActual) return { xml: tablaXml, corregida: false } // ya coincide — no tocar

  const anchosNuevos = representativa.flatMap(columnasDeCelda)
  const nuevoTblGrid = `<w:tblGrid>${anchosNuevos.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`

  return {
    xml: tablaXml.slice(0, inicioTblGrid) + nuevoTblGrid + tablaXml.slice(finTblGrid),
    corregida: true,
  }
}

/**
 * Recorre TODAS las tablas de `document.xml` (documento renderizado, después
 * de `doc.renderAsync()`) y corrige el `<w:tblGrid>` de cualquiera cuyo
 * conteo de columnas no coincida con las celdas reales de su fila más ancha.
 * Devuelve el XML corregido y la lista de tablas tocadas (índice 0-based en
 * el documento) — útil para loguear qué se corrigió sin fallar el export.
 *
 * Alcance: solo tablas de NIVEL SUPERIOR (no anidadas dentro de una celda de
 * otra tabla) — verificado que `plan-trabajo-nexa-template.docx` no tiene
 * tablas anidadas (profundidad máxima 1). Si en el futuro se agrega una,
 * esta función no corrige su propio tblGrid (sí evita que sus filas
 * contaminen el cálculo de la tabla que la contiene).
 */
export function sincronizarTblGridDelDocumento(documentXml: string): { xml: string; tablasCorregidas: number[] } {
  const spans: { inicio: number; fin: number }[] = []
  let profundidad = 0
  let i = 0
  let inicioActual = -1
  while (i < documentXml.length) {
    const siguienteApertura = documentXml.indexOf('<w:tbl>', i)
    const siguienteCierre = documentXml.indexOf('</w:tbl>', i)
    if (siguienteApertura === -1 && siguienteCierre === -1) break
    if (siguienteApertura !== -1 && (siguienteCierre === -1 || siguienteApertura < siguienteCierre)) {
      if (profundidad === 0) inicioActual = siguienteApertura
      profundidad++
      i = siguienteApertura + '<w:tbl>'.length
    } else {
      profundidad--
      i = siguienteCierre + '</w:tbl>'.length
      if (profundidad === 0) spans.push({ inicio: inicioActual, fin: i })
    }
  }

  let xml = documentXml
  const tablasCorregidas: number[] = []
  // De atrás para adelante — reemplazar por índice de string sin invalidar los offsets de los spans restantes.
  for (let idx = spans.length - 1; idx >= 0; idx--) {
    const { inicio, fin } = spans[idx]
    const { xml: tablaCorregida, corregida } = reconstruirTablaSiHaceFalta(xml.slice(inicio, fin))
    if (corregida) {
      xml = xml.slice(0, inicio) + tablaCorregida + xml.slice(fin)
      tablasCorregidas.unshift(idx)
    }
  }

  return { xml, tablasCorregidas }
}
