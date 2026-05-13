import { prisma } from '@/lib/prisma'
import { EPP_CATALOGO_SEED } from './catalogos/eppCatalogo'

export async function seedMppEppCatalogo() {
  let creados = 0
  let actualizados = 0

  for (const epp of EPP_CATALOGO_SEED) {
    const existing = await prisma.mppEppCatalogo.findUnique({ where: { orden: epp.orden } })

    if (existing) {
      await prisma.mppEppCatalogo.update({
        where: { orden: epp.orden },
        data: {
          nombre: epp.nombre,
          riesgo: epp.riesgo,
          parteCuerpo: epp.parteCuerpo,
          durabilidad: epp.durabilidad ?? null,
          asignacionesDefault: epp.asignacionesDefault,
        },
      })
      actualizados++
    } else {
      await prisma.mppEppCatalogo.create({
        data: {
          orden: epp.orden,
          nombre: epp.nombre,
          riesgo: epp.riesgo,
          parteCuerpo: epp.parteCuerpo,
          durabilidad: epp.durabilidad ?? null,
          asignacionesDefault: epp.asignacionesDefault,
        },
      })
      creados++
    }
  }

  return { creados, actualizados, total: EPP_CATALOGO_SEED.length }
}
