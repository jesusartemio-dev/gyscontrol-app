import type { PlanTrabajo } from '@prisma/client'
import type { PlanHerramientasYEquipos, PlanItemRecurso } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

function RecursoList({ items, label }: { items: PlanItemRecurso[]; label: string }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-gray-400 mt-0.5 shrink-0">·</span>
            <div>
              <span className="text-gray-800">{item.nombre}</span>
              {item.cantidad !== undefined && (
                <span className="text-xs text-muted-foreground ml-2">
                  {item.cantidad} {item.unidad ?? ''}
                </span>
              )}
              {item.observaciones && <p className="text-xs text-muted-foreground">{item.observaciones}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HerramientasView({ plan }: Props) {
  const data = plan.herramientasYEquipos as PlanHerramientasYEquipos | null
  if (!data) return null

  return (
    <div className="space-y-4">
      <RecursoList items={data.equipos ?? []} label="Equipos" />
      <RecursoList items={data.herramientas ?? []} label="Herramientas" />
      <RecursoList items={data.materiales ?? []} label="Materiales" />
    </div>
  )
}
