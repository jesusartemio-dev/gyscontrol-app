'use client'

import { useState } from 'react'
import { Package, Wrench, Receipt, BookMarked } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExcelExtraido } from '@/lib/agente/excelExtractor'
import type { PropuestaExtraida } from '@/lib/agente/pdfProposalExtractor'

// Key format: "grupoIdx-itemIdx"
export type CatalogSelections = Record<string, boolean>

/**
 * Heuristic: suggest adding to catalog if the item has a code
 * or its description looks like standard equipment (not generic material).
 */
const STANDARD_EQUIPMENT_PATTERNS = [
  /\bplc\b/i, /\bhmi\b/i, /\bscada\b/i, /\bvfd\b/i, /\binverter\b/i,
  /\bvariador\b/i, /\bswitch\b/i, /\brouter\b/i, /\bsensor\b/i,
  /\btransmisor\b/i, /\bcontrolador\b/i, /\bmodulo\b/i, /\bmodule\b/i,
  /\bfuente\b/i, /\bpower supply\b/i, /\bservo\b/i, /\bmotor\b/i,
  /\bpanel\b/i, /\btablero\b/i, /\brack\b/i, /\bcpu\b/i,
  /\bsiemens\b/i, /\ballen.?bradley\b/i, /\brockwell\b/i, /\bschneider\b/i,
  /\babb\b/i, /\bhoneywell\b/i, /\bemerson\b/i, /\bfesto\b/i,
]

export function shouldSuggestCatalog(item: { codigo?: string; descripcion: string; marca?: string }): boolean {
  // Items with a product code are likely standard catalog items
  if (item.codigo && item.codigo.trim().length > 0) return true
  // Items from known automation brands
  const text = `${item.descripcion} ${item.marca || ''}`
  return STANDARD_EQUIPMENT_PATTERNS.some((p) => p.test(text))
}

interface Props {
  data: ExcelExtraido
  pdfData: PropuestaExtraida | null
  catalogSelections: CatalogSelections
  onCatalogSelectionsChange: (selections: CatalogSelections) => void
}

type TabKey = 'equipos' | 'servicios' | 'gastos' | 'pdf'

