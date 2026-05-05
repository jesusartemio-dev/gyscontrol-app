import type PptxGenJS from 'pptxgenjs'
import { COLORS, FONTS, PREVENCION, TITULOS } from '../theme'
import { addFooter, addHeaderBanner, addPhotoToSlide, truncate } from '../helpers'
import type { PptGenInput } from '../types'

export function generarSlidePrevencion(
  pres: PptxGenJS,
  input: PptGenInput,
  pageNumber: number,
  totalPages: number,
): number {
  const { agregado, fotosPorRegistro } = input
  const slide = pres.addSlide()

  addHeaderBanner(pres, slide, TITULOS.PREVENCION)

  // Caja título naranja
  slide.addShape(pres.ShapeType.rect, {
    ...PREVENCION.CAJA_TITULO,
    fill: { color: COLORS.ORANGE_PRIMARY },
    line: { color: COLORS.ORANGE_PRIMARY },
  })
  slide.addText('PREVENCIÓN DE ENFERMEDADES', {
    ...PREVENCION.CAJA_TITULO,
    fontFace: FONTS.SECTION,
    fontSize: 18,
    bold: true,
    color: COLORS.WHITE,
    align: 'center',
    valign: 'middle',
  })

  // Marco de fotos
  slide.addShape(pres.ShapeType.rect, {
    ...PREVENCION.MARCO_FOTOS,
    fill: { color: COLORS.WHITE },
    line: { color: COLORS.GRAY_LIGHT, pt: 1 },
  })

  const prevs = agregado.registros.filter((r) => r.tipo === 'prevencion_salud')

  if (prevs.length === 0) {
    slide.addText('Sin actividades de prevención registradas esta semana.', {
      ...PREVENCION.CAPTION,
      fontFace: FONTS.SECTION,
      fontSize: 12,
      color: COLORS.FOOTER_GRAY,
      italic: true,
      valign: 'top',
    })
  } else {
    const principal = prevs[0]
    const fotos = fotosPorRegistro.get(principal.id) ?? []

    addPhotoToSlide(slide, fotos[0] ?? null, PREVENCION.FOTO_TOP)
    addPhotoToSlide(slide, fotos[1] ?? null, PREVENCION.FOTO_BOTTOM)

    slide.addText(
      [
        { text: 'Descripción de Fotografía:', options: { bold: true, breakLine: true } },
        { text: '', options: { breakLine: true } },
        { text: truncate(principal.descripcion, 400) },
      ],
      {
        ...PREVENCION.CAPTION,
        fontFace: FONTS.BODY,
        fontSize: 12,
        color: COLORS.GRAY_DARK,
        valign: 'top',
      },
    )
  }

  addFooter(slide, pageNumber, totalPages, agregado.reporte.proyecto.nombre)
  return 1
}
