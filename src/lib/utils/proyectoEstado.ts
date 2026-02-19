export type ProyectoEstado =
  | 'creado'
  | 'en_planificacion'
  | 'listas_pendientes'
  | 'listas_aprobadas'
  | 'pedidos_creados'
  | 'en_ejecucion'
  | 'en_cierre'
  | 'cerrado'
  | 'pausado'
  | 'cancelado'

/** Etiquetas legibles para mostrar en la UI */
export const proyectoEstadoLabels: Record<ProyectoEstado, string> = {
  creado: 'Creado',
  en_planificacion: 'En Planificación',
  listas_pendientes: 'Listas Pendientes',
  listas_aprobadas: 'Listas Aprobadas',
  pedidos_creados: 'Pedidos Creados',
  en_ejecucion: 'En Ejecución',
  en_cierre: 'En Cierre',
  cerrado: 'Cerrado',
  pausado: 'Pausado',
  cancelado: 'Cancelado',
}

/** Clases Tailwind para colorear Badges por estado */
export const proyectoEstadoColors: Record<ProyectoEstado, string> = {
  creado: 'bg-slate-100 text-slate-700 border-slate-300',
  en_planificacion: 'bg-blue-50 text-blue-700 border-blue-200',
  listas_pendientes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  listas_aprobadas: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  pedidos_creados: 'bg-purple-50 text-purple-700 border-purple-200',
  en_ejecucion: 'bg-green-50 text-green-700 border-green-200',
  en_cierre: 'bg-orange-50 text-orange-700 border-orange-200',
  cerrado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pausado: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
}

/** Prioridad de ordenamiento: menor = primero */
export const proyectoEstadoPriority: Record<ProyectoEstado, number> = {
  creado: 0,
  en_planificacion: 1,
  listas_pendientes: 2,
  listas_aprobadas: 3,
  pedidos_creados: 4,
  en_ejecucion: 5,
  en_cierre: 6,
  cerrado: 7,
  pausado: 8,
  cancelado: 9,
}

/** Lista ordenada de estados para dropdowns */
export const proyectoEstadoList: { key: ProyectoEstado; label: string }[] = [
  { key: 'creado', label: 'Creado' },
  { key: 'en_planificacion', label: 'En Planificación' },
  { key: 'listas_pendientes', label: 'Listas Pendientes' },
  { key: 'listas_aprobadas', label: 'Listas Aprobadas' },
  { key: 'pedidos_creados', label: 'Pedidos Creados' },
  { key: 'en_ejecucion', label: 'En Ejecución' },
  { key: 'en_cierre', label: 'En Cierre' },
  { key: 'cerrado', label: 'Cerrado' },
  { key: 'pausado', label: 'Pausado' },
  { key: 'cancelado', label: 'Cancelado' },
]