export function PreviewStep({ data, pdfData, catalogSelections, onCatalogSelectionsChange }: Props) {
  const [tab, setTab] = useState<TabKey>('equipos')

  const equipoCount = data.equipos.reduce((s, g) => s + g.items.length, 0)
  const servicioCount = data.servicios.reduce((s, g) => s + g.actividades.length, 0)
  const gastoCount = data.gastos.reduce((s, g) => s + g.items.length, 0)
  const catalogCount = Object.values(catalogSelections).filter(Boolean).length

  const tabs: { key: TabKey; label: string; count: number; icon: typeof Package }[] = [
    { key: 'equipos', label: 'Equipos', count: equipoCount, icon: Package },
    { key: 'servicios', label: 'Servicios', count: servicioCount, icon: Wrench },
    { key: 'gastos', label: 'Gastos', count: gastoCount, icon: Receipt },
  ]

  if (pdfData) {
    tabs.push({
      key: 'pdf',
      label: 'PDF',
      count: (pdfData.condiciones?.length || 0) + (pdfData.exclusiones?.length || 0),
      icon: Receipt,
    })
  }

  const toggleCatalog = (key: string) => {
    onCatalogSelectionsChange({
      ...catalogSelections,
      [key]: !catalogSelections[key],
    })
  }

  const toggleAllCatalog = (checked: boolean) => {
    const next: CatalogSelections = {}
    data.equipos.forEach((grupo, gi) => {
      grupo.items.forEach((_, ii) => {
        next[`${gi}-${ii}`] = checked
      })
    })
    onCatalogSelectionsChange(next)
  }

  return (
    <div className="space-y-3">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-blue-50 p-2">
          <div className="text-lg font-bold text-blue-700">{equipoCount}</div>
          <div className="text-blue-600">Equipos</div>
        </div>
        <div className="rounded-lg bg-purple-50 p-2">
          <div className="text-lg font-bold text-purple-700">{servicioCount}</div>
          <div className="text-purple-600">Servicios</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-2">
          <div className="text-lg font-bold text-amber-700">{gastoCount}</div>
          <div className="text-amber-600">Gastos</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            <span className="rounded-full bg-gray-100 px-1.5 text-[10px]">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-[320px] overflow-y-auto">
        {tab === 'equipos' && (
          <div className="space-y-3">
            {/* Catalog selection header */}
            <div className="flex items-center justify-between rounded-lg bg-blue-50/60 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-blue-700">
                <BookMarked className="h-3.5 w-3.5" />
                <span className="font-medium">{catalogCount}/{equipoCount}</span> items irán al catálogo
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAllCatalog(true)}
                  className="text-[10px] font-medium text-blue-600 hover:underline"
                >
                  Todos
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => toggleAllCatalog(false)}
                  className="text-[10px] font-medium text-blue-600 hover:underline"
                >
                  Ninguno
                </button>
              </div>
            </div>

            {data.equipos.map((grupo, gi) => (
              <div key={gi}>
                <h4 className="mb-1 text-xs font-semibold text-gray-700">
                  {grupo.grupo}
                  <span className="ml-1 font-normal text-gray-400">({grupo.hoja})</span>
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-1 pr-1 w-7" title="Agregar al catálogo">
                        <BookMarked className="h-3 w-3 text-gray-400" />
                      </th>
                      <th className="pb-1 pr-2">Descripción</th>
                      <th className="pb-1 pr-2 text-right">Cant</th>
                      <th className="pb-1 pr-2 text-right">P.Interno</th>
                      <th className="pb-1 text-right">P.Cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map((item, ii) => {
                      const key = `${gi}-${ii}`
                      const selected = !!catalogSelections[key]
                      return (
                        <tr key={ii} className="border-b border-gray-50">
                          <td className="py-1 pr-1">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleCatalog(key)}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                              title={selected ? 'Se agregará al catálogo' : 'Solo en cotización'}
                            />
                          </td>
                          <td className="py-1 pr-2 truncate max-w-[180px]" title={item.descripcion}>
                            {item.descripcion}
                            {item.codigo && (
                              <span className="ml-1 text-[10px] text-gray-400">[{item.codigo}]</span>
                            )}
                          </td>
                          <td className="py-1 pr-2 text-right">{item.cantidad}</td>
                          <td className="py-1 pr-2 text-right">{item.precioInterno.toFixed(2)}</td>
                          <td className="py-1 text-right">{item.precioCliente.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {tab === 'servicios' && (
          <div className="space-y-3">
            {data.servicios.map((grupo, gi) => (
              <div key={gi}>
                <h4 className="mb-1 text-xs font-semibold text-gray-700">
                  {grupo.grupo}
                  <span className="ml-1 font-normal text-gray-400">({grupo.hoja})</span>
                </h4>
                {grupo.actividades.map((act, ai) => (
                  <div key={ai} className="mb-2 rounded bg-gray-50 p-2">
                    <p className="text-xs font-medium">{act.nombre}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                      {act.recursos.map((r, ri) => (
                        <span key={ri} className="rounded bg-white px-1.5 py-0.5 border">
                          {r.recursoNombre} ({r.tipo}) — {r.horas}h × ${r.costoHora}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'gastos' && (
          <div className="space-y-3">
            {data.gastos.map((grupo, gi) => (
              <div key={gi}>
                <h4 className="mb-1 text-xs font-semibold text-gray-700">
                  {grupo.grupo}
                  <span className="ml-1 font-normal text-gray-400">({grupo.hoja})</span>
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-1 pr-2">Nombre</th>
                      <th className="pb-1 pr-2 text-right">Cant</th>
                      <th className="pb-1 pr-2 text-right">P.Unit</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map((item, ii) => (
                      <tr key={ii} className="border-b border-gray-50">
                        <td className="py-1 pr-2">{item.nombre}</td>
                        <td className="py-1 pr-2 text-right">{item.cantidad}</td>
                        <td className="py-1 pr-2 text-right">{item.precioUnitario.toFixed(2)}</td>
                        <td className="py-1 text-right">{item.costoCliente.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {tab === 'pdf' && pdfData && (
          <div className="space-y-3 text-xs">
            {pdfData.clienteNombre && (
              <div>
                <span className="font-medium text-gray-700">Cliente: </span>
                {pdfData.clienteNombre} {pdfData.clienteRuc && `(RUC: ${pdfData.clienteRuc})`}
              </div>
            )}
            {pdfData.nombreProyecto && (
              <div>
                <span className="font-medium text-gray-700">Proyecto: </span>
                {pdfData.nombreProyecto}
              </div>
            )}
            {pdfData.condiciones.length > 0 && (
              <div>
                <h4 className="mb-1 font-semibold text-gray-700">
                  Condiciones ({pdfData.condiciones.length})
                </h4>
                <ul className="space-y-1">
                  {pdfData.condiciones.map((c, i) => (
                    <li key={i} className="rounded bg-gray-50 p-2">
                      {c.texto}
                      {c.tipo && (
                        <span className="ml-1 text-[10px] text-gray-400">({c.tipo})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pdfData.exclusiones.length > 0 && (
              <div>
                <h4 className="mb-1 font-semibold text-gray-700">
                  Exclusiones ({pdfData.exclusiones.length})
                </h4>
                <ul className="space-y-1">
                  {pdfData.exclusiones.map((e, i) => (
                    <li key={i} className="rounded bg-gray-50 p-2">{e.texto}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
