import { registrarCreacion } from '@/lib/services/audit'
import type { CargoLabelNoReconocido } from './resolverOrganigrama'

/**
 * Registra, vía el AuditLog genérico, los cargoLabel del organigrama que no
 * matchearon ningún rol conocido (ver resolverOrganigrama.ts). No es un
 * error del usuario ni bloquea nada — es evidencia acumulada de qué
 * sinónimos reales de cargo se usan en producción, para decidir a futuro si
 * conviene estandarizar el organigrama en un catálogo real de roles.
 *
 * Solo se llama desde rutas de escritura con sesión activa (generación de
 * matriz, aplicación de cronograma, POST de re-sincronización) — nunca desde
 * un GET/preview. Nunca bloquea el flujo principal: cualquier fallo queda en
 * log y se descarta.
 */
export async function registrarCargoLabelsNoReconocidos(
  usuarioId: string,
  proyectoId: string,
  noReconocidos: CargoLabelNoReconocido[]
): Promise<void> {
  if (noReconocidos.length === 0) return
  try {
    await Promise.all(
      noReconocidos.map(n =>
        registrarCreacion(
          'PROYECTO_ORG_NODO_CARGO_NO_RECONOCIDO',
          n.nodoId,
          usuarioId,
          `cargoLabel "${n.cargoLabel}" del organigrama no coincide con ningún rol de responsable conocido (src/lib/cronogramaResponsables/resolverOrganigrama.ts)`,
          { proyectoId, cargoLabel: n.cargoLabel }
        )
      )
    )
  } catch (error) {
    console.error('Error al registrar cargoLabels no reconocidos en auditoría:', error)
  }
}
