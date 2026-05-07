// Nodos corporativos GYS que aparecen en TODOS los organigramas de proyecto.
// Se crean con esFijoGys: true y no pueden eliminarse desde la UI del proyecto.
// Los userId se resuelven en la API buscando por email.

export interface NodoGysDefinicion {
  cargoLabel: string
  email: string
  orden: number
  parentLabel: string | null
}

export const NODOS_FIJOS_GYS: NodoGysDefinicion[] = [
  {
    cargoLabel: 'GERENCIA GENERAL',
    email: 'carlos.s@gyscontrol.com',
    orden: 0,
    parentLabel: null,
  },
  {
    cargoLabel: 'COMERCIAL',
    email: 'miguel.c@gyscontrol.com',
    orden: 0,
    parentLabel: 'GERENCIA GENERAL',
  },
  {
    cargoLabel: 'GERENCIA DE PROYECTOS',
    email: 'jesus.m@gyscontrol.com',
    orden: 1,
    parentLabel: 'GERENCIA GENERAL',
  },
  {
    cargoLabel: 'HSEQ',
    email: 'yony.a@gyscontrol.com',
    orden: 2,
    parentLabel: 'GERENCIA GENERAL',
  },
]

// Labels de nodos de plantilla que se auto-asignan con los roles fijos del proyecto
export const CARGO_LABEL_GESTOR = ['gestor', 'gestor de proyecto', 'project manager', 'jefe de proyecto']
export const CARGO_LABEL_SUPERVISOR = ['supervisor', 'supervisor de proyecto', 'supervisor de obra']
export const CARGO_LABEL_LIDER = ['líder', 'lider', 'líder técnico', 'lider técnico', 'residente']

export function matchCargoConRolProyecto(
  cargoLabel: string,
  rol: 'gestor' | 'supervisor' | 'lider'
): boolean {
  const lower = cargoLabel.toLowerCase()
  const map = {
    gestor: CARGO_LABEL_GESTOR,
    supervisor: CARGO_LABEL_SUPERVISOR,
    lider: CARGO_LABEL_LIDER,
  }
  return map[rol].some(k => lower.includes(k))
}
