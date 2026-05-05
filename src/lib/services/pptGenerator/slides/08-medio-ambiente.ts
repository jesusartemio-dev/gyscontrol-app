import type PptxGenJS from 'pptxgenjs'
import { COLORS, FONTS, MEDIO_AMBIENTE, TITULOS } from '../theme'
import { addFooter, addHeaderBanner, addPhotoToSlide, truncate } from '../helpers'
import type { PptGenInput } from '../types'

export function generarSlidesMedioAmbiente(
  pres: PptxGenJS,
  input: PptGenInput,
  pageStart: number,
  totalPages: number,
): number {
  const { agregado, fotosPorRegistro } = input
  const ma = agregado.registros.filter((r) => r.tipo === 'medio_ambiente')

  if (ma.length === 0) {
    const slide = pres.addSlide()
    addHeaderBanner(pres, slide, TITULOS.MEDIO_AMBIENTE)
    slide.addText('Sin actividades de medio ambiente esta semana.', {
      x: 0.5,
      y: 3.0,
      w: 12.333,
      h: 1.0,
      fontFace: FONTS.SECTION,
      fontSize: 16,
      color: COLORS.FOOTER_GRAY,
      align: 'center',
      italic: true,
    })
    addFooter(slide, pageStart, totalPages, agregado.reporte.proyecto.nombre)
    return 1
  }

  ma.forEach((registro, idx) => {
    const slide = pres.addSlide()
    addHeaderBanner(pres, slide, TITULOS.MEDIO_AMBIENTE)

    slide.addText(truncate(registro.descripcion, 300), {
      ...MEDIO_AMBIENTE.TEXTO,
      fontFace: FONTS.BODY,
      fontSize: 11,
      color: COLORS.GRAY_DARK,
      valign: 'top',
    })

    slide.addShape(pres.ShapeType.rect, {
      ...MEDIO_AMBIENTE.MARCO_FOTO,
      fill: { color: COLORS.WHITE },
      line: { color: COLORS.GRAY_LIGHT, pt: 1 },
    })

    const fotos = fotosPorRegistro.get(registro.id) ?? []
    addPhotoToSlide(slide, fotos[0] ?? null, MEDIO_AMBIENTE.FOTO)

    addFooter(slide, pageStart + idx, totalPages, agregado.reporte.proyecto.nombre)
  })

  return ma.length
}
