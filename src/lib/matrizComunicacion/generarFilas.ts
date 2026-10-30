import type { MatrizFila } from './tipos'
import { obtenerReglaEdt } from './reglasMatriz'
import type { CodigoParticipacion, ReglaEdt } from './reglasMatriz'

/**
 * Arma las filas de la matriz desde la tabla de reglas, sin IA.
 *
 * La matriz no es un texto a redactar: las filas salen del catálogo de EDTs,
 * las columnas del organigrama y las celdas de reglas de negocio fijas. Pasarla
 * por un modelo la volvía no reproducible y le hacía inventar participaciones
 * por parecido entre el nombre del EDT y la heurística del prompt.
 */

export interface EdtParaMatriz {
  /** Nombre descriptivo tal como aparece en el proyecto ("Construcción"). */
  nombre: string
  /** Nombre del catálogo, que hace de código ("CON"). */
  codigo: string
  orden: number
}

export interface ParticipanteMatriz {
  siglas: string
  /**
   * TODOS los puestos que ocupa en el organigrama. Una persona puede ocupar
   * varios nodos — Jesús Mamani es Gerencia de Proyectos y Supervisor de
   * Proyecto a la vez — y quedarse con uno solo le quitaba participaciones:
   * la regla de Documentos de Ingeniería lo nombra como Supervisor de Proyecto,
   * pero la fila se construía con el otro puesto y la celda salía vacía.
   */
  puestos: string[]
  /** true = contacto del cliente, se rige por `regla.cliente`. */
  esCliente: boolean
}

/** Primer código no vacío entre los puestos de la persona. */
function codigoDe(puestos: string[], participacion: ReglaEdt['participacion']): CodigoParticipacion {
  for (const puesto of puestos) {
    const codigo = participacion[puesto]
    if (codigo) return codigo
  }
  return ''
}

export interface ResultadoGeneracion {
  filas: MatrizFila[]
  /** EDTs sin regla: su fila sale vacía en vez de inventarse. */
  edtsSinRegla: string[]
}

export function generarFilasMatriz(
  edts: EdtParaMatriz[],
  participantes: ParticipanteMatriz[]
): ResultadoGeneracion {
  const edtsSinRegla: string[] = []

  const filas = edts.map((edt, indice) => {
    const regla = obtenerReglaEdt(edt.codigo)

    if (!regla) {
      // Fail-safe deliberado: sin regla no se adivina. La fila queda vacía y
      // visible para que alguien la complete o agregue el EDT a la tabla.
      edtsSinRegla.push(`${edt.codigo} (${edt.nombre})`)
      return {
        orden: edt.orden ?? indice + 1,
        edtNombre: edt.nombre,
        frecuencia: '',
        medio: '',
        celdas: participantes.map(p => ({ siglas: p.siglas, valor: '' })),
      }
    }

    const celdas = participantes.map(p => ({
      siglas: p.siglas,
      valor: p.esCliente ? regla.cliente : codigoDe(p.puestos, regla.participacion),
    }))

    return {
      orden: edt.orden ?? indice + 1,
      edtNombre: edt.nombre,
      frecuencia: regla.frecuencia,
      medio: regla.medio,
      celdas,
    }
  })

  return { filas, edtsSinRegla }
}
