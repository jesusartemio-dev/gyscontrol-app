import sharp from 'sharp'
import type { PlanHistogramas } from '@/types/planTrabajo'
import type { ImagenResueltaTag } from './exportDocx'
import { asegurarFontconfigParaHistogramas, FUENTE_HISTOGRAMAS } from './configurarFontconfig'

/**
 * Gráficos de barras de la sección 13 (Bloque 4.2, Tarea 3) — compuestos a
 * mano en SVG desde los MISMOS datos deterministas de Etapa 1
 * (calcularHistogramasYCronograma), nunca de IA, y rasterizados a PNG con
 * sharp (ya usado en el proyecto para leer/redimensionar imágenes — ver
 * resolverImagenesAlcance.ts). Estilo "Excel simple": ejes, leyenda y
 * colores planos, sin librería de gráficos externa.
 *
 * Nota de datos — las dos series de esta sección tienen granularidad
 * DISTINTA a propósito:
 * - `horasHombre`: una fila por EDT (nunca por persona/cargo), para
 *   garantizar que totalHH == Σ histograma == Σ cronograma (informe §4.2).
 * - `equipoTrabajo`: una fila por CARGO real (informe §13, Bug 3 +
 *   docs/analisis-composicion-recursos.md) — dotación real resuelta desde
 *   `ProyectoTarea.recursoId` → `Recurso` (individual = el propio nombre del
 *   recurso, cuadrilla = sus perfiles `RecursoPerfil` × cantidad), NUNCA
 *   `personasEstimadas` (override manual que en la práctica nadie llena) ni
 *   agrupado por EDT.
 */

const ANCHO = 900
const ALTO = 460
const MARGEN = { top: 40, right: 20, bottom: 110, left: 60 }
const COLORES = [
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5',
  '#70AD47', '#264478', '#9E480E', '#636363', '#997300',
  '#255E91', '#43682B',
]

function escapeXml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface Serie {
  etiqueta: string
  valores: number[]
}

const NOMBRES_MES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

/** "2026-08" → "AGOSTO" (estilo Nexa) — agrega el año solo si el histograma cruza más de un año, para no confundir meses homónimos. */
export function formatearMes(mesKey: string, todosLosMeses: string[]): string {
  const [anio, mes] = mesKey.split('-')
  const nombre = NOMBRES_MES[Number(mes) - 1] ?? mesKey
  const cruzaVariosAnios = new Set(todosLosMeses.map(m => m.split('-')[0])).size > 1
  return cruzaVariosAnios ? `${nombre} ${anio}` : nombre
}

/**
 * Escala "redonda" para el eje Y (estilo Excel: 0, 100, 200... en vez de
 * 0, 137, 274...) — el tope real de la escala es SIEMPRE >= al valor máximo
 * de los datos, nunca lo recorta.
 */
export function calcularEscalaY(maxValor: number, cantidadTicksObjetivo = 5): { max: number; paso: number } {
  if (maxValor <= 0) return { max: cantidadTicksObjetivo, paso: 1 }
  const pasoBruto = maxValor / cantidadTicksObjetivo
  const magnitud = Math.pow(10, Math.floor(Math.log10(pasoBruto)))
  const residuo = pasoBruto / magnitud
  const pasoNormalizado = residuo <= 1 ? 1 : residuo <= 2 ? 2 : residuo <= 5 ? 5 : 10
  const paso = pasoNormalizado * magnitud
  return { max: Math.ceil(maxValor / paso) * paso, paso }
}

