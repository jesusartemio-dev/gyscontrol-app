import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'
import { convertirXlsxATexto } from '@/lib/iperc/convertirXlsxATexto'

/**
 * Devuelve el texto de la matriz IPERC revisada (V2, subida a mano por
 * SSOMA/gestión — ver iperc/subir-version) para usar como contexto
 * AUTORITATIVO en otros generadores de IA (hoy PETS). El esqueleto (qué
 * actividades/tareas cubrir) sigue viniendo de las `IpercFila` estructuradas;
 * esto solo aporta peligros/controles ya revisados, por si difieren.
 * '' si no hay IPERC, no hay V2 vigente, o falla la descarga/conversión — el
 * caller sigue funcionando con las filas estructuradas (nunca bloquea).
 */
export async function obtenerIpercParaContexto(proyectoId: string): Promise<string> {
  const iperc = await prisma.iperc.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!iperc) return ''

  const v2 = await prisma.ipercVersionArchivo.findFirst({
    where: { ipercId: iperc.id, origen: 'IMPORTADO', vigente: true },
    select: { driveFileId: true },
  })
  if (!v2) return ''

  try {
    const { data: buffer } = await getFileContent(v2.driveFileId)
    return convertirXlsxATexto(buffer) ?? ''
  } catch (e) {
    console.error('[obtenerIpercParaContexto] Error descargando la V2 de Drive:', e)
    return ''
  }
}
