import type PptxGenJS from 'pptxgenjs'
import { COLORS, FONTS, INCIDENTES, TITULOS } from '../theme'
import { addFooter, addHeaderBanner, formatearFechaCorta } from '../helpers'
import type { PptGenInput } from '../types'

export function generarSlideIncidentes(
  pres: PptxGenJS,
  input: PptGenInput,
  pageNumber: number,
  totalPages: number,
): number {
  const slide = pres.addSlide()
  const { agregado } = input

  addHeaderBanner(pres, slide, TITULOS.INCIDENTES)

  const incidentes = agregado.registros.filter((r) => r.tipo === 'incidente')
  const observaciones = agregado.registros.filter((r) => r.tipo === 'observacion')

  // ─── Bloque "Incidentes" ──────────────────────────────────────────────────
  slide.addText('Incidentes', {
    ...INCIDENTES.SUBTITULO_INC,
    fontFace: FONTS.SECTION,
    fontSize: 18,
    bold: true,
    color: COLORS.ORANGE_PRIMARY,
  })

  if (incidentes.length === 0) {
    slide.addText('No se reportaron incidentes en esta semana.', {
      ...INCIDENTES.TEXTO_INC,
      fontFace: FONTS.SECTION,
      fontSize: 12,
      color: COLORS.GRAY_DARK,
      italic: true,
    })
  } else {
    const runs = incidentes.flatMap((r, i) => {
      const isLast = i === incidentes.length - 1
      return [
        {
          text: `• ${formatearFechaCorta(r.jornada.fechaTrabajo)}: `,
          options: { bold: true, breakLine: false as const },
        },
        {
          text: `${r.descripcion}${r.observaciones ? ` (${r.observaciones})` : ''}`,
          options: { breakLine: !isLast },
        },
      ]
    })
    slide.addText(runs, {
      ...INCIDENTES.TEXTO_INC,
      fontFace: FONTS.BODY,
      fontSize: 11,
      color: COLORS.GRAY_DARK,
      valign: 'top',
    })
  }

  // ─── Bloque "Notificaciones" (observaciones) ──────────────────────────────
  slide.addText('Notificaciones', {
    ...INCIDENTES.SUBTITULO_NOT,
    fontFace: FONTS.SECTION,
    fontSize: 18,
    bold: true,
    color: COLORS.ORANGE_PRIMARY,
  })

  if (observaciones.length === 0) {
    slide.addText('No se cuentan con notificaciones esta semana.', {
      ...INCIDENTES.TEXTO_NOT,
      fontFace: FONTS.SECTION,
      fontSize: 12,
      color: COLORS.GRAY_DARK,
      italic: true,
    })
  } else {
    const runs = observaciones.flatMap((r, i) => {
      const isLast = i === observaciones.length - 1
      return [
        {
          text: `• ${formatearFechaCorta(r.jornada.fechaTrabajo)}: `,
          options: { bold: true, breakLine: false as const },
        },
        {
          text: `${r.descripcion}${r.observaciones ? ` (${r.observaciones})` : ''}`,
          options: { breakLine: !isLast },
        },
      ]
    })
    slide.addText(runs, {
      ...INCIDENTES.TEXTO_NOT,
      fontFace: FONTS.BODY,
      fontSize: 11,
      color: COLORS.GRAY_DARK,
      valign: 'top',
    })
  }

  addFooter(slide, pageNumber, totalPages, agregado.reporte.proyecto.nombre)
  return 1
}
