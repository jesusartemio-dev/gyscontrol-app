import type { PlanTrabajo } from '@prisma/client'

interface Props { plan: PlanTrabajo }

export function AlcanceGeneralView({ plan }: Props) {
  const texto = plan.alcanceGeneral
  if (!texto) return null
  return <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{texto}</p>
}
