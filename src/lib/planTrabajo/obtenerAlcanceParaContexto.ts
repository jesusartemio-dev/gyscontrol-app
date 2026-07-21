import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'
import { extraerAlcanceDeDocx } from '@/lib/planTrabajo/extraerAlcanceDeDocx'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

function serializarAlcanceEstructurado(edts: PlanAlcanceDetalladoEdt[]): string {
  const lineas: string[] = []
  for (const edt of edts) {
    lineas.push(`${edt.numeracion} ${edt.edtNombre}`.trim())
    if (edt.descripcion) lineas.push(edt.descripcion)
    for (const sub of edt.subItems ?? []) {
      lineas.push(`${sub.numeracion} ${sub.actividadNombre}`.trim())
      if (sub.descripcion) lineas.push(sub.descripcion)
      for (const tarea of sub.tareas ?? []) {
        if (tarea.excluida) continue
        lineas.push(`- ${tarea.texto || tarea.nombre}`)
      }
    }
  }
  return lineas.join('\n').trim()
}

/**
 * Devuelve el texto del alcance del Plan de Trabajo para usar como contexto
 * rico en generadores de IA (hoy IPERC, ver generarConIa.ts). Precedencia:
 * 1) la sección "ALCANCE DEL SERVICIO" del DOCX de la versión V2 vigente
 *    (origen='IMPORTADO') — es la revisada/corregida a mano, la preferida.
 * 2) si no hay V2 (o no se pudo extraer), el `alcanceDetallado` estructurado
 *    de la app — el mismo contenido, sin revisar a mano.
 * 3) '' si no hay Plan de Trabajo o no tiene alcance — el caller sigue
 *    funcionando sin este contexto (nunca bloquea).
 */
export async function obtenerAlcanceParaContexto(proyectoId: string): Promise<string> {
  const plan = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
    select: { id: true, alcanceDetallado: true },
  })
  if (!plan) return ''

  const v2 = await prisma.planTrabajoGeneracion.findFirst({
    where: { planTrabajoId: plan.id, origen: 'IMPORTADO', vigente: true },
    select: { driveFileId: true },
  })

  if (v2) {
    try {
      const { data: buffer } = await getFileContent(v2.driveFileId)
      const texto = extraerAlcanceDeDocx(buffer)
      if (texto) return texto
    } catch (e) {
      console.error('[obtenerAlcanceParaContexto] Error descargando la V2 de Drive (cae al alcance estructurado):', e)
    }
  }

  const alcanceDetallado = (plan.alcanceDetallado as unknown as PlanAlcanceDetalladoEdt[] | null) ?? []
  return serializarAlcanceEstructurado(alcanceDetallado)
}
