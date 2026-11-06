export interface ColumnasArbol {
  showRecursoColumn?: boolean
  showResponsableColumn?: boolean
  showPesoColumn?: boolean
  /** Columna "#" (N° de fila como el ID de MS Project) — fechas más anchas para "12FC+5d". */
  showNumeroColumn?: boolean
}

/** Anchos de columna del árbol: los comparten la cabecera y cada fila (TreeNode). */
export function columnasArbol({ showRecursoColumn, showResponsableColumn, showPesoColumn, showNumeroColumn }: ColumnasArbol): string {
  return [
    ...(showNumeroColumn ? ['36px'] : []),
    '1fr', '80px', '65px', showNumeroColumn ? '160px' : '120px', '55px', '55px', '55px',
    ...(showPesoColumn ? ['60px', '60px'] : []),
    ...(showRecursoColumn ? ['100px'] : []),
    ...(showResponsableColumn ? ['100px'] : []),
    '28px',
  ].join(' ')
}

export function TreeHeader(props: ColumnasArbol) {
  const { showRecursoColumn, showResponsableColumn, showPesoColumn, showNumeroColumn } = props
  return (
    <div
      className="sticky top-0 z-20 grid items-center gap-1 px-2 py-1.5 bg-gray-50 border-b shadow-sm text-[10px] font-medium text-gray-500 uppercase tracking-wider"
      style={{ gridTemplateColumns: columnasArbol(props) }}
    >
      {showNumeroColumn && <div className="text-right pr-1" title="N° de fila, como el ID de MS Project. Las predecesoras se muestran con este número (12FC+5d).">#</div>}
      <div>Nombre</div>
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
