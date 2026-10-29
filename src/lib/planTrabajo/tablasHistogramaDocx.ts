import type { PlanHistogramas } from '@/types/planTrabajo'
import { formatearMes } from './generarHistogramaPng'

/**
 * Tablas de la sección 13 con una columna por mes (como la vista de la app),
 * en vez de un texto "2026-10: 1 · 2026-11: 1 · …" en una sola celda. El
 * número de columnas depende de los meses del proyecto y sus anchos se
 * reparten según cuántos sean, por eso la tabla se arma acá y no en la
 * plantilla: la plantilla deja un marcador (`{tablaHistogramaEquipo}`…) y
 * `insertarTablasHistograma` lo reemplaza después del render.
 */

export type ClaveTablaHistograma = 'equipo' | 'hh'

export interface FilaTablaHistograma {
  etiqueta: string
  valores: number[]
  total: number
}

export interface TablaHistograma {
  encabezadoEtiqueta: string
  encabezadoTotal: string
  meses: string[]
  filas: FilaTablaHistograma[]
  /** Fila "TOTAL GENERAL" con la suma de cada mes (solo horas-hombre). */
  totalGeneral?: { valores: number[]; total: number }
}

export const marcadorTablaHistograma = (clave: ClaveTablaHistograma) => `§TABLA:${clave}§`

export function tablasDeHistogramas(h: PlanHistogramas, totalHH: number): Record<ClaveTablaHistograma, TablaHistograma> {
  const meses = h.meses.map(m => formatearMes(m, h.meses))
  const filas = (lista: PlanHistogramas['equipoTrabajo']) => lista.map(f => ({ etiqueta: f.etiqueta, valores: f.valoresPorMes, total: f.total }))
  const sumaPorMes = h.meses.map((_, i) => h.horasHombre.reduce((s, f) => s + (Number(f.valoresPorMes[i]) || 0), 0))
  return {
    equipo: { encabezadoEtiqueta: 'PERSONAL / CARGO', encabezadoTotal: 'MÁX.', meses, filas: filas(h.equipoTrabajo) },
    hh: {
      encabezadoEtiqueta: 'EDT', encabezadoTotal: 'TOTAL HH', meses, filas: filas(h.horasHombre),
      totalGeneral: { valores: sumaPorMes, total: totalHH },
    },
  }
}

const FUENTE = 'Arial Narrow'
const ANCHO_TABLA = 9640

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 0 → "—" (se ve de un vistazo en qué meses participa); decimales a 1 cifra, sin ".0". */
export function formatoValor(v: number): string {
  const r = Math.round((Number(v) || 0) * 10) / 10
  return r === 0 ? '—' : String(r)
}

function celda(ancho: number, texto: string, { negrita = false, sombreado = false, jc = 'center', sz = 22 } = {}): string {
  return `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${sombreado ? '<w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>' : ''}` +
    `<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="${jc}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${FUENTE}" w:cs="${FUENTE}" w:eastAsia="${FUENTE}" w:hAnsi="${FUENTE}"/>` +
    `${negrita ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(texto)}</w:t></w:r></w:p></w:tc>`
}

export function xmlTablaHistograma(t: TablaHistograma): string {
  const n = t.meses.length
  // Con muchos meses la letra baja un poco para que entren los números.
  const sz = n > 6 ? 18 : 22
  const anchoTotal = 1100
  const anchoEtiqueta = n > 6 ? 2400 : 3000
  const anchoMes = n > 0 ? Math.floor((ANCHO_TABLA - anchoEtiqueta - anchoTotal) / n) : 0
  const etiquetaFinal = ANCHO_TABLA - anchoTotal - anchoMes * n // absorbe el redondeo
  const anchos = [etiquetaFinal, ...t.meses.map(() => anchoMes), anchoTotal]

  const fila = (celdas: string, encabezado = false) =>
    `<w:tr><w:trPr><w:cantSplit/>${encabezado ? '<w:tblHeader/>' : ''}<w:trHeight w:val="380" w:hRule="atLeast"/></w:trPr>${celdas}</w:tr>`

  const encabezado = fila(
    celda(anchos[0], t.encabezadoEtiqueta, { negrita: true, sombreado: true, sz }) +
    t.meses.map((m, i) => celda(anchos[i + 1], m, { negrita: true, sombreado: true, sz })).join('') +
    celda(anchoTotal, t.encabezadoTotal, { negrita: true, sombreado: true, sz }),
    true
  )
  const cuerpo = t.filas.map(f => fila(
    celda(anchos[0], f.etiqueta, { jc: 'left', sz }) +
    t.meses.map((_, i) => celda(anchos[i + 1], formatoValor(f.valores[i]), { sz })).join('') +
    celda(anchoTotal, formatoValor(f.total), { negrita: true, sz })
  )).join('')
  const total = t.totalGeneral
    ? fila(
        celda(anchos[0], 'TOTAL GENERAL', { negrita: true, sombreado: true, jc: 'left', sz }) +
        t.meses.map((_, i) => celda(anchos[i + 1], formatoValor(t.totalGeneral!.valores[i]), { negrita: true, sombreado: true, sz })).join('') +
        celda(anchoTotal, formatoValor(t.totalGeneral.total), { negrita: true, sombreado: true, sz })
      )
    : ''

  const borde = (lado: string) => `<w:${lado} w:val="single" w:color="auto" w:sz="4"/>`
  return `<w:tbl><w:tblPr><w:tblW w:w="${ANCHO_TABLA}" w:type="dxa"/><w:tblLayout w:type="fixed"/>` +
    `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(borde).join('')}</w:tblBorders></w:tblPr>` +
    `<w:tblGrid>${anchos.map(a => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>${encabezado}${cuerpo}${total}</w:tbl>`
}

/** Reemplaza el párrafo de cada marcador por su tabla. */
export function insertarTablasHistograma(
  documentXml: string,
  tablas: Partial<Record<ClaveTablaHistograma, TablaHistograma>>
): string {
  let xml = documentXml
  for (const clave of Object.keys(tablas) as ClaveTablaHistograma[]) {
    const re = new RegExp(`<w:p(?: [^>]*)?>(?:(?!</w:p>)[\\s\\S])*?${marcadorTablaHistograma(clave)}[\\s\\S]*?</w:p>`)
    const tabla = tablas[clave]
    xml = xml.replace(re, () => (tabla ? xmlTablaHistograma(tabla) : ''))
  }
  return xml
}
