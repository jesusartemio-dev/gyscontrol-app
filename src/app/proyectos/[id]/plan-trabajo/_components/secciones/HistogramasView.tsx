import type { PlanTrabajo } from '@prisma/client'
import type { PlanHistogramas } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

export function HistogramasView({ plan }: Props) {
  const hist = plan.histogramas as PlanHistogramas | null
  if (!hist?.meses?.length) return null

  return (
    <div className="space-y-4 overflow-x-auto">
      {hist.horasHombre?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Horas Hombre</p>
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left font-semibold text-gray-600">Recurso</th>
                {hist.meses.map(m => (
                  <th key={m} className="border px-2 py-1 text-center font-semibold text-gray-600 min-w-[48px]">{m}</th>
                ))}
                <th className="border px-2 py-1 text-center font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {hist.horasHombre.map((fila, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="border px-2 py-1 text-gray-700">{fila.etiqueta}</td>
                  {fila.valoresPorMes.map((v, j) => (
                    <td key={j} className="border px-2 py-1 text-center text-gray-600">{v || '—'}</td>
                  ))}
                  <td className="border px-2 py-1 text-center font-semibold text-gray-700">{fila.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hist.equipoTrabajo?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Equipo de Trabajo</p>
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1 text-left font-semibold text-gray-600">Cargo</th>
                {hist.meses.map(m => (
                  <th key={m} className="border px-2 py-1 text-center font-semibold text-gray-600 min-w-[48px]">{m}</th>
                ))}
                <th className="border px-2 py-1 text-center font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {hist.equipoTrabajo.map((fila, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="border px-2 py-1 text-gray-700">{fila.etiqueta}</td>
                  {fila.valoresPorMes.map((v, j) => (
                    <td key={j} className="border px-2 py-1 text-center text-gray-600">{v || '—'}</td>
                  ))}
                  <td className="border px-2 py-1 text-center font-semibold text-gray-700">{fila.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
