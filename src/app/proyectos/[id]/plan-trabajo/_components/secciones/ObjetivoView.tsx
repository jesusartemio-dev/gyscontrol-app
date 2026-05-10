import type { PlanTrabajo } from '@prisma/client'

interface Props { plan: PlanTrabajo }

export function ObjetivoView({ plan }: Props) {
  const texto = plan.objetivo
  if (!texto) return null
  return <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{texto}</p>
}
