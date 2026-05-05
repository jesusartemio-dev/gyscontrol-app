import type PptxGenJS from 'pptxgenjs'
import { COLORS, FONTS, GRID_3_COLS } from '../theme'
import {
  addFooter,
  addHeaderBanner,
  addPhotoToSlide,
  captionTextRuns,
  chunkArray,
  formatearFechaCorta,
} from '../helpers'
import type { PptGenInput } from '../types'
import type { TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'

const COLS = [GRID_3_COLS.COL_1, GRID_3_COLS.COL_2, GRID_3_COLS.COL_3]

/**
 * Genera N slides con grid de 3 columnas (foto + caption por columna).
 * Usado por slides "Charlas NDAD" e "Inspecciones".
 *
 * Devuelve la cantidad de slides creados.
 */
export function generarSlidesGridFotos(
  pres: PptxGenJS,
  input: PptGenInput,
  tipo: TipoRegistroSeguridad,
  titulo: string,
  pageStartNumber: number,
  totalPages: number,
  incluirParticipantes: boolean,
): number {
  const { agregado, fotosPorRegistro } = input
  const registros = agregado.registros.filter((r) => r.tipo === tipo)

  if (registros.length === 0) {
    const slide = pres.addSlide()
    addHeaderBanner(pres, slide, titulo)
    slide.addText(`Sin ${tipo === 'charla' ? 'charlas' : 'inspecciones'} esta semana.`, {
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
    addFooter(slide, pageStartNumber, totalPages, agregado.reporte.proyecto.nombre)
    return 1
  }

  const grupos = chunkArray(registros, 3)

  grupos.forEach((grupo, idx) => {
    const slide = pres.addSlide()
    addHeaderBanner(pres, slide, titulo)

    grupo.forEach((registro, colIdx) => {
      const col = COLS[colIdx]
      const fotos = fotosPorRegistro.get(registro.id) ?? []
      const primeraFoto = fotos[0] ?? null

      // Marco decorativo
      slide.addShape(pres.ShapeType.rect, {
        x: col.x,
        y: GRID_3_COLS.MARCO_Y,
        w: col.w,
        h: GRID_3_COLS.MARCO_H,
        fill: { color: COLORS.WHITE },
        line: { color: COLORS.GRAY_LIGHT, pt: 1 },
      })

      // Foto
      addPhotoToSlide(
        slide,
        primeraFoto,
        {
          x: col.x + 0.097,
          y: GRID_3_COLS.FOTO_Y,
          w: col.w - 0.194,
          h: GRID_3_COLS.FOTO_H,
        },
      )

      // Caption
      slide.addText(
        captionTextRuns({
          fecha: formatearFechaCorta(registro.jornada.fechaTrabajo),
          tema: registro.descripcion,
          participantes: incluirParticipantes ? registro.asistentes : null,
        }),
        {
          x: col.x,
          y: GRID_3_COLS.CAPTION_Y,
          w: col.w,
          h: GRID_3_COLS.CAPTION_H,
          fontFace: FONTS.SECTION,
          fontSize: 10,
          color: COLORS.GRAY_DARK,
          valign: 'top',
        },
      )
    })

    addFooter(slide, pageStartNumber + idx, totalPages, agregado.reporte.proyecto.nombre)
  })

  return grupos.length
}
