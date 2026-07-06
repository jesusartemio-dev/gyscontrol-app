// Labels de nodos de plantilla que se auto-asignan con los roles fijos del proyecto
export const CARGO_LABEL_GESTOR    = ['gestor', 'gestor de proyecto', 'project manager', 'jefe de proyecto']
export const CARGO_LABEL_SUPERVISOR = ['supervisor', 'supervisor de proyecto', 'supervisor de obra']
export const CARGO_LABEL_LIDER     = ['líder', 'lider', 'líder técnico', 'lider técnico', 'residente']
export const CARGO_LABEL_COMERCIAL = ['comercial', 'ejecutivo comercial', 'ejecutivo de ventas', 'account manager']

// Keywords para roles del equipo dinámico (PersonalProyecto)
export const CARGO_LABEL_PERSONAL: Record<string, string[]> = {
  tecnico:     ['técnico', 'tecnico', 'técnico de campo', 'tecnico de campo', 'técnico electricista', 'tecnico electricista', 'técnico mecánico', 'tecnico mecánico'],
  programador: ['programador', 'programador plc', 'programador cnc', 'programador de plc'],
  cadista:     ['cadista', 'dibujante', 'dibujante cad', 'diseñador cad'],
  ingeniero:   ['ingeniero de proyecto', 'ingeniero de campo', 'ingeniero electricista', 'ingeniero mecánico', 'ingeniero residente'],
  coordinador: ['coordinador de campo', 'coordinador de proyecto', 'coordinador técnico'],
  asistente:   ['asistente', 'asistente de proyecto', 'asistente técnico', 'asistente de campo'],
  lider:       ['lider de equipo', 'líder de equipo', 'lider de campo', 'líder de campo'],
}

export function matchCargoConRolProyecto(
  cargoLabel: string,
  rol: 'gestor' | 'supervisor' | 'lider' | 'comercial'
): boolean {
  const lower = cargoLabel.toLowerCase()
  const map = {
    gestor:     CARGO_LABEL_GESTOR,
    supervisor: CARGO_LABEL_SUPERVISOR,
    lider:      CARGO_LABEL_LIDER,
    comercial:  CARGO_LABEL_COMERCIAL,
  }
  return map[rol].some(k => lower.includes(k))
}

// Retorna el rol de PersonalProyecto que mejor matchea el cargoLabel, o null si no hay match
export function matchCargoConRolPersonal(cargoLabel: string): string | null {
  const lower = cargoLabel.toLowerCase()
  for (const [rol, keywords] of Object.entries(CARGO_LABEL_PERSONAL)) {
    if (keywords.some(k => lower.includes(k))) return rol
  }
  return null
}
