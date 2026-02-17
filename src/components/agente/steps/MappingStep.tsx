'use client'

import { cn } from '@/lib/utils'

interface MappingSuggestion {
  excelName: string
  matches: Array<{ id: string; nombre: string; score: number }>
}

interface CatalogItem {
  id: string
  nombre: string
}

interface Props {
  recursoSugerencias: MappingSuggestion[]
  edtSugerencias: MappingSuggestion[]
  catalogoRecursos: Array<{ id: string; nombre: string; costoHora: number }>
  catalogoEdts: CatalogItem[]
  recursoMappings: Record<string, string>
  edtMappings: Record<string, string>
  onRecursoMap: (excelName: string, recursoId: string) => void
  onEdtMap: (excelName: string, edtId: string) => void
}

export function MappingStep({
  recursoSugerencias,
  edtSugerencias,
  catalogoRecursos,
  catalogoEdts,
  recursoMappings,
  edtMappings,
  onRecursoMap,
  onEdtMap,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Mapeo de Recursos */}
      {recursoSugerencias.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Mapeo de Recursos
            <span className="ml-1 font-normal text-gray-400">
              ({recursoSugerencias.length})
            </span>
          </h3>
          <p className="mb-3 text-xs text-gray-500">
            Vincula cada recurso del Excel con un recurso existente en el sistema.
          </p>
          <div className="space-y-2">
            {recursoSugerencias.map((sug) => (
              <div
                key={sug.excelName}
                className="flex items-center gap-3 rounded-lg border bg-white p-2.5"
              >
                <div className="min-w-[120px] text-xs">
                  <span className="rounded bg-gray-100 px-2 py-1 font-mono">
                    {sug.excelName}
                  </span>
                </div>
                <span className="text-gray-400">→</span>
                <select
                  value={recursoMappings[sug.excelName] || ''}
                  onChange={(e) => onRecursoMap(sug.excelName, e.target.value)}
                  className={cn(
                    'flex-1 rounded-md border px-2 py-1.5 text-xs',
                    recursoMappings[sug.excelName]
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200'
                  )}
                >
                  <option value="">— Sin mapear —</option>
                  {/* Sugerencias primero */}
                  {sug.matches.length > 0 && (
                    <optgroup label="Sugerencias">
                      {sug.matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({Math.round(m.score * 100)}% match)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Todos los recursos">
                    {catalogoRecursos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} (${r.costoHora}/h)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mapeo de EDTs */}
      {edtSugerencias.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Mapeo de EDTs
            <span className="ml-1 font-normal text-gray-400">
              ({edtSugerencias.length})
            </span>
          </h3>
          <p className="mb-3 text-xs text-gray-500">
            Vincula cada sección de servicios del Excel con un EDT del sistema.
          </p>
          <div className="space-y-2">
            {edtSugerencias.map((sug) => (
              <div
                key={sug.excelName}
                className="flex items-center gap-3 rounded-lg border bg-white p-2.5"
              >
                <div className="min-w-[140px] text-xs">
                  <span className="rounded bg-purple-50 px-2 py-1 font-mono text-purple-700">
                    {sug.excelName}
                  </span>
                </div>
                <span className="text-gray-400">→</span>
                <select
                  value={edtMappings[sug.excelName] || ''}
                  onChange={(e) => onEdtMap(sug.excelName, e.target.value)}
                  className={cn(
                    'flex-1 rounded-md border px-2 py-1.5 text-xs',
                    edtMappings[sug.excelName]
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200'
                  )}
                >
                  <option value="">— Sin mapear —</option>
                  {sug.matches.length > 0 && (
                    <optgroup label="Sugerencias">
                      {sug.matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({Math.round(m.score * 100)}% match)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Todos los EDTs">
                    {catalogoEdts.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {recursoSugerencias.length === 0 && edtSugerencias.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          No se encontraron recursos ni EDTs para mapear.
        </div>
      )}
    </div>
  )
}
