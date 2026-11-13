// ===================================================
// 📁 filasFijas.ts
// 📌 Las filas que no pasan por la IA porque ya están escritas.
//
// Movilización a planta, vigilancia COVID/dengue, orden y limpieza,
// desplazamiento en planta, izaje, bloqueo de energía y el cierre: son las
// mismas en todo trabajo y el SSOMA ya las tiene redactadas. Pedírselas a la
// IA sería hacer que invente lo que la empresa ya decidió.
//
// Ninguna de nuestras IPERC generadas las tenía: todas arrancaban directo en
// construcción, mientras el IPERC real de CJM50 abre con nueve de estas.
// ===================================================

import { prisma } from '@/lib/prisma'
import { claveLinea } from '@/lib/iperc/construirEstructura'
import { calcularResidual, normalizarControl, itemsDeControl } from '@/lib/iperc/riesgoResidual'
import { CAMPOS_CONTROL } from '@/lib/iperc/origenControles'

/**
 * Deja en el IPERC las filas de las actividades fijas que estén en su
 * estructura, sin tocar las que ya están.
 *
 * Es idempotente: una fila se reconoce por proceso + actividad + tarea +
 * peligro, así que se puede llamar antes de cada bloque sin duplicar nada.
 * Devuelve cuántas agregó.
 */
export async function asegurarFilasFijas(ipercId: string): Promise<number> {
  const items = await prisma.ipercEstructuraItem.findMany({
    where: { ipercId, origen: 'fija' },
    orderBy: { orden: 'asc' },
    select: { id: true, proceso: true, actividad: true, tarea: true },
  })
  if (items.length === 0) return 0

  const [catalogo, existentes, ultima] = await Promise.all([
    prisma.ipercCatalogoActividadFija.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    }),
    prisma.ipercFila.findMany({
      where: { ipercId },
      select: { proceso: true, actividad: true, tarea: true, peligro: true },
    }),
    prisma.ipercFila.findFirst({
      where: { ipercId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    }),
  ])

  const clave = (x: { proceso: string; actividad: string; tarea: string; peligro: string }) =>
    `${claveLinea(x)}||${x.peligro.trim()}`
  const yaEstan = new Set(existentes.map(clave))

  // El grupo se identifica por la tarea; una tarea puede traer varios peligros.
  const porTarea = new Map<string, typeof catalogo>()
  for (const c of catalogo) {
    const k = claveLinea(c)
    if (!porTarea.has(k)) porTarea.set(k, [])
    porTarea.get(k)!.push(c)
  }

  let numero = (ultima?.numero ?? 0) + 1
  const nuevas: Array<Parameters<typeof prisma.ipercFila.create>[0]['data']> = []
  const itemsConFilas: string[] = []

  for (const item of items) {
    const grupo = porTarea.get(claveLinea(item)) ?? []
    let agregadasDelItem = 0

    for (const c of grupo) {
      if (yaEstan.has(clave(c))) continue

      // Todo lo de estas filas viene del catálogo de la empresa: nada de esto
      // lo escribió la IA, y así tiene que verse al revisarlo.
      const origenControles = Object.fromEntries(
        CAMPOS_CONTROL.map(campo => [
          campo,
          itemsDeControl(c[campo]).map(texto => ({ texto, origen: 'catalogo' as const })),
        ]),
      )

      // El residual lo manda la regla del SSOMA, no el catálogo: así estas
      // filas se valoran con el mismo criterio que las demás.
      const residual = calcularResidual(
        c.severidad, c.probabilidad, c.controlIngenieria, c.controlAdministrativo,
      )

      nuevas.push({
        ipercId,
        numero: numero++,
        proceso: c.proceso,
        actividad: c.actividad,
        tarea: c.tarea,
        puestoTrabajo: c.puestoTrabajo,
        factorRiesgo: c.factorRiesgo,
        condicionActividad: c.condicionActividad,
        peligro: c.peligro,
        riesgo: c.riesgo,
        consecuencia: c.consecuencia,
        severidad: c.severidad,
        probabilidad: c.probabilidad,
        eliminar: c.eliminar,
        sustituir: c.sustituir,
        controlIngenieria: normalizarControl(c.controlIngenieria),
        controlAdministrativo: normalizarControl(c.controlAdministrativo),
        controlReceptor: normalizarControl(c.controlReceptor),
        severidadResidual: residual.severidadResidual,
        probabilidadResidual: residual.probabilidadResidual,
        accionesMejora: c.accionesMejora,
        responsables: c.responsables,
        origenControles,
        updatedAt: new Date(),
      })
      yaEstan.add(clave(c))
      agregadasDelItem++
    }

    if (agregadasDelItem > 0 || grupo.length > 0) itemsConFilas.push(item.id)
  }

  if (nuevas.length === 0) return 0

  await prisma.$transaction([
    ...nuevas.map(data => prisma.ipercFila.create({ data })),
    prisma.ipercEstructuraItem.updateMany({
      where: { id: { in: itemsConFilas } },
      data: { estado: 'generada' },
    }),
  ])

  // filasGeneradas no se puede fijar en el updateMany de arriba porque cada
  // item tiene las suyas.
  for (const item of items) {
    const n = await prisma.ipercFila.count({
      where: { ipercId, proceso: item.proceso, actividad: item.actividad, tarea: item.tarea },
    })
    if (n > 0) {
      await prisma.ipercEstructuraItem.update({
        where: { id: item.id },
        data: { filasGeneradas: n, estado: 'generada' },
      })
    }
  }

  return nuevas.length
}
