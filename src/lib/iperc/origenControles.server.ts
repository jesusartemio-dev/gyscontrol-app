import { prisma } from '@/lib/prisma'
import { normalizarTextoControl } from './origenControles'

/** Consulta exclusiva del servidor; las utilidades compartidas no cargan Prisma. */
export async function textosDelCatalogo(): Promise<Set<string>> {
  try {
    const filas = await prisma.ipercCatalogoControl.findMany({
      where: { activo: true },
      select: { texto: true },
    })
    return new Set(filas.map(f => normalizarTextoControl(f.texto)))
  } catch {
    return new Set()
  }
}
