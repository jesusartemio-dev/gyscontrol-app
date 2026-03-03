export function TreeHeader({ showRecursoColumn, showResponsableColumn }: {
  showRecursoColumn?: boolean
  showResponsableColumn?: boolean
}) {
  const gridCols = showRecursoColumn && showResponsableColumn
    ? 'grid-cols-[1fr_80px_65px_120px_55px_55px_100px_100px_28px]'
    : (showRecursoColumn || showResponsableColumn)
      ? 'grid-cols-[1fr_80px_65px_120px_55px_55px_100px_28px]'
      : 'grid-cols-[1fr_80px_65px_120px_55px_55px_28px]'

  return (
    <div className={`grid items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider ${gridCols}`}>
      <div>Nombre</div>
      <div className="text-center">Progreso</div>
      <div className="text-center">Tipo</div>
      <div className="text-center">Fechas</div>
      <div className="text-right pr-1">Dur</div>
      <div className="text-right pr-1">Work</div>
      {showRecursoColumn && <div className="text-center">Recurso</div>}
      {showResponsableColumn && <div className="text-center">Responsable</div>}
      <div></div>
    </div>
  )
}
