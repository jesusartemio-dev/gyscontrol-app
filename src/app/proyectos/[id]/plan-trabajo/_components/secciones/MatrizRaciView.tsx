import type { PlanTrabajo } from '@prisma/client'
import type { PlanRaci } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

const ROL_COLORS: Record<string, string> = {
  R: 'bg-blue-100 text-blue-800',
  A: 'bg-red-100 text-red-800',
  C: 'bg-yellow-100 text-yellow-800',
  I: 'bg-gray-100 text-gray-700',
}

export function MatrizRaciView({ plan }: Props) {
  const raci = plan.matrizRaci as PlanRaci | null
  if (!raci?.filas?.length) return null

  const siglas = [...new Set(raci.filas.flatMap(f => f.asignaciones.map(a => a.siglas)))]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-max">
        <thead>
          <tr className="bg-gray-50">
            <th className="border px-3 py-1.5 text-left font-semibold text-gray-600 min-w-[160px]">EDT</th>
            {siglas.map(s => (
              <th key={s} className="border px-2 py-1.5 text-center font-mono font-semibold text-gray-600 w-12">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {raci.filas.map((fila, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
              <td className="border px-3 py-1.5 text-gray-700">{fila.edt}</td>
              {siglas.map(s => {
                const asig = fila.asignaciones.find(a => a.siglas === s)
                return (
                  <td key={s} className="border px-1 py-1 text-center">
                    {asig && (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${ROL_COLORS[asig.rol] ?? 'bg-gray-100 text-gray-700'}`}>
                        {asig.rol}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-muted-foreground">R=Responsable · A=Aprueba · C=Consultado · I=Informado</p>
    </div>
  )
}
