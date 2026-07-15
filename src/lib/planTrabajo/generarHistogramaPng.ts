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
 * Nota de datos: cada fila de `equipoTrabajo`/`horasHombre` es UN EDT (no un
 * cargo/persona individual — así se calculan en calcularDatos.ts a propósito,
 * para garantizar que totalHH == Σ histograma == Σ cronograma). Por eso la
 * "leyenda" de estos gráficos son EDTs, no cargos — no existe en el schema
 * un desglose real de HH por persona/cargo y mes, así que no se inventa uno.
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

function construirSvgBarras(titulo: string, meses: string[], series: Serie[], modo: 'agrupado' | 'apilado'): string {
  const anchoGrafico = ANCHO - MARGEN.left - MARGEN.right
  const altoGrafico = ALTO - MARGEN.top - MARGEN.bottom

  const maxValor =
    modo === 'apilado'
      ? Math.max(1, ...meses.map((_, mi) => series.reduce((s, serie) => s + (serie.valores[mi] ?? 0), 0)))
      : Math.max(1, ...series.flatMap(s => s.valores))

  const anchoMes = anchoGrafico / Math.max(1, meses.length)
  const anchoBarraGrupo = anchoMes * 0.7
  const anchoBarraIndividual = modo === 'agrupado' ? anchoBarraGrupo / Math.max(1, series.length) : anchoBarraGrupo
  const escalaY = (v: number) => (v / maxValor) * altoGrafico

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

    const xEtiqueta = xMes + anchoBarraGrupo / 2
    const yEtiqueta = MARGEN.top + altoGrafico + 16
    barrasSvg += `<text x="${xEtiqueta.toFixed(1)}" y="${yEtiqueta}" font-size="11" text-anchor="end" fill="#333" transform="rotate(-40 ${xEtiqueta.toFixed(1)} ${yEtiqueta})">${escapeXml(mes)}</text>`
  })

  const ejeSvg = `
    <line x1="${MARGEN.left}" y1="${MARGEN.top}" x2="${MARGEN.left}" y2="${MARGEN.top + altoGrafico}" stroke="#888" stroke-width="1"/>
    <line x1="${MARGEN.left}" y1="${MARGEN.top + altoGrafico}" x2="${MARGEN.left + anchoGrafico}" y2="${MARGEN.top + altoGrafico}" stroke="#888" stroke-width="1"/>
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
  return svgAPng(construirSvgBarras('Histograma de Equipo de Trabajo (por EDT)', histogramas.meses, series, 'agrupado'))
}

/** null si no hay datos (sin meses o sin filas) — el flag `tieneHistogramaHHPng` queda en false y no se exporta gráfico. */
export async function generarHistogramaHHPng(histogramas: PlanHistogramas): Promise<ImagenResueltaTag | null> {
  if (histogramas.meses.length === 0 || histogramas.horasHombre.length === 0) return null
  const series = histogramas.horasHombre.map(f => ({ etiqueta: f.etiqueta, valores: f.valoresPorMes }))
  return svgAPng(construirSvgBarras('Histograma de Horas-Hombre (por EDT)', histogramas.meses, series, 'apilado'))
}
