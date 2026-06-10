export function TreeHeader({ showRecursoColumn, showResponsableColumn, showPesoColumn }: {
  showRecursoColumn?: boolean
  showResponsableColumn?: boolean
  showPesoColumn?: boolean
}) {
  // Columnas dinámicas (mismas anchuras de siempre). La de Peso solo aparece si showPesoColumn.
  const cols = ['1fr', '80px', '65px', '120px', '55px', '55px']
  if (showPesoColumn) cols.push('55px')
  if (showRecursoColumn) cols.push('100px')
  if (showResponsableColumn) cols.push('100px')
  cols.push('28px')

  return (
    <div
      className="grid items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider"
      style={{ gridTemplateColumns: cols.join(' ') }}
    >
      <div>Nombre</div>
      <div className="text-center">Progreso</div>
      <div className="text-center">Tipo</div>
      <div className="text-center">Fechas</div>
      <div className="text-right pr-1">Dur</div>
      <div className="text-right pr-1">Work</div>
      {showPesoColumn && <div className="text-right pr-1">Peso</div>}
      {showRecursoColumn && <div className="text-center">Recurso</div>}
      {showResponsableColumn && <div className="text-center">Responsable</div>}
      <div></div>
    </div>
  )
}