export function construirSvgBarras(titulo: string, meses: string[], series: Serie[], modo: 'agrupado' | 'apilado'): string {
  const anchoGrafico = ANCHO - MARGEN.left - MARGEN.right
  const altoGrafico = ALTO - MARGEN.top - MARGEN.bottom

  const maxValor =
    modo === 'apilado'
      ? Math.max(1, ...meses.map((_, mi) => series.reduce((s, serie) => s + (serie.valores[mi] ?? 0), 0)))
      : Math.max(1, ...series.flatMap(s => s.valores))
  const { max: maxEscala, paso: pasoEscala } = calcularEscalaY(maxValor)

  const anchoMes = anchoGrafico / Math.max(1, meses.length)
  const anchoBarraGrupo = anchoMes * 0.7
  const anchoBarraIndividual = modo === 'agrupado' ? anchoBarraGrupo / Math.max(1, series.length) : anchoBarraGrupo
  const escalaY = (v: number) => (v / maxEscala) * altoGrafico

  let barrasSvg = ''
  meses.forEach((mes, mi) => {
    const xMes = MARGEN.left + mi * anchoMes + (anchoMes - anchoBarraGrupo) / 2

    if (modo === 'apilado') {
      let acumulado = 0
      series.forEach((serie, si) => {
        const valor = serie.valores[mi] ?? 0
        const yTope = altoGrafico - escalaY(acumulado + valor)
        const alto = escalaY(valor)
        barrasSvg += `<rect x="${xMes.toFixed(1)}" y="${(MARGEN.top + yTope).toFixed(1)}" width="${anchoBarraIndividual.toFixed(1)}" height="${Math.max(0, alto).toFixed(1)}" fill="${COLORES[si % COLORES.length]}"/>`
        acumulado += valor
      })
    } else {
      series.forEach((serie, si) => {
        const valor = serie.valores[mi] ?? 0
        const x = xMes + si * anchoBarraIndividual
        const alto = escalaY(valor)
        const y = altoGrafico - alto
        barrasSvg += `<rect x="${x.toFixed(1)}" y="${(MARGEN.top + y).toFixed(1)}" width="${(anchoBarraIndividual * 0.9).toFixed(1)}" height="${Math.max(0, alto).toFixed(1)}" fill="${COLORES[si % COLORES.length]}"/>`
      })
    }

    const etiquetaMes = formatearMes(mes, meses)
    const xEtiqueta = xMes + anchoBarraGrupo / 2
    const yEtiqueta = MARGEN.top + altoGrafico + 16
    // Horizontal si entra en el ancho del mes (estilo del manual: "MAYO", "JUNIO"...);
    // si hay muchos meses y no entra, rota -40° como antes para no superponerse.
    const cabeEnHorizontal = etiquetaMes.length * 6.2 < anchoMes
    barrasSvg += cabeEnHorizontal
      ? `<text x="${xEtiqueta.toFixed(1)}" y="${yEtiqueta}" font-size="11" text-anchor="middle" fill="#333">${escapeXml(etiquetaMes)}</text>`
      : `<text x="${xEtiqueta.toFixed(1)}" y="${yEtiqueta}" font-size="11" text-anchor="end" fill="#333" transform="rotate(-40 ${xEtiqueta.toFixed(1)} ${yEtiqueta})">${escapeXml(etiquetaMes)}</text>`
  })

  // Eje Y: gridlines horizontales + valor numérico en cada tick (0, paso, 2×paso... hasta maxEscala).
  let gridSvg = ''
  const cantidadTicks = Math.round(maxEscala / pasoEscala)
  for (let i = 0; i <= cantidadTicks; i++) {
    const valorTick = i * pasoEscala
    const y = MARGEN.top + altoGrafico - escalaY(valorTick)
    gridSvg += `<line x1="${MARGEN.left}" y1="${y.toFixed(1)}" x2="${(MARGEN.left + anchoGrafico).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${i === 0 ? '#888' : '#e0e0e0'}" stroke-width="1"/>`
    gridSvg += `<text x="${MARGEN.left - 8}" y="${(y + 3.5).toFixed(1)}" font-size="10" text-anchor="end" fill="#666">${Math.round(valorTick)}</text>`
  }

  const ejeSvg = `
    ${gridSvg}
    <line x1="${MARGEN.left}" y1="${MARGEN.top}" x2="${MARGEN.left}" y2="${MARGEN.top + altoGrafico}" stroke="#888" stroke-width="1"/>
  `

  // Leyenda — hasta 3 columnas para no desbordar el ancho con muchos EDTs.
  const COLUMNAS_LEYENDA = 3
  const anchoColumna = anchoGrafico / COLUMNAS_LEYENDA
  let leyendaSvg = ''
  series.forEach((serie, si) => {
    const fila = Math.floor(si / COLUMNAS_LEYENDA)
    const columna = si % COLUMNAS_LEYENDA
    const x = MARGEN.left + columna * anchoColumna
    const y = MARGEN.top + altoGrafico + 46 + fila * 14
    leyendaSvg += `<rect x="${x}" y="${y}" width="9" height="9" fill="${COLORES[si % COLORES.length]}"/>`
    const etiquetaCorta = serie.etiqueta.length > 28 ? `${serie.etiqueta.slice(0, 27)}…` : serie.etiqueta
    leyendaSvg += `<text x="${x + 13}" y="${y + 8}" font-size="10" fill="#333">${escapeXml(etiquetaCorta)}</text>`
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}" font-family="${FUENTE_HISTOGRAMAS}">
    <rect width="${ANCHO}" height="${ALTO}" fill="#ffffff"/>
    <text x="${ANCHO / 2}" y="20" font-size="15" font-weight="bold" text-anchor="middle" fill="#222">${escapeXml(titulo)}</text>
    ${ejeSvg}
    ${barrasSvg}
    ${leyendaSvg}
  </svg>`
}

async function svgAPng(svg: string): Promise<ImagenResueltaTag> {
  asegurarFontconfigParaHistogramas()
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
  return { data: `data:image/png;base64,${buffer.toString('base64')}`, width: ANCHO, height: ALTO }
}

/** null si no hay datos (sin meses o sin filas) — el flag `tieneHistogramaEquipoPng` queda en false y no se exporta gráfico. */
export async function generarHistogramaEquipoPng(histogramas: PlanHistogramas): Promise<ImagenResueltaTag | null> {
  if (histogramas.meses.length === 0 || histogramas.equipoTrabajo.length === 0) return null
  const series = histogramas.equipoTrabajo.map(f => ({ etiqueta: f.etiqueta, valores: f.valoresPorMes }))
  return svgAPng(construirSvgBarras('Histograma de Equipo de Trabajo', histogramas.meses, series, 'agrupado'))
}

/** null si no hay datos (sin meses o sin filas) — el flag `tieneHistogramaHHPng` queda en false y no se exporta gráfico. */
export async function generarHistogramaHHPng(histogramas: PlanHistogramas): Promise<ImagenResueltaTag | null> {
  if (histogramas.meses.length === 0 || histogramas.horasHombre.length === 0) return null
  const series = histogramas.horasHombre.map(f => ({ etiqueta: f.etiqueta, valores: f.valoresPorMes }))
  return svgAPng(construirSvgBarras('Histograma de Horas-Hombre', histogramas.meses, series, 'apilado'))
}
