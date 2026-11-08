// Ediciones manuales del Plan de Trabajo: qué secciones se editaron a mano
// desde que la IA o el cálculo las escribieron por última vez. Sirve para
// avisar (y respetar, si el usuario quiere) antes de regenerar.
//
//  - Se marca al guardar una sección desde su editor (PATCH /plan-trabajo).
//  - Se limpia cuando la IA o el cálculo vuelven a escribir esa sección.
//  - El Alcance Detallado no se marca aquí: cada texto editado lleva su propia
//    marca dentro del JSON (descripcionEditadaManualmente / textoEditadoManualmente)
//    y la regeneración ya lo respeta nodo a nodo.

import type { PlanAlcanceDetalladoEdt, SeccionRegenerable } from '@/types/planTrabajo'

export interface EdicionManual {
  /** ISO */
  fecha: string
  por: string
}
export type SeccionesEditadas = Partial<Record<SeccionRegenerable, EdicionManual>>

/** Secciones que se marcan al editarse a mano (todas menos Alcance Detallado y Responsabilidades, que no se regenera). */
export const SECCIONES_CON_MARCA: readonly SeccionRegenerable[] = [
  'objetivo', 'alcanceGeneral', 'eppRequeridos', 'herramientasYEquipos', 'restricciones',
  'personalAsignado', 'matrizRaci', 'histogramas', 'cronogramaResumen', 'referencias',
]

export const NOMBRE_SECCION: Record<SeccionRegenerable, string> = {
  objetivo: 'Objetivo del Proyecto',
  alcanceGeneral: 'Alcance General',
  alcanceDetallado: 'Alcance Detallado',
  eppRequeridos: 'EPP Requeridos',
  herramientasYEquipos: 'Herramientas y Equipos',
  restricciones: 'Restricciones',
  personalAsignado: 'Personal Asignado',
  matrizRaci: 'Matriz RACI',
  histogramas: 'Histogramas',
  cronogramaResumen: 'Cronograma Resumen',
  responsabilidades: 'Responsabilidades',
  referencias: 'Referencias',
}

export function leerEdiciones(valor: unknown): SeccionesEditadas {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as SeccionesEditadas) : {}
}

/** Marca como editadas a mano las secciones guardadas desde el editor. */
export function marcarEditadas(actual: unknown, secciones: string[], por: string): SeccionesEditadas {
  const r = { ...leerEdiciones(actual) }
  const fecha = new Date().toISOString()
  for (const s of secciones) {
    if ((SECCIONES_CON_MARCA as readonly string[]).includes(s)) r[s as SeccionRegenerable] = { fecha, por }
  }
  return r
}

/** Quita la marca de las secciones que la IA o el cálculo acaban de reescribir. */
export function limpiarEditadas(actual: unknown, secciones: string[]): SeccionesEditadas {
  const r = { ...leerEdiciones(actual) }
  for (const s of secciones) delete r[s as SeccionRegenerable]
  return r
}

/** Textos del Alcance Detallado editados a mano (EDT, actividad o viñeta de tarea): se respetan al regenerar. */
export function contarTextosEditadosAlcance(alcance: unknown): number {
  if (!Array.isArray(alcance)) return 0
  let n = 0
  for (const edt of alcance as PlanAlcanceDetalladoEdt[]) {
    if (edt.descripcionEditadaManualmente) n++
    for (const s of edt.subItems ?? []) {
      if (s.descripcionEditadaManualmente) n++
      for (const t of s.tareas ?? []) if (t.textoEditadoManualmente) n++
    }
  }
  return n
}
