import type PptxGenJS from 'pptxgenjs'
import { ASSETS, COLORS, FONTS, PORTADA, SLIDE } from '../theme'
import { formatearAnio, formatearFechaLargaUpper } from '../helpers'

export function generarSlidePortada(pres: PptxGenJS, fechaInicio: Date, fechaFin: Date): number {
  const slide = pres.addSlide()
  slide.background = { color: COLORS.COVER_BG }

  const titulo = `INFORME SEMANAL DEL ${formatearFechaLargaUpper(fechaInicio)} AL ${formatearFechaLargaUpper(fechaFin)} DEL ${formatearAnio(fechaFin)}`

  slide.addText(titulo, {
    ...PORTADA.TITULO,
    fontFace: FONTS.TITLE_LARGE,
    fontSize: 28,
    bold: true,
    color: COLORS.WHITE,
    align: 'center',
    valign: 'middle',
  })

  slide.addImage({ path: ASSETS.LOGO_NEXA, ...PORTADA.LOGO_CLIENTE })

  slide.addText('Área Responsable Capex - Proyectos', {
    ...PORTADA.AREA_RESPONSABLE,
    fontFace: FONTS.SECTION,
    fontSize: 14,
    color: COLORS.WHITE,
  })

  // marca decorativa sutil al pie
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: SLIDE.HEIGHT - 0.2,
    w: SLIDE.WIDTH,
    h: 0.2,
    fill: { color: COLORS.ORANGE_PRIMARY },
    line: { color: COLORS.ORANGE_PRIMARY },
  })

  return 1
}
