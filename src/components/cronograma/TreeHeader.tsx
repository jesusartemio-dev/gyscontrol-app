import type React from 'react'

export interface ColumnasArbol {
  showRecursoColumn?: boolean
  showResponsableColumn?: boolean
  showPesoColumn?: boolean
  /** Columna "#" (N° de fila como el ID de MS Project) — fechas más anchas para "12FC+5d". */
  showNumeroColumn?: boolean
  /**
   * Celular con "Ver todas las columnas": nombre de ancho fijo (170 px). En PC
   * el nombre es flexible con un mínimo (ver ANCHO_NOMBRE_MIN).
   */
  nombreFijo?: boolean
}

/** Ancho de "#" (lo usa el `left` del nombre fijo). */
export const ANCHO_NUMERO = 36
export const ANCHO_NOMBRE_FIJO = 170
/**
 * Mínimo del nombre en PC. Con "1fr" a secas, si la pantalla era angosta (p.
 * ej. con el menú lateral abierto) el nombre se quedaba casi en 0 y la flecha,
 * la etiqueta [ACT] y "(4)" se montaban sobre Progreso. Ahora, si no entra,
 * la tabla se desliza a los costados con # y Nombre fijos.
 */
export const ANCHO_NOMBRE_MIN = 220
const GAP = 4
const PADDING = 16

/**
 * Columnas fijas después del nombre: progreso, fechas, dur, work, HH, pesos,
 * recurso, responsable, menú. (TIPO se quitó: la etiqueta [FAS]/[ACT] junto al
 * nombre ya lo dice.)
 */
function columnasFijas({ showRecursoColumn, showResponsableColumn, showPesoColumn, showNumeroColumn }: ColumnasArbol): number[] {
  return [
    80, showNumeroColumn ? 160 : 120, 55, 55, 55,
    ...(showPesoColumn ? [60, 60] : []),
    ...(showRecursoColumn ? [100] : []),
    ...(showResponsableColumn ? [80] : []),
    28,
  ]
}

/** Anchos de columna del árbol: los comparten la cabecera y cada fila (TreeNode). */
export function columnasArbol(props: ColumnasArbol): string {
  return [
    ...(props.showNumeroColumn ? [`${ANCHO_NUMERO}px`] : []),
    props.nombreFijo ? `${ANCHO_NOMBRE_FIJO}px` : `minmax(${ANCHO_NOMBRE_MIN}px, 1fr)`,
    ...columnasFijas(props).map((w) => `${w}px`),
  ].join(' ')
}

/** Ancho mínimo de la tabla: por debajo de esto se desliza a los costados. */
export function anchoMinimoArbol(props: ColumnasArbol): number {
  const fijas = columnasFijas(props)
  const anchos = [...(props.showNumeroColumn ? [ANCHO_NUMERO] : []), props.nombreFijo ? ANCHO_NOMBRE_FIJO : ANCHO_NOMBRE_MIN, ...fijas]
  return anchos.reduce((s, w) => s + w, 0) + GAP * (anchos.length - 1) + PADDING
}

/** Clases/estilo de "#" y Nombre fijos al desplazar (fondo heredado de la fila). */
export function celdaFija(fijo: boolean | undefined, columna: 'numero' | 'nombre', conNumero: boolean) {
  if (!fijo) return { className: '', style: undefined as React.CSSProperties | undefined }
  return {
    className: 'sticky z-[1] bg-inherit',
    style: { left: columna === 'numero' || !conNumero ? 0 : ANCHO_NUMERO + GAP } as React.CSSProperties,
  }
}

export function TreeHeader(props: ColumnasArbol) {
  const { showRecursoColumn, showResponsableColumn, showPesoColumn, showNumeroColumn } = props
  const fijoNum = celdaFija(true, 'numero', !!showNumeroColumn)
  const fijoNom = celdaFija(true, 'nombre', !!showNumeroColumn)
  return (
    <div
      className="sticky top-0 z-20 grid items-center gap-1 px-2 py-1.5 bg-gray-50 border-b shadow-sm text-[10px] font-medium text-gray-500 uppercase tracking-wider"
      style={{ gridTemplateColumns: columnasArbol(props) }}
    >
      {showNumeroColumn && <div className={`text-right pr-1 ${fijoNum.className}`} style={fijoNum.style} title="N° de fila, como el ID de MS Project. Las predecesoras se muestran con este número (12FC+5d).">#</div>}
      <div className={fijoNom.className} style={fijoNom.style}>Nombre</div>
      <div className="text-center">Progreso</div>
      <div className="text-center">Fechas</div>
      <div className="text-right pr-1">Dur</div>
      <div className="text-right pr-1">Work</div>
      <div className="text-right pr-1" title="Horas-hombre real: Work × personas del recurso asignado">HH</div>
      {showPesoColumn && <div className="text-right pr-1">P.Global</div>}
      {showPesoColumn && <div className="text-right pr-1">P.Parcial</div>}
      {showRecursoColumn && <div className="text-center">Recurso</div>}
      {showResponsableColumn && <div className="text-center">Responsable</div>}
      <div></div>
    </div>
  )
}
