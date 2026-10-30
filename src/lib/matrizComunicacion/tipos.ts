/**
 * Forma de una fila de la Matriz de Comunicaciones.
 *
 * Reemplaza a `prompt.ts`, que además de estos tipos guardaba el prompt con el
 * que un modelo armaba la matriz. Esa generación se cambió por tablas de reglas
 * (ver `reglasMatriz.ts`), así que el prompt quedó sin uso y los tipos perdieron
 * el sufijo "IA": las filas ya no vienen de un modelo.
 */

export interface CeldaMatriz {
  siglas: string
  /** D=Destinatario E=Emisor S=Soporte V=Valida R=Autoriza. Vacío = no participa. */
  valor: string
}

export interface MatrizFila {
  orden: number
  edtNombre: string
  frecuencia: string
  medio: string
  celdas: CeldaMatriz[]
}
