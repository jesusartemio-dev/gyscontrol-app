import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'
import type { PlanTrabajoImagen } from '@prisma/client'

/**
 * Recorre el alcance detallado en el MISMO orden que la plantilla docx
 * renderiza las imágenes (tareas → imagenesSubItem → imagenes de EDT, EDT
 * tras EDT) y asigna un número de figura correlativo global — compartida por
 * `construirDataBag.ts` (export) y `AlcanceDetalladoView.tsx` (preview), así
 * el número que ve el usuario en la app es SIEMPRE el mismo que sale en el
 * docx. Las tareas excluidas del plan (Bloque 4.2 sesión 3) no consumen
 * número, igual que en el export.
 */
export function calcularNumerosDeFigura(
  alcanceDetallado: PlanAlcanceDetalladoEdt[],
  imagenes: PlanTrabajoImagen[]
): Map<string, number> {
  const numeros = new Map<string, number>()
  let n = 0

  const imagenesDeNodo = (edtRef: string, subItemRef: string | undefined, tareaRef: string | undefined) =>
    imagenes
      .filter(img => {
        if (img.edtRef !== edtRef) return false
        if (tareaRef) return img.tareaRef === tareaRef
        return !img.tareaRef && (img.subItemRef ?? undefined) === subItemRef
      })
      .sort((a, b) => a.orden - b.orden)

  for (const edt of alcanceDetallado) {
    if (!edt.edtRefId) continue
    for (const sub of edt.subItems ?? []) {
      for (const tarea of (sub.tareas ?? []).filter(t => !t.excluida)) {
        if (!tarea.tareaRefId) continue
        for (const img of imagenesDeNodo(edt.edtRefId, undefined, tarea.tareaRefId)) {
          n += 1
          numeros.set(img.id, n)
        }
      }
      if (sub.actividadRefId) {
        for (const img of imagenesDeNodo(edt.edtRefId, sub.actividadRefId, undefined)) {
          n += 1
          numeros.set(img.id, n)
        }
      }
    }
    for (const img of imagenesDeNodo(edt.edtRefId, undefined, undefined)) {
      n += 1
      numeros.set(img.id, n)
    }
  }

  return numeros
}
