import type { PlanTrabajo } from '@prisma/client'
import type { PlanRestriccion } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

const CATEGORIA_COLORS: Record<string, string> = {
  AUTORIZACION: 'bg-blue-50 text-blue-700 border-blue-200',
  ELECTRICO: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  EPP: 'bg-orange-50 text-orange-700 border-orange-200',
  ALCOHOL_DROGAS: 'bg-red-50 text-red-700 border-red-200',
  GENERAL: 'bg-gray-50 text-gray-700 border-gray-200',
  CAPACITACION: 'bg-purple-50 text-purple-700 border-purple-200',
}

function categoriaColor(cat?: string) {
  return CATEGORIA_COLORS[cat ?? ''] ?? 'bg-gray-50 text-gray-700 border-gray-200'
}

export function RestriccionesView({ plan }: Props) {
  const items = plan.restricciones as PlanRestriccion[] | null
  if (!items || items.length === 0) return null

  const categorias = [...new Set(items.map(i => i.categoria).filter(Boolean))]
  const sinCategoria = items.filter(i => !i.categoria)
  const conCategoria = items.filter(i => i.categoria)

  return (
    <div className="space-y-4">
      {categorias.map(cat => {
        const grupo = conCategoria.filter(i => i.categoria === cat)
        return (
          <div key={cat} className="space-y-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${categoriaColor(cat)}`}>
              {cat}
            </span>
            <ul className="space-y-1 mt-1">
              {grupo.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="shrink-0 text-gray-300 mt-0.5">·</span>
                  {item.texto}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {sinCategoria.length > 0 && (
        <ul className="space-y-1">
          {sinCategoria.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="shrink-0 text-gray-300 mt-0.5">·</span>
              {item.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
