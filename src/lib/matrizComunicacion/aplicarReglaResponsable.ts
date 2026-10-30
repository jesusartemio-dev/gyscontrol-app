import type { MatrizFila } from './tipos'
import { normalizarTexto } from './utils'
import { calcularRolResponsable } from '@/lib/cronogramaResponsables/reglasResponsable'
import type { ResolucionOrganigrama } from '@/lib/cronogramaResponsables/resolverOrganigrama'

export interface EdtInfoParaRegla {
  /** Código real del catálogo (ej. "CON") — clave de la tabla EDT->rol. */
  codigo: string
}

/** Nodo del organigrama, solo lo necesario para subir por la cadena de padres. */
export interface NodoJerarquia {
  id: string
  parentId: string | null
  userId: string | null
}

/**
 * Quién autoriza cuando el responsable del EDT ya es el emisor.
 *
 * Elaborar y aprobar el mismo documento rompe la segregación de funciones: el
 * IPERC lo escribe SSOMA, pero no puede ser quien lo aprueba. En ese caso la
 * autorización sube por el organigrama hasta el primer superior que participe
 * en la matriz y que no sea también emisor en esa fila.
 *
 * Si no hay ningún superior que califique se deja la "R" en el responsable
 * original: una fila sin autorizador sería peor que una con el conflicto, que
 * al menos es visible al revisar.
 */
function resolverAutorizador(
  nodoIdResponsable: string,
  jerarquia: Map<string, NodoJerarquia>,
  siglaPorUserId: Map<string, string>,
  siglasQueEmiten: Set<string>
): string | null {
  let actual = jerarquia.get(nodoIdResponsable)?.parentId ?? null
  const visitados = new Set<string>([nodoIdResponsable])

  while (actual && !visitados.has(actual)) {
    visitados.add(actual)
    const nodo = jerarquia.get(actual)
    if (!nodo) break

    const sigla = nodo.userId ? siglaPorUserId.get(nodo.userId) : undefined
    if (sigla && !siglasQueEmiten.has(sigla)) return sigla

    actual = nodo.parentId
  }

  return null
}

/**
 * Fuerza el código "R" (Autoriza) en la celda de la persona resuelta por la
 * tabla EDT->rol + organigrama del proyecto, y limpia cualquier "R" que venga
 * en otra celda. El resto de códigos (D/E/S/V) sale de `reglasMatriz.ts` y
 * queda intacto: la tabla de reglas dice quién participa, esta función quién
 * autoriza.
 *
 * `edtInfoPorNombre` debe estar indexado por `normalizarTexto(nombre)` (el
 * mismo criterio tolerante a mayúsculas/acentos que usa el resto del módulo).
 */
export function aplicarReglaResponsableAFilas(
  filas: MatrizFila[],
  edtInfoPorNombre: Map<string, EdtInfoParaRegla>,
  organigramaResuelto: ResolucionOrganigrama['porRol'],
  siglaPorUserId: Map<string, string>,
  nodosOrganigrama: NodoJerarquia[] = []
): MatrizFila[] {
  const jerarquia = new Map(nodosOrganigrama.map(n => [n.id, n]))

  return filas.map(f => {
    const info = edtInfoPorNombre.get(normalizarTexto(f.edtNombre))
    const rol = info ? calcularRolResponsable({ edtCodigo: info.codigo }) : null
    const persona = rol ? organigramaResuelto.get(rol) ?? null : null
    const siglaResponsable = persona?.userId ? siglaPorUserId.get(persona.userId) : undefined

    // Celda vacía = la persona no participa en esa comunicación; se respeta.
    const celdas = f.celdas.map(c => ({ ...c, valor: (c.valor ?? '').toUpperCase().replace(/R/g, '') }))

    if (siglaResponsable) {
      const emiteEnEstaFila = celdas.some(c => c.siglas === siglaResponsable && c.valor.includes('E'))

      // El responsable del EDT ya emite acá: la autorización sube por el organigrama
      // para no dejar que alguien apruebe su propio documento.
      const siglaAutoriza = emiteEnEstaFila
        ? resolverAutorizador(
            persona!.nodoId,
            jerarquia,
            siglaPorUserId,
            new Set(celdas.filter(c => c.valor.includes('E')).map(c => c.siglas))
          ) ?? siglaResponsable
        : siglaResponsable

      const celda = celdas.find(c => c.siglas === siglaAutoriza)
      if (celda) {
        celda.valor = `${celda.valor}R`
      } else {
        celdas.push({ siglas: siglaAutoriza, valor: 'R' })
      }
    }
    return { ...f, celdas }
  })
}
