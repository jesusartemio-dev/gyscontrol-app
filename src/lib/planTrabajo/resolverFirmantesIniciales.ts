/**
 * Firmantes iniciales de la cabecera (Preparado/Revisado/Aprobado por) —
 * derivados del organigrama del proyecto al crear el Plan de Trabajo, en vez
 * de quedar vacíos o depender del usuario logueado (ver CabeceraEditor.tsx,
 * que ya solo rellena "preparadoPor" con el usuario logueado como fallback
 * cuando este cálculo no encontró a nadie).
 *
 * Mismo criterio que REGLAS_RACI_CARGO (raciReglas.ts) y matchRolPorCargo
 * (cronogramaResponsables/resolverOrganigrama.ts): regex sobre cargoLabel
 * (texto libre, sin catálogo), empate por `orden` ascendente, sin match →
 * no se inventa nada, el campo queda vacío para completar a mano.
 */

interface ReglaFirmante {
  campo: 'preparadoPor' | 'revisadoPor' | 'aprobadoPor'
  patron: RegExp
}

const REGLAS_FIRMANTES: ReglaFirmante[] = [
  { campo: 'preparadoPor', patron: /residente/i },
  { campo: 'revisadoPor', patron: /coordinador.*(ingenier|proyecto)/i },
  { campo: 'aprobadoPor', patron: /gerenc|gerente/i },
]

export interface OrgNodoParaFirmantes {
  id: string
  orden: number
  cargoLabel: string
  user: { name: string | null; email: string } | null
}

export interface FirmantesIniciales {
  preparadoPor: string
  preparadoCargo: string
  revisadoPor: string
  revisadoCargo: string
  aprobadoPor: string
  aprobadoCargo: string
}

/**
 * Resuelve, para el organigrama de UN proyecto, quién ocupa cada uno de los
 * 3 roles fijos de firmante. Si 2+ nodos matchean el mismo rol, gana el de
 * menor `orden` (mismo desempate que resolverOrganigramaProyecto). Nodos sin
 * `user` (vacantes) no participan.
 */
export function resolverFirmantesIniciales(organigrama: OrgNodoParaFirmantes[]): FirmantesIniciales {
  const resultado: FirmantesIniciales = {
    preparadoPor: '',
    preparadoCargo: '',
    revisadoPor: '',
    revisadoCargo: '',
    aprobadoPor: '',
    aprobadoCargo: '',
  }

  for (const regla of REGLAS_FIRMANTES) {
    const candidatos = organigrama.filter(n => n.user !== null && regla.patron.test(n.cargoLabel))
    if (candidatos.length === 0) continue

    const elegido = [...candidatos].sort((a, b) => a.orden - b.orden)[0]
    const nombreKey = regla.campo
    const cargoKey = `${regla.campo.replace('Por', '')}Cargo` as 'preparadoCargo' | 'revisadoCargo' | 'aprobadoCargo'

    resultado[nombreKey] = elegido.user!.name ?? elegido.user!.email
    resultado[cargoKey] = elegido.cargoLabel
  }

  return resultado
}
