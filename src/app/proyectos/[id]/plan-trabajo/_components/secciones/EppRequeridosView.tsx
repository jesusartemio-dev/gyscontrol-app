import type { PlanTrabajo } from '@prisma/client'
import type { PlanEPP } from '@/types/planTrabajo'
import { agruparEpp, type GrupoEpp } from '@/lib/planTrabajo/eppGrupos'

interface Props { plan: PlanTrabajo }

function Columna({ titulo, grupos }: { titulo: string; grupos: GrupoEpp[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{titulo}</p>
      {grupos.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
      {grupos.map(grupo => (
        <div key={grupo.titulo} className="space-y-1">
          <p className="text-sm font-semibold underline underline-offset-2 text-gray-800">{grupo.titulo}:</p>
          <ul className="list-disc pl-5 space-y-0.5 text-sm text-gray-800">
            {grupo.items.map((item, i) => <li key={i}>{item.texto}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}

// Mismo cuadro que el docx: EPP básico a la izquierda, riesgo específico agrupado por tipo de trabajo a la derecha.
export function EppRequeridosView({ plan }: Props) {
  const epp = plan.eppRequeridos as PlanEPP | null
  if (!epp) return null
  const { basico, riesgoEspecifico } = agruparEpp(epp)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Columna titulo="EPP Básico" grupos={basico} />
      <Columna titulo="EPP Riesgo Específico" grupos={riesgoEspecifico} />
    </div>
  )
}
