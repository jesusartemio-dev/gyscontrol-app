import type { PlanTrabajo } from '@prisma/client'
import type { PlanReferencia } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

const ORIGEN_COLORS: Record<string, string> = {
  TDR: 'bg-violet-50 text-violet-700 border-violet-200',
  COTIZACION: 'bg-blue-50 text-blue-700 border-blue-200',
  NORMATIVA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MANUAL: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function ReferenciasView({ plan }: Props) {
  const items = plan.referencias as PlanReferencia[] | null
  if (!items || items.length === 0) return null

  return (
    <div className="space-y-2">
      {items.map((ref, i) => (
        <div key={i} className="flex items-start gap-2.5 text-sm">
          <span className="text-xs text-muted-foreground w-5 shrink-0 text-right mt-0.5">{i + 1}.</span>
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-800 font-medium">{ref.titulo}</span>
              <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border ${ORIGEN_COLORS[ref.origen] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {ref.origen}
              </span>
            </div>
            {ref.codigoDocumento && (
              <p className="text-xs font-mono text-muted-foreground">{ref.codigoDocumento}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
