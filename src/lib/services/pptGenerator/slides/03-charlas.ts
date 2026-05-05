import type PptxGenJS from 'pptxgenjs'
import { TITULOS } from '../theme'
import { generarSlidesGridFotos } from './_grid-fotos'
import type { PptGenInput } from '../types'

export function generarSlidesCharlas(
  pres: PptxGenJS,
  input: PptGenInput,
  pageStart: number,
  totalPages: number,
): number {
  return generarSlidesGridFotos(pres, input, 'charla', TITULOS.CHARLAS, pageStart, totalPages, true)
}
