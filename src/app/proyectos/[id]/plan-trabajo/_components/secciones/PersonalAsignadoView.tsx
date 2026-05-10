import type { PlanTrabajo } from '@prisma/client'
import type { PlanPersonal } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

export function PersonalAsignadoView({ plan }: Props) {
  const items = plan.personalAsignado as PlanPersonal[] | null
  if (!items || items.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="border px-3 py-1.5 text-left font-semibold text-gray-600">Nombre</th>
            <th className="border px-3 py-1.5 text-left font-semibold text-gray-600">Cargo</th>
            <th className="border px-3 py-1.5 text-left font-semibold text-gray-600">Empresa</th>
            <th className="border px-3 py-1.5 text-left font-semibold text-gray-600">Siglas</th>
            <th className="border px-3 py-1.5 text-left font-semibold text-gray-600">CIP</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
              <td className="border px-3 py-1.5 font-medium text-gray-800">{p.nombre}</td>
              <td className="border px-3 py-1.5 text-gray-600">{p.cargo}</td>
              <td className="border px-3 py-1.5 text-gray-500">{p.empresa ?? '—'}</td>
              <td className="border px-3 py-1.5 font-mono font-semibold text-gray-700">{p.siglas ?? '—'}</td>
              <td className="border px-3 py-1.5 font-mono text-gray-500">{p.cip ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
