import type { PlanTrabajo } from '@prisma/client'
import type { PlanEPP, PlanEPPItem } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

function EPPList({ items, label }: { items: PlanEPPItem[]; label: string }) {
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
              {item.norma && <span className="text-xs text-muted-foreground ml-2">({item.norma})</span>}
              {item.observaciones && <p className="text-xs text-muted-foreground">{item.observaciones}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EppRequeridosView({ plan }: Props) {
  const epp = plan.eppRequeridos as PlanEPP | null
  if (!epp) return null

  return (
    <div className="space-y-4">
      <EPPList items={epp.basico ?? []} label="EPP Básico" />
      <EPPList items={epp.bioseguridad ?? []} label="Bioseguridad" />
      <EPPList items={epp.riesgoEspecifico ?? []} label="Riesgo Específico" />
    </div>
  )
}
