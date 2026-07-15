import { prisma } from '@/lib/prisma'
import type { CatalogoImagenParaPrompt } from './prompts/alcanceDetallado'
import type { SugerenciaImagenIA } from './generarAlcanceDetallado'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

/** Catálogo activo, en el shape exacto que espera el prompt de la IA (Bloque 4.2 sesión 4). */
export async function obtenerCatalogoImagenesActivo(): Promise<CatalogoImagenParaPrompt[]> {
  return prisma.catalogoImagen.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, categoria: true, keywords: true },
  })
}

/**
 * Adjunta automáticamente las imágenes de catálogo que la IA propuso por
 * tarea (Bloque 4.2 sesión 4), creando PlanTrabajoImagen con origen
 * 'IA_AUTO' — mismo camino que el picker manual "Desde biblioteca"
 * (referencia el driveFileId del catálogo, nunca duplica el archivo).
 *
 * Reglas:
 * - Si la tarea ya tiene alguna imagen que NO sea IA_AUTO (MANUAL o
 *   CONFIRMADA), se omite por completo — nunca se pisa una decisión humana.
 * - Si la tarea solo tenía IA_AUTO de una generación anterior, se
 *   RECALCULA: se borran las anteriores y se crean las nuevas.
 * - Cualquier catalogoImagenId que el usuario rechazó explícitamente para
 *   esa tarea (`catalogoImagenesRechazadas`, ya reconciliado por
 *   preservarEstadoManualTareas) se descarta y no vuelve a proponerse.
 */
export async function aplicarSugerenciasImagenesIA(
  planId: string,
  userId: string,
  sugerencias: SugerenciaImagenIA[],
  estructura: PlanAlcanceDetalladoEdt[]
): Promise<void> {
  if (sugerencias.length === 0) return

  const rechazosPorTarea = new Map<string, Set<string>>()
  for (const edt of estructura) {
    for (const s of edt.subItems ?? []) {
      for (const t of s.tareas ?? []) {
        if (t.tareaRefId && t.catalogoImagenesRechazadas?.length) {
          rechazosPorTarea.set(t.tareaRefId, new Set(t.catalogoImagenesRechazadas))
        }
      }
    }
  }

  for (const { edtRef, tareaRef, catalogoImagenIds } of sugerencias) {
    const existentes = await prisma.planTrabajoImagen.findMany({
      where: { planTrabajoId: planId, tareaRef },
    })
    const tieneManualOConfirmada = existentes.some(img => img.origen !== 'IA_AUTO')
    if (tieneManualOConfirmada) continue // nunca pisar una decisión humana

    if (existentes.length > 0) {
      await prisma.planTrabajoImagen.deleteMany({ where: { id: { in: existentes.map(e => e.id) } } })
    }

    const rechazadas = rechazosPorTarea.get(tareaRef) ?? new Set<string>()
    const idsAAdjuntar = catalogoImagenIds.filter(id => !rechazadas.has(id)).slice(0, 2)
    if (idsAAdjuntar.length === 0) continue

    // Segunda pasada de validación anti-alucinación: solo catálogo activo real.
    const catalogoImagenes = await prisma.catalogoImagen.findMany({
      where: { id: { in: idsAAdjuntar }, activo: true },
    })

    for (const [orden, catImg] of catalogoImagenes.entries()) {
      await prisma.planTrabajoImagen.create({
        data: {
          planTrabajoId: planId,
          edtRef,
          subItemRef: null,
          tareaRef,
          catalogoImagenId: catImg.id,
          nombreArchivo: catImg.nombre,
          urlArchivo: '',
          driveFileId: catImg.driveFileId,
          tipoArchivo: null,
          tamano: null,
          caption: catImg.nombre,
          orden,
          origen: 'IA_AUTO',
          createdById: userId,
        },
      })
    }
  }
}
