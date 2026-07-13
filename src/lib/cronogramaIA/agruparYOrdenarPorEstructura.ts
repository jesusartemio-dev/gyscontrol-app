/**
 * Puro — sin fechas, ids ni acceso a datos. Deliberadamente en su propio
 * módulo, SIN importar nada de construirEstructuraReal.ts (que trae
 * calendarioLaboral.ts -> prisma.ts -> el driver `pg`, con dependencias de
 * Node como `fs`/`net`/`tls` que rompen el build cuando este código se
 * importa desde un componente cliente, ej. CronogramaPlanificacionWizard).
 */
import type { ActividadPropuesta } from '@/types/cronogramaIA'

/** Lo mínimo que agruparYOrdenarPorEstructura necesita de un EDT — EdtCatalogoInfo (construirEstructuraReal.ts) lo satisface, y también un objeto liviano sin id/descripcionEdt (ver el preview del Paso 2 del wizard). */
export interface InfoOrdenEdt {
  nombre: string
  faseNombre: string
  faseOrden: number
  edtOrden: number
}

/** Un EDT del catálogo real (con su Fase/orden ya resueltos) junto con las Actividades que le tocaron, en su orden natural de llegada. */
export interface GrupoEdtOrdenado<T extends InfoOrdenEdt = InfoOrdenEdt> {
  edtInfo: T
  actividades: ActividadPropuesta[]
}

export interface ResultadoOrdenEstructura<T extends InfoOrdenEdt = InfoOrdenEdt> {
  gruposOrdenados: GrupoEdtOrdenado<T>[]
  advertencias: string[]
}

/**
 * Agrupa `actividades` por EDT y las ordena en el orden final del
 * cronograma: Fase (por faseOrden) -> EDT dentro de la Fase (por edtOrden,
 * el mismo campo con drag&drop del catálogo) -> Actividades en su orden de
 * llegada dentro del EDT (orden natural: GES por tag fijo, esquema elegido
 * de CON/PRO, captura de tableros/PLCs...). Única fuente de verdad de este
 * criterio — la usa tanto `construirEstructuraReal` (aplicar de verdad,
 * con fechas/horas) como el preview del Paso 2 del wizard (mismo orden,
 * sin fechas ni ids) — nunca se duplica el criterio en dos lugares. Genérica
 * sobre `T` (mínimo `InfoOrdenEdt`) para que el wizard no tenga que fabricar
 * un `EdtCatalogoInfo` completo con campos (id/descripcionEdt) que no tiene.
 */
export function agruparYOrdenarPorEstructura<T extends InfoOrdenEdt>(
  actividades: ActividadPropuesta[],
  edtsCatalogo: Map<string, T>
): ResultadoOrdenEstructura<T> {
  const advertencias: string[] = []

  const porEdt = new Map<string, ActividadPropuesta[]>()
  for (const a of actividades) {
    if (!porEdt.has(a.edtNombre)) porEdt.set(a.edtNombre, [])
    porEdt.get(a.edtNombre)!.push(a)
  }

  const edtsOrdenados: T[] = []
  for (const edtNombre of porEdt.keys()) {
    const info = edtsCatalogo.get(edtNombre)
    if (!info) {
      advertencias.push(`EDT "${edtNombre}" no se encontró en el catálogo real — se omitió del cronograma.`)
      continue
    }
    edtsOrdenados.push(info)
  }

  const fasesUnicas = new Map<string, { nombre: string; orden: number }>()
  for (const e of edtsOrdenados) {
    if (!fasesUnicas.has(e.faseNombre)) fasesUnicas.set(e.faseNombre, { nombre: e.faseNombre, orden: e.faseOrden })
  }
  const fasesEnOrden = Array.from(fasesUnicas.values()).sort((a, b) => a.orden - b.orden)

  const gruposOrdenados: GrupoEdtOrdenado<T>[] = []
  for (const faseInfo of fasesEnOrden) {
    // Orden real del catálogo (Edt.orden) — NUNCA el orden de llegada del
    // array `actividades`, que no refleja secuencia constructiva alguna.
    const edtsDeFase = edtsOrdenados.filter(e => e.faseNombre === faseInfo.nombre).sort((a, b) => a.edtOrden - b.edtOrden)
    for (const edtInfo of edtsDeFase) {
      gruposOrdenados.push({ edtInfo, actividades: porEdt.get(edtInfo.nombre) ?? [] })
    }
  }

  return { gruposOrdenados, advertencias }
}
