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
