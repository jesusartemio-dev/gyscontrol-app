/**
 * Orden jerárquico del equipo GYS para la tabla de contactos del Word (y, por
 * compartir el mismo roster, las columnas de responsabilidad de la matriz):
 * Gerencia de Proyectos > Gestor > Residente > Supervisor > resto (orden de
 * llegada para empates). El contacto del CLIENTE se antepone aparte, en cada
 * llamador — siempre va primero en la tabla, así es el formato real del
 * entregable (el contacto del cliente encabeza, no el equipo GYS).
 */
const RX_GERENCIA_PROYECTOS = /(gerenc|gerente).*proyecto/i
const RX_GESTOR = /gestor/i
const RX_RESIDENTE = /residente/i
const RX_SUPERVISOR = /supervisor/i

function rangoCargo(cargoLabel: string): number {
  if (RX_GERENCIA_PROYECTOS.test(cargoLabel)) return 0
  if (RX_GESTOR.test(cargoLabel)) return 1
  if (RX_RESIDENTE.test(cargoLabel)) return 2
  if (RX_SUPERVISOR.test(cargoLabel)) return 3
  return 4
}

/** Orden estable (Array.sort ya lo es en motores modernos, pero el índice explícito lo deja a prueba de motor). */
export function ordenarPorJerarquiaCargo<T extends { cargo: string }>(personas: T[]): T[] {
  return personas
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rangoCargo(a.p.cargo) - rangoCargo(b.p.cargo) || a.i - b.i)
    .map(({ p }) => p)
}
