import type { PlanTrabajo } from '@prisma/client'
import type { PlanAlcanceItem } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

const RIESGO_LABELS: { key: keyof PlanAlcanceItem; label: string; color: string }[] = [
  { key: 'tieneRiesgoAltura', label: 'Altura', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { key: 'tieneRiesgoCaliente', label: 'T. Caliente', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'tieneRiesgoElectrico', label: 'Eléctrico', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'tieneRiesgoEspacioConfinado', label: 'Esp. Confinado', color: 'bg-purple-100 text-purple-800 border-purple-200' },
]

export function AlcanceDetalladoView({ plan }: Props) {
  const items = plan.alcanceDetallado as PlanAlcanceItem[] | null
  if (!items || items.length === 0) return null

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border rounded-md p-3 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">{item.numero}</span>
            <span className="text-sm font-semibold text-gray-800">{item.nombre}</span>
          </div>
          {item.descripcion && (
            <p className="text-xs text-gray-600 ml-8 leading-relaxed">{item.descripcion}</p>
          )}
          {item.ubicacion && (
            <p className="text-xs text-muted-foreground ml-8">Ubicación: {item.ubicacion}</p>
          )}
          <div className="flex flex-wrap gap-1 ml-8">
            {RIESGO_LABELS.filter(r => item[r.key]).map(r => (
              <span key={r.key} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${r.color}`}>
                {r.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
