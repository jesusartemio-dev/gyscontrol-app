import type PptxGenJS from 'pptxgenjs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ASSETS, COLORS, FONTS, FOOTER_H, FOOTER_Y, HEADER_BANNER, SLIDE } from './theme'

export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

// ─── Header banner común (slides 3-9) ────────────────────────────────────────
export function addHeaderBanner(pres: PptxGenJS, slide: PptxGenJS.Slide, title: string) {
  slide.addShape(pres.ShapeType.rect, {
    x: HEADER_BANNER.X,
    y: HEADER_BANNER.Y,
    w: HEADER_BANNER.W,
    h: HEADER_BANNER.H,
    fill: { color: COLORS.ORANGE_PRIMARY },
    line: { color: COLORS.ORANGE_PRIMARY },
  })
  slide.addText(title, {
    x: 0.249,
    y: 0.2,
    w: 11.0,
    h: 0.5,
    fontFace: FONTS.SECTION,
    fontSize: 18,
    bold: true,
    color: COLORS.WHITE,
    align: 'left',
    valign: 'middle',
  })
  // Logo GyS arriba a la derecha
  slide.addImage({
    path: ASSETS.LOGO_GYS,
    x: 11.5,
    y: 0.1,
    w: 1.6,
    h: 0.65,
  })
}

// ─── Footer común ────────────────────────────────────────────────────────────
export function addFooter(slide: PptxGenJS.Slide, currentPage: number, totalPages: number, projectName: string) {
  slide.addText(`${projectName} | Pág ${currentPage} de ${totalPages}`, {
    x: 0.3,
    y: FOOTER_Y,
    w: SLIDE.WIDTH - 0.6,
    h: FOOTER_H,
    fontFace: FONTS.SECTION,
    fontSize: 9,
    color: COLORS.FOOTER_GRAY,
    align: 'right',
  })
}

// ─── Foto con fallback a placeholder ─────────────────────────────────────────
export function addPhotoToSlide(
  slide: PptxGenJS.Slide,
  fotoBase64: string | null | undefined,
  frame: Frame,
  placeholderText = 'Foto no disponible',
) {
  if (fotoBase64) {
    slide.addImage({
      data: fotoBase64,
      ...frame,
      sizing: { type: 'cover', w: frame.w, h: frame.h },
    })
  } else {
    addPhotoPlaceholder(slide, frame, placeholderText)
  }
}

export function addPhotoPlaceholder(slide: PptxGenJS.Slide, frame: Frame, label: string) {
  slide.addText(label, {
    ...frame,
    fontFace: FONTS.SECTION,
    fontSize: 11,
    color: COLORS.FOOTER_GRAY,
    fill: { color: COLORS.GRAY_PLACEHOLDER },
    align: 'center',
    valign: 'middle',
  })
}

// ─── Caption multi-línea para charlas/inspecciones ───────────────────────────
export interface CaptionLines {
  fecha: string
  tema: string
  participantes?: number | null
}

export function captionTextRuns(c: CaptionLines): { text: string; options?: { bold?: boolean; breakLine?: boolean } }[] {
  const out: { text: string; options?: { bold?: boolean; breakLine?: boolean } }[] = []
  out.push({ text: 'Fecha: ', options: { bold: true } })
  out.push({ text: `${c.fecha}.`, options: { breakLine: true } })
  out.push({ text: 'Descripción/Tema: ', options: { bold: true } })
  out.push({ text: `${truncate(c.tema, 200)}.`, options: { breakLine: true } })
  if (c.participantes != null) {
    out.push({ text: 'Cantidad de Participantes: ', options: { bold: true } })
    out.push({ text: String(c.participantes) })
  }
  return out
}

// ─── Utilidades ──────────────────────────────────────────────────────────────
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function formatearFechaCorta(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return format(date, 'dd/MM/yyyy', { locale: es })
}

export function formatearFechaLargaUpper(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return format(date, "d 'de' MMMM", { locale: es }).toLocaleUpperCase('es')
}

export function formatearAnio(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return format(date, 'yyyy')
}

export function truncate(s: string | null | undefined, max: number): string {
  if (!s) return ''
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

export const DIAS_SEMANA_ABREV = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
