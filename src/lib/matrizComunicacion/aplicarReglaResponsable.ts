import type { MatrizFilaIA } from './prompt'
import { normalizarTexto } from './utils'
import { calcularRolResponsable } from '@/lib/cronogramaResponsables/reglasResponsable'
import type { ResolucionOrganigrama } from '@/lib/cronogramaResponsables/resolverOrganigrama'

export interface EdtInfoParaRegla {
  /** Código real del catálogo (ej. "CON") — clave de la tabla EDT->rol. */
  codigo: string
}

/**
 * Fuerza el código "R" (Autoriza) en la celda de la persona resuelta por la
 * tabla EDT->rol + organigrama del proyecto, y quita cualquier "R" que el
 * modelo hubiera puesto en otra celda (no debería, ya que el prompt ya no
 * incluye "R" en su vocabulario — esto es un cinturón de seguridad, no la
 * única defensa). El resto de códigos (D/E/S/V) que decidió la IA queda
 * intacto. La IA nunca decide quién es responsable.
 *
 * `edtInfoPorNombre` debe estar indexado por `normalizarTexto(nombre)` (el
 * mismo criterio tolerante a mayúsculas/acentos que usa el resto de este
 * módulo para matchear texto libre de la IA contra EDTs reales).
 */
export function aplicarReglaResponsableAFilas(
  filas: MatrizFilaIA[],
  edtInfoPorNombre: Map<string, EdtInfoParaRegla>,
  organigramaResuelto: ResolucionOrganigrama['porRol'],
  siglaPorUserId: Map<string, string>
): MatrizFilaIA[] {
  return filas.map(f => {
    const info = edtInfoPorNombre.get(normalizarTexto(f.edtNombre))
    const rol = info ? calcularRolResponsable({ edtCodigo: info.codigo }) : null
    const persona = rol ? organigramaResuelto.get(rol) ?? null : null
    const siglaResponsable = persona?.userId ? siglaPorUserId.get(persona.userId) : undefined

    const celdas = f.celdas.map(c => ({ ...c, valor: c.valor.toUpperCase().replace(/R/g, '') || 'D' }))
    if (siglaResponsable) {
      const celda = celdas.find(c => c.siglas === siglaResponsable)
      if (celda) {
        celda.valor = `${celda.valor}R`
      } else {
        celdas.push({ siglas: siglaResponsable, valor: 'R' })
      }
    }
    return { ...f, celdas }
  })
}
