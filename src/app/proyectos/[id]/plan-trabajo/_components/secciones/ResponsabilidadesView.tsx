import type { PlanTrabajo } from '@prisma/client'
import type { PlanResponsabilidades } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

const ROLES: { key: keyof PlanResponsabilidades; label: string }[] = [
  { key: 'gerenteGeneral', label: 'Gerente General' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'operario', label: 'Operario' },
  { key: 'supervisorSeguridad', label: 'Supervisor de Seguridad' },
]

export function ResponsabilidadesView({ plan }: Props) {
  const resp = plan.responsabilidades as PlanResponsabilidades | null
  if (!resp) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {ROLES.map(({ key, label }) => {
        const lista = resp[key] ?? []
        if (!lista.length) return null
        return (
          <div key={key} className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <ul className="space-y-1">
              {lista.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="shrink-0 text-gray-300 mt-0.5">·</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
