import type PptxGenJS from 'pptxgenjs'
import { COLORS, FONTS, RIESGO, TITULOS } from '../theme'
import { addFooter, addHeaderBanner, addPhotoToSlide, truncate } from '../helpers'
import type { PptGenInput } from '../types'

export function generarSlideRiesgoCritico(
  pres: PptxGenJS,
  input: PptGenInput,
  pageNumber: number,
  totalPages: number,
): number {
  const { agregado, fotosPorRegistro } = input
  const slide = pres.addSlide()

  addHeaderBanner(pres, slide, TITULOS.RIESGO)

  const riesgos = agregado.registros.filter((r) => r.tipo === 'riesgo_critico')

  // Marco general
  slide.addShape(pres.ShapeType.rect, {
    ...RIESGO.MARCO,
    fill: { color: COLORS.WHITE },
    line: { color: COLORS.GRAY_LIGHT, pt: 1 },
  })

  if (riesgos.length === 0) {
    slide.addText('Sin riesgos críticos reportados esta semana.', {
      x: 0.5,
      y: 3.5,
      w: 12.333,
      h: 1.0,
      fontFace: FONTS.SECTION,
      fontSize: 16,
      color: COLORS.FOOTER_GRAY,
      align: 'center',
      italic: true,
    })
    addFooter(slide, pageNumber, totalPages, agregado.reporte.proyecto.nombre)
    return 1
  }

  const principal = riesgos[0]
  const fotos = fotosPorRegistro.get(principal.id) ?? []

  addPhotoToSlide(slide, fotos[0] ?? null, RIESGO.FOTO_1)
  addPhotoToSlide(slide, fotos[1] ?? null, RIESGO.FOTO_2)

  // Bloque de texto a la derecha
  const acciones = (principal.observaciones ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const runs: { text: string; options?: { bold?: boolean; breakLine?: boolean; bullet?: boolean } }[] = []
  runs.push({ text: 'Los Riesgos Críticos mejor controlados fueron:', options: { breakLine: true } })
  runs.push({ text: '', options: { breakLine: true } })
  runs.push({ text: 'El Control y Bloqueo de Energías:', options: { bold: true, breakLine: true } })
  runs.push({ text: truncate(principal.descripcion, 350), options: { breakLine: true } })
  if (acciones.length > 0) {
    runs.push({ text: '', options: { breakLine: true } })
    runs.push({ text: 'Acción realizada:', options: { bold: true, breakLine: true } })
    for (const a of acciones) {
      runs.push({ text: a, options: { bullet: true, breakLine: true } })
    }
  }

  slide.addText(runs, {
    ...RIESGO.TEXTO,
    fontFace: FONTS.BODY,
    fontSize: 11,
    color: COLORS.GRAY_DARK,
    valign: 'top',
  })

  addFooter(slide, pageNumber, totalPages, agregado.reporte.proyecto.nombre)
  return 1
}
