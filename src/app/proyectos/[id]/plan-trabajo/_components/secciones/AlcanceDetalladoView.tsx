import type { PlanTrabajo } from '@prisma/client'
import type { PlanAlcanceDetalladoEdt, PlanAlcanceItem } from '@/types/planTrabajo'

interface Props { plan: PlanTrabajo }

function isNuevoFormato(item: unknown): item is PlanAlcanceDetalladoEdt {
  return typeof item === 'object' && item !== null && 'edtNombre' in item
}

export function AlcanceDetalladoView({ plan }: Props) {
  const raw = plan.alcanceDetallado as unknown[] | null
  if (!raw || raw.length === 0) return null

  const todosNuevoFormato = raw.every(isNuevoFormato)

  if (todosNuevoFormato) {
    const items = raw as PlanAlcanceDetalladoEdt[]

    // Agrupar por faseNombre manteniendo orden de aparición
    const grupos: Record<string, PlanAlcanceDetalladoEdt[]> = {}
    const ordenFases: string[] = []
    for (const item of items) {
      const fase = item.faseNombre || item.faseAbreviatura || 'Sin fase'
      if (!grupos[fase]) {
        grupos[fase] = []
        ordenFases.push(fase)
      }
      grupos[fase].push(item)
    }

    return (
      <div className="space-y-5">
        {ordenFases.map(faseNombre => (
          <div key={faseNombre}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-indigo-200" />
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest px-1">
                {faseNombre}
              </span>
              <div className="h-px flex-1 bg-indigo-200" />
            </div>
            <div className="space-y-3">
              {grupos[faseNombre].map((item, i) => (
                <div key={i} className="border rounded-md p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                      {item.numeracion}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{item.edtNombre}</span>
                  </div>
                  {item.ubicacion && (
                    <p className="text-xs text-muted-foreground ml-8">📍 {item.ubicacion}</p>
                  )}
                  {item.descripcion && (
                    <p className="text-xs text-gray-600 ml-8 leading-relaxed">{item.descripcion}</p>
                  )}
                  {(item.subItems ?? []).length > 0 && (
                    <div className="ml-8 mt-2 space-y-2 border-l-2 border-indigo-100 pl-3">
                      {(item.subItems ?? []).map((sub, si) => (
                        <div key={si} className="space-y-0.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {sub.numeracion}
                            </span>
                            <span className="text-xs font-medium text-gray-700">
                              {sub.actividadNombre}
                            </span>
                          </div>
                          {sub.descripcion && (
                            <p className="text-xs text-gray-500 leading-relaxed">{sub.descripcion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Formato mixto o legacy
  return (
    <div className="space-y-3">
      {raw.map((item, i) => {
        if (isNuevoFormato(item)) {
          return (
            <div key={i} className="border rounded-md p-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                  {item.numeracion}
                </span>
                <span className="text-sm font-semibold text-gray-800">{item.edtNombre}</span>
              </div>
              {item.descripcion && (
                <p className="text-xs text-gray-600 ml-8 leading-relaxed">{item.descripcion}</p>
              )}
            </div>
          )
        }
        const legacy = item as PlanAlcanceItem
        return (
          <div key={i} className="border rounded-md p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                {legacy.numero}
              </span>
              <span className="text-sm font-semibold text-gray-800">{legacy.nombre}</span>
            </div>
            {legacy.descripcion && (
              <p className="text-xs text-gray-600 ml-8 leading-relaxed">{legacy.descripcion}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
