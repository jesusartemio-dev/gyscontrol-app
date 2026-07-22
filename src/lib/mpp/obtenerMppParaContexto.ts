import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'
import { convertirXlsxATexto } from '@/lib/iperc/convertirXlsxATexto'

/**
 * Devuelve el texto de la MPP revisada (V2, subida a mano — ver
 * mpp/subir-version) para usar como contexto AUTORITATIVO en otros
 * generadores de IA (hoy PETS). El esqueleto (qué EPP existen en el
 * catálogo) sigue viniendo de `MppItem`; esto solo aporta las asignaciones
 * EPP↔puesto ya revisadas, por si difieren.
 * '' si no hay MPP, no hay V2 vigente, o falla la descarga/conversión — el
 * caller sigue funcionando con los items estructurados (nunca bloquea).
 */
export async function obtenerMppParaContexto(proyectoId: string): Promise<string> {
  const mpp = await prisma.mpp.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!mpp) return ''

  const v2 = await prisma.mppVersionArchivo.findFirst({
    where: { mppId: mpp.id, origen: 'IMPORTADO', vigente: true },
    select: { driveFileId: true },
  })
  if (!v2) return ''

  try {
    const { data: buffer } = await getFileContent(v2.driveFileId)
    return convertirXlsxATexto(buffer, 'MATRIZ EPPs') ?? ''
  } catch (e) {
    console.error('[obtenerMppParaContexto] Error descargando la V2 de Drive:', e)
    return ''
  }
}
