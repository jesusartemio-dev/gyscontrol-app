import type {
  CronogramaContexto,
  PlanAlcanceDetalladoEdt,
  PlanAlcanceDetalladoSubItem,
  PlanPersonal,
  PlanPersonalRequerido,
} from '@/types/planTrabajo'
import { clasificarTipoEdt } from './raciReglas'
import type { ResultadoCalculo } from './calcularDatos'

/**
 * Estructura de alcanceDetallado — Fase→EDT→subItems armada por SERVIDOR desde
 * el cronograma real, sin IA (Bloque 4, Tarea 1 — informe §6 y cambio #17).
 *
 * Antes la IA decidía numeración, agrupación y nombres de subItems en un único
 * JSON monolítico — causa raíz del bug auditado: subItems con numeración del
 * padre sin incrementar, actividadNombre vacío y descripcion heredada del EDT
 * padre repetida N veces. Ahora el servidor resuelve TODO salvo el texto de
 * `descripcion` (que completa la IA en un segundo paso, ver
 * generarAlcanceDetallado.ts) — la IA no puede alterar numeración ni nombres
 * porque nunca los recibe como algo editable, solo como estructura de contexto.
 */

const CODIGOS_EDT: [RegExp, string][] = [
  [/construc/i, 'CON'],
  [/comision/i, 'CMN'],
  [/montaje|instalac/i, 'CON'],
  [/ingenier/i, 'ING'],
  [/procura/i, 'PROC'],
  [/planific/i, 'PLAN'],
  [/cierre/i, 'CIE'],
]

/** Código corto derivado por regla del nombre del EDT — nunca inventado por IA. */
export function derivarCodigoEdt(nombreEdt: string): string {
  for (const [patron, codigo] of CODIGOS_EDT) {
    if (patron.test(nombreEdt)) return codigo
  }
  return ''
}

function esFaseEjecucion(faseNombre: string): boolean {
  return /ejecuci/i.test(faseNombre)
}

/**
 * "Detalle MÁXIMO": fase EJECUCIÓN + EDT clasificado como campo (CON/CMN).
 * "Detalle MÍNIMO": todo lo demás (Planificación, Ingeniería, Procura, Cierre).
 */
export function esEdtDetallado(faseNombre: string, edtNombre: string): boolean {
  return esFaseEjecucion(faseNombre) && clasificarTipoEdt(edtNombre) === 'campo'
}

const CARGO_CAMPO_PATRON = /t[eé]cnico|residente|supervisor|construcci[oó]n/i

/**
 * personalRequerido — {cantidad, cargo} inferido de personasEstimadas de las
 * tareas del EDT (pico de dotación real del cronograma) + un cargo de campo
 * real del organigrama (no hay dato de asignación persona↔tarea en el schema,
 * así que NO se inventa un desglose por cargo; se reporta el pico de dotación
 * bajo el cargo de campo más relevante disponible).
 */
function calcularPersonalRequerido(
  actividades: { tareas: { personasEstimadas: number }[] }[],
  personal: PlanPersonal[]
): PlanPersonalRequerido[] {
  const maxPersonas = actividades
    .flatMap(a => a.tareas.map(t => t.personasEstimadas ?? 0))
    .reduce((max, n) => Math.max(max, n), 0)
  if (maxPersonas === 0) return []

  const cargoCampo = personal.find(p => CARGO_CAMPO_PATRON.test(p.cargo))?.cargo ?? 'Personal de campo'
  return [{ cantidad: maxPersonas, cargo: cargoCampo }]
}

export function calcularEstructuraAlcanceDetallado(
  cron: NonNullable<CronogramaContexto>,
  personal: PlanPersonal[]
): ResultadoCalculo<PlanAlcanceDetalladoEdt[]> {
  const advertencias: string[] = []
  const estructura: PlanAlcanceDetalladoEdt[] = []
  let contadorEdt = 0

  for (const fase of cron.fases) {
    for (const edt of fase.edts) {
      contadorEdt++
      const numeracionEdt = `11.${contadorEdt}`
      const detallado = esEdtDetallado(fase.nombre, edt.nombre)

      let subItems: PlanAlcanceDetalladoSubItem[] | undefined
      if (detallado || edt.actividades.length > 1) {
        subItems = edt.actividades.map((act, j) => ({
          numeracion: `${numeracionEdt}.${j + 1}`,
          actividadNombre: act.nombre,
          descripcion: '', // la completa la IA — ver generarAlcanceDetallado.ts
          actividadRefId: act.id,
        }))
      }

      estructura.push({
        numeracion: numeracionEdt,
        edtNombre: edt.nombre,
        edtCodigo: derivarCodigoEdt(edt.nombre),
        faseNombre: fase.nombre,
        faseAbreviatura: fase.nombre, // nunca abreviar — informe §4.4 (EJEC/PROC confundía al lector)
        descripcion: '', // la completa la IA
        tipoDetalle: detallado ? 'detallado' : 'resumido',
        subItems,
        personalRequerido: detallado ? calcularPersonalRequerido(edt.actividades, personal) : undefined,
        edtRefId: edt.id,
      })
    }
  }

  if (estructura.length === 0) {
    advertencias.push('El cronograma no tiene EDTs — no se pudo construir la estructura de alcance detallado.')
  }

  return { data: estructura, advertencias }
}
