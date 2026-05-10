import type { PlanTrabajo } from '@prisma/client'
import type { PlanCronograma } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

export function CronogramaResumenView({ plan }: Props) {
  const cron = plan.cronogramaResumen as PlanCronograma | null
  if (!cron?.filas?.length) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-max">
        <thead>
          <tr className="bg-gray-50">
            <th className="border px-2 py-1.5 text-left font-semibold text-gray-600">Fase</th>
            <th className="border px-2 py-1.5 text-left font-semibold text-gray-600">EDT</th>
            <th className="border px-2 py-1.5 text-left font-semibold text-gray-600">Actividad</th>
            <th className="border px-2 py-1.5 text-left font-semibold text-gray-600">Inicio</th>
            <th className="border px-2 py-1.5 text-left font-semibold text-gray-600">Fin</th>
            <th className="border px-2 py-1.5 text-right font-semibold text-gray-600">Horas</th>
          </tr>
        </thead>
        <tbody>
          {cron.filas.map((fila, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
              <td className="border px-2 py-1.5 text-gray-600">{fila.fase}</td>
              <td className="border px-2 py-1.5 text-gray-700 font-medium">{fila.edt}</td>
              <td className="border px-2 py-1.5 text-gray-500">{fila.actividad ?? '—'}</td>
              <td className="border px-2 py-1.5 font-mono text-gray-600">{fila.fechaInicio}</td>
              <td className="border px-2 py-1.5 font-mono text-gray-600">{fila.fechaFin}</td>
              <td className="border px-2 py-1.5 text-right font-semibold text-gray-700">{fila.horasPlan}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
