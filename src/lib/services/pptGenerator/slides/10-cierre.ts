import type PptxGenJS from 'pptxgenjs'
import { CIERRE, COLORS, FONTS, SLIDE } from '../theme'

export function generarSlideCierre(pres: PptxGenJS): number {
  const slide = pres.addSlide()
  slide.background = { color: COLORS.COVER_BG }

  slide.addText('Gracias', {
    ...CIERRE.TITULO,
    fontFace: FONTS.TITLE_LARGE,
    fontSize: 80,
    bold: true,
    color: COLORS.WHITE,
    align: 'center',
    valign: 'middle',
  })

  // banda decorativa al pie
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
