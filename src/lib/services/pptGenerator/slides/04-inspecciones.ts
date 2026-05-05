import type PptxGenJS from 'pptxgenjs'
import { TITULOS } from '../theme'
import { generarSlidesGridFotos } from './_grid-fotos'
import type { PptGenInput } from '../types'

export function generarSlidesInspecciones(
  pres: PptxGenJS,
  input: PptGenInput,
  pageStart: number,
  totalPages: number,
): number {
  return generarSlidesGridFotos(pres, input, 'inspeccion', TITULOS.INSPECCIONES, pageStart, totalPages, false)
}
