import { prisma } from '@/lib/prisma'
import { EPP_CATALOGO_SEED } from './catalogos/eppCatalogo'

export async function seedMppEppCatalogo() {
  let creados = 0
  let actualizados = 0

  for (const epp of EPP_CATALOGO_SEED) {
    const existing = await prisma.mppEppCatalogo.findUnique({ where: { codigo: epp.codigo } })

    if (existing) {
      await prisma.mppEppCatalogo.update({
        where: { codigo: epp.codigo },
        data: {
          nombre: epp.nombre,
          categoria: epp.categoria,
          unidad: epp.unidad,
          descripcion: epp.descripcion ?? '',
          asignacionesDefault: epp.asignacionesDefault,
        },
      })
      actualizados++
    } else {
      await prisma.mppEppCatalogo.create({
        data: {
          codigo: epp.codigo,
          nombre: epp.nombre,
          categoria: epp.categoria,
          unidad: epp.unidad,
          descripcion: epp.descripcion ?? '',
          asignacionesDefault: epp.asignacionesDefault,
        },
      })
      creados++
    }
  }

  return { creados, actualizados, total: EPP_CATALOGO_SEED.length }
}
