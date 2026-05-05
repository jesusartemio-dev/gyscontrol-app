import type PptxGenJS from 'pptxgenjs'
import { ACTIVIDADES, COLORS, FONTS, TITULOS } from '../theme'
import {
  addFooter,
  addHeaderBanner,
  addPhotoToSlide,
  chunkArray,
  truncate,
} from '../helpers'
import type { PptGenInput } from '../types'
import type { RegistroSeguridadDetalle } from '@/lib/services/registroSeguridad'

export function generarSlidesActividades(
  pres: PptxGenJS,
  input: PptGenInput,
  pageStart: number,
  totalPages: number,
): number {
  const { agregado, fotosPorRegistro } = input
  const actividades = agregado.registros.filter((r) => r.tipo === 'actividad_general')

  if (actividades.length === 0) {
    const slide = pres.addSlide()
    addHeaderBanner(pres, slide, TITULOS.ACTIVIDADES)
    slide.addText('Sin actividades registradas esta semana.', {
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

  const grupos = chunkArray(actividades, 2)

  grupos.forEach((par, idx) => {
    const slide = pres.addSlide()
    addHeaderBanner(pres, slide, TITULOS.ACTIVIDADES)

    const izq = par[0]
    const der = par[1]

    pintarLado(slide, izq, fotosPorRegistro.get(izq.id) ?? [], 'izq')
    if (der) pintarLado(slide, der, fotosPorRegistro.get(der.id) ?? [], 'der')

    addFooter(slide, pageStart + idx, totalPages, agregado.reporte.proyecto.nombre)
  })

  return grupos.length
}

function pintarLado(
  slide: PptxGenJS.Slide,
  registro: RegistroSeguridadDetalle,
  fotos: (string | null)[],
  lado: 'izq' | 'der',
) {
  if (lado === 'izq') {
    if (fotos.length <= 1) {
      // Una sola foto grande ocupando ambos slots
      addPhotoToSlide(slide, fotos[0] ?? null, ACTIVIDADES.MARCO_IZQ)
    } else {
      addPhotoToSlide(slide, fotos[0], ACTIVIDADES.FOTO_IZQ_TOP)
      addPhotoToSlide(slide, fotos[1], ACTIVIDADES.FOTO_IZQ_BOTTOM)
    }
    slide.addText(
      [
        { text: 'Descripción de Actividad: ', options: { bold: true, breakLine: true } },
        { text: truncate(registro.descripcion, 250) },
      ],
      {
        ...ACTIVIDADES.CAPTION_IZQ,
        fontFace: FONTS.BODY,
        fontSize: 10,
        color: COLORS.GRAY_DARK,
        valign: 'top',
      },
    )
  } else {
    if (fotos.length <= 1) {
      addPhotoToSlide(slide, fotos[0] ?? null, ACTIVIDADES.MARCO_DER)
    } else {
      addPhotoToSlide(slide, fotos[0], ACTIVIDADES.FOTO_DER_TILE)
      addPhotoToSlide(slide, fotos[1], ACTIVIDADES.FOTO_DER_BIG)
    }
    slide.addText(
      [
        { text: 'Descripción de Actividad: ', options: { bold: true, breakLine: true } },
        { text: truncate(registro.descripcion, 250) },
      ],
      {
        ...ACTIVIDADES.CAPTION_DER,
        fontFace: FONTS.BODY,
        fontSize: 10,
        color: COLORS.GRAY_DARK,
        valign: 'top',
      },
    )
  }
}
