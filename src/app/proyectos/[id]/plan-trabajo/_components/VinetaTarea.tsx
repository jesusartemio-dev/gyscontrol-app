import { partesVineta } from '@/lib/planTrabajo/vinetaTarea'
import type { PlanAlcanceDetalladoTarea } from '@/types/planTrabajo'

/** **Título:** descripción — el título de la tarea no se pierde al escribir la descripción. */
export function VinetaTarea({ tarea }: { tarea: Pick<PlanAlcanceDetalladoTarea, 'nombre' | 'texto' | 'manualId'> }) {
  const { titulo, descripcion } = partesVineta(tarea)
  return (
    <>
      {titulo && <span className="font-semibold text-gray-700">{titulo}{descripcion ? ':' : ''}</span>}
      {titulo && descripcion ? ' ' : ''}
      {descripcion}
    </>
  )
}
