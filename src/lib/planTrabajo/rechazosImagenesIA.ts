import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

/**
 * Registra que el usuario RECHAZÓ (quitó) una imagen IA_AUTO de una tarea
 * específica (Bloque 4.2 sesión 4) — se persiste en `catalogoImagenesRechazadas`
 * de esa tarea dentro de `PlanTrabajo.alcanceDetallado`, para que una
 * regeneración posterior (ver preservarEstadoManualTareas) no vuelva a
 * proponer la misma imagen. No hace nada si la tarea no existe en la
 * estructura o si ya estaba registrado el rechazo.
 */
export async function registrarRechazoImagenIA(
  planId: string,
  tareaRef: string,
  catalogoImagenId: string
): Promise<void> {
  const plan = await prisma.planTrabajo.findUnique({
    where: { id: planId },
    select: { alcanceDetallado: true },
  })
  if (!plan?.alcanceDetallado) return

  const estructura = plan.alcanceDetallado as unknown as PlanAlcanceDetalladoEdt[]
  let cambiado = false

  const actualizada = estructura.map(edt => ({
    ...edt,
    subItems: (edt.subItems ?? []).map(s => ({
      ...s,
      tareas: (s.tareas ?? []).map(t => {
        if (t.tareaRefId !== tareaRef) return t
        const rechazadas = new Set(t.catalogoImagenesRechazadas ?? [])
        if (rechazadas.has(catalogoImagenId)) return t
        rechazadas.add(catalogoImagenId)
        cambiado = true
        return { ...t, catalogoImagenesRechazadas: [...rechazadas] }
      }),
    })),
  }))

  if (!cambiado) return

  await prisma.planTrabajo.update({
    where: { id: planId },
    data: { alcanceDetallado: actualizada as unknown as Prisma.InputJsonValue },
  })
}
