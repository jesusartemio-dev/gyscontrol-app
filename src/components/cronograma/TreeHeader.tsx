export function TreeHeader({ assignmentColumn }: { assignmentColumn?: 'recurso' | 'responsable' }) {
  return (
    <div className={`grid items-center gap-1 px-2 py-1.5 bg-gray-50 border-b text-[10px] font-medium text-gray-500 uppercase tracking-wider ${assignmentColumn ? 'grid-cols-[1fr_80px_65px_120px_75px_100px_28px]' : 'grid-cols-[1fr_80px_65px_120px_75px_28px]'}`}>
      <div>Nombre</div>
      <div className="text-center">Progreso</div>
      <div className="text-center">Tipo</div>
      <div className="text-center">Fechas</div>
      <div className="text-right pr-1">Horas</div>
      {assignmentColumn && (
        <div className="text-center">{assignmentColumn === 'recurso' ? 'Recurso' : 'Responsable'}</div>
      )}
      <div></div>
    </div>
  )
}
