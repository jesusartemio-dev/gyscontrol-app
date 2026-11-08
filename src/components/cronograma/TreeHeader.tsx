import type React from 'react'

export interface ColumnasArbol {
  showRecursoColumn?: boolean
  showResponsableColumn?: boolean
  showPesoColumn?: boolean
  /** Columna "#" (N° de fila como el ID de MS Project) — fechas más anchas para "12FC+5d". */
  showNumeroColumn?: boolean
  /**
   * Celular con "Ver todas las columnas": la tabla se desplaza a los costados
   * y "#" + Nombre quedan fijos a la izquierda (como MS Project), con el nombre
   * de ancho fijo (con 1fr se quedaba en 0 px y no se veía ningún nombre).
   */
  nombreFijo?: boolean
}

/** Ancho de "#" y de Nombre cuando quedan fijos (los usa el `left` del sticky). */
export const ANCHO_NUMERO = 36
export const ANCHO_NOMBRE_FIJO = 170

/** Anchos de columna del árbol: los comparten la cabecera y cada fila (TreeNode). */
export function columnasArbol({ showRecursoColumn, showResponsableColumn, showPesoColumn, showNumeroColumn, nombreFijo }: ColumnasArbol): string {
  return [
    ...(showNumeroColumn ? [`${ANCHO_NUMERO}px`] : []),
    nombreFijo ? `${ANCHO_NOMBRE_FIJO}px` : '1fr', '80px', '65px', showNumeroColumn ? '160px' : '120px', '55px', '55px', '55px',
    ...(showPesoColumn ? ['60px', '60px'] : []),
    ...(showRecursoColumn ? ['100px'] : []),
    ...(showResponsableColumn ? ['100px'] : []),
    '28px',
  ].join(' ')
}

/** Clases/estilo de "#" y Nombre fijos al desplazar a los costados (fondo heredado de la fila). */
export function celdaFija(nombreFijo: boolean | undefined, columna: 'numero' | 'nombre', conNumero: boolean) {
  if (!nombreFijo) return { className: '', style: undefined as React.CSSProperties | undefined }
  return {
    className: 'sticky z-[1] bg-inherit',
    style: { left: columna === 'numero' || !conNumero ? 0 : ANCHO_NUMERO + 4 } as React.CSSProperties,
  }
}

export function TreeHeader(props: ColumnasArbol) {
  const { showRecursoColumn, showResponsableColumn, showPesoColumn, showNumeroColumn, nombreFijo } = props
  const fijoNum = celdaFija(nombreFijo, 'numero', !!showNumeroColumn)
  const fijoNom = celdaFija(nombreFijo, 'nombre', !!showNumeroColumn)
  return (
    <div
      className="sticky top-0 z-20 grid items-center gap-1 px-2 py-1.5 bg-gray-50 border-b shadow-sm text-[10px] font-medium text-gray-500 uppercase tracking-wider"
      style={{ gridTemplateColumns: columnasArbol(props) }}
    >
      {showNumeroColumn && <div className={`text-right pr-1 ${fijoNum.className}`} style={fijoNum.style} title="N° de fila, como el ID de MS Project. Las predecesoras se muestran con este número (12FC+5d).">#</div>}
      <div className={fijoNom.className} style={fijoNom.style}>Nombre</div>
      <div className="text-center">Progreso</div>
      <div className="text-center">Tipo</div>
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
