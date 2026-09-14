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

export type BucketPartida = 'equipo' | 'servicio' | 'gasto'

export interface ClasificacionPartida {
  bucket: BucketPartida
  edtId?: string
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
  partidas?: Array<{ clave: string; descripcion: string; monto: number; origen: string }>
  clasificacion?: Record<string, ClasificacionPartida>
  moneda?: string
  onClasificacionChange?: (clave: string, valor: ClasificacionPartida) => void
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
  partidas = [],
  clasificacion = {},
  moneda = 'USD',
  onClasificacionChange,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Clasificación de partidas — importación histórica desde PDF */}
      {partidas.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Clasificación de partidas
            <span className="ml-1 font-normal text-gray-400">({partidas.length})</span>
          </h3>
          <p className="mb-3 text-xs text-gray-500">
            El PDF solo trae montos cerrados. Indica qué es cada partida; las de servicio
            necesitan un EDT y se cargan como 1 hora de un recurso marcador a ese monto.
          </p>
          <div className="space-y-3">
            {[...new Set(partidas.map((p) => p.origen))].map((origen) => (
              <div key={origen}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {origen}
                </p>
                <div className="space-y-2">
                  {partidas
                    .filter((p) => p.origen === origen)
                    .map((p) => {
                      const actual = clasificacion[p.clave] || {
                        bucket: 'equipo' as BucketPartida,
                      }
                      const faltaEdt = actual.bucket === 'servicio' && !actual.edtId
                      return (
                        <div key={p.clave} className="rounded-lg border bg-white p-2.5 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="flex-1 text-xs text-gray-700">{p.descripcion}</p>
                            <span className="shrink-0 text-xs font-semibold text-green-700">
                              {moneda}{' '}
                              {p.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={actual.bucket}
                              onChange={(e) =>
                                onClasificacionChange?.(p.clave, {
                                  ...actual,
                                  bucket: e.target.value as BucketPartida,
                                })
                              }
                              className="rounded-md border px-2 py-1.5 text-xs"
                            >
                              <option value="equipo">Equipo</option>
                              <option value="servicio">Servicio</option>
                              <option value="gasto">Gasto</option>
                            </select>

                            {actual.bucket === 'servicio' && (
                              <select
                                value={actual.edtId || ''}
                                onChange={(e) =>
                                  onClasificacionChange?.(p.clave, {
                                    ...actual,
                                    edtId: e.target.value,
                                  })
                                }
                                className={cn(
                                  'flex-1 rounded-md border px-2 py-1.5 text-xs',
                                  faltaEdt
                                    ? 'border-amber-300 bg-amber-50'
                                    : 'border-green-300 bg-green-50'
                                )}
                              >
                                <option value="">— Elegir EDT —</option>
                                {catalogoEdts.map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.nombre}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {recursoSugerencias.length === 0 &&
        edtSugerencias.length === 0 &&
        partidas.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No se encontraron recursos ni EDTs para mapear.
          </div>
        )}
    </div>
  )
}
