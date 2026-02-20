'use client'

import { useState, useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { ArrowRight, ArrowLeftRight, ChevronDown, ChevronRight, Equal, Plus, Minus, Pencil } from 'lucide-react'
import { formatDisplayCurrency } from '@/lib/utils/currency'
import type { CotizacionVersion } from '@/lib/services/cotizacion-versions'

interface VersionCompareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versiones: CotizacionVersion[]
}

interface DiffItem {
  campo: string
  label: string
  valorBase: any
  valorCompare: any
  tipo: 'agregado' | 'modificado' | 'eliminado' | 'igual'
  seccion: string
}

// Labels legibles para campos del snapshot
const FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre',
  estado: 'Estado',
  moneda: 'Moneda',
  revision: 'Revisión',
  formaPago: 'Forma de Pago',
  validezOferta: 'Validez Oferta (días)',
  plazoEntrega: 'Plazo de Entrega',
  lugarEntrega: 'Lugar de Entrega',
  observaciones: 'Observaciones',
  totalEquiposInterno: 'Total Equipos (Interno)',
  totalEquiposCliente: 'Total Equipos (Cliente)',
  totalServiciosInterno: 'Total Servicios (Interno)',
  totalServiciosCliente: 'Total Servicios (Cliente)',
  totalGastosInterno: 'Total Gastos (Interno)',
  totalGastosCliente: 'Total Gastos (Cliente)',
  totalInterno: 'Total Interno',
  totalCliente: 'Total Cliente',
  grandTotal: 'Gran Total',
  descuento: 'Descuento',
  descuentoPorcentaje: 'Descuento (%)',
  descuentoEstado: 'Estado Descuento',
}

const CURRENCY_FIELDS = new Set([
  'totalEquiposInterno', 'totalEquiposCliente',
  'totalServiciosInterno', 'totalServiciosCliente',
  'totalGastosInterno', 'totalGastosCliente',
  'totalInterno', 'totalCliente', 'grandTotal', 'descuento',
])

const HEADER_FIELDS = ['nombre', 'estado', 'moneda', 'revision', 'formaPago', 'validezOferta', 'plazoEntrega', 'lugarEntrega', 'observaciones']
const TOTAL_FIELDS = [
  'totalEquiposInterno', 'totalEquiposCliente',
  'totalServiciosInterno', 'totalServiciosCliente',
  'totalGastosInterno', 'totalGastosCliente',
  'totalInterno', 'totalCliente',
  'descuento', 'descuentoPorcentaje', 'descuentoEstado',
  'grandTotal',
]

function formatValue(field: string, value: any): string {
  if (value === undefined || value === null) return '—'
  if (CURRENCY_FIELDS.has(field)) return formatDisplayCurrency(value)
  if (typeof value === 'number') return value.toString()
  return String(value)
}

function compareArraySummary(
  arr1: any[],
  arr2: any[],
  seccion: string,
  labelGrupo: string,
  getItemCount: (g: any) => number,
  getSubtotal: (g: any) => number,
): DiffItem[] {
  const diffs: DiffItem[] = []

  const count1 = arr1.reduce((acc, g) => acc + getItemCount(g), 0)
  const count2 = arr2.reduce((acc, g) => acc + getItemCount(g), 0)

  if (count1 !== count2) {
    diffs.push({
      campo: `${seccion}_items_count`,
      label: `Cantidad de ${labelGrupo}`,
      valorBase: count1,
      valorCompare: count2,
      tipo: 'modificado',
      seccion,
    })
  }

  const groups1 = arr1.length
  const groups2 = arr2.length
  if (groups1 !== groups2) {
    diffs.push({
      campo: `${seccion}_groups_count`,
      label: 'Cantidad de grupos',
      valorBase: groups1,
      valorCompare: groups2,
      tipo: 'modificado',
      seccion,
    })
  }

  // Compare matching groups by index
  const maxGroups = Math.max(arr1.length, arr2.length)
  for (let i = 0; i < maxGroups; i++) {
    const g1 = arr1[i]
    const g2 = arr2[i]

    if (g1 && !g2) {
      diffs.push({
        campo: `${seccion}_grupo_${i}`,
        label: `Grupo "${g1.nombre}"`,
        valorBase: `${getItemCount(g1)} items`,
        valorCompare: '—',
        tipo: 'eliminado',
        seccion,
      })
      continue
    }
    if (!g1 && g2) {
      diffs.push({
        campo: `${seccion}_grupo_${i}`,
        label: `Grupo "${g2.nombre}"`,
        valorBase: '—',
        valorCompare: `${getItemCount(g2)} items`,
        tipo: 'agregado',
        seccion,
      })
      continue
    }

    // Both exist, compare
    if (g1.nombre !== g2.nombre) {
      diffs.push({
        campo: `${seccion}_grupo_${i}_nombre`,
        label: `Grupo #${i + 1} — Nombre`,
        valorBase: g1.nombre,
        valorCompare: g2.nombre,
        tipo: 'modificado',
        seccion,
      })
    }

    const sub1 = getSubtotal(g1)
    const sub2 = getSubtotal(g2)
    if (sub1 !== sub2) {
      diffs.push({
        campo: `${seccion}_grupo_${i}_subtotal`,
        label: `"${g2.nombre || g1.nombre}" — Subtotal Cliente`,
        valorBase: formatDisplayCurrency(sub1),
        valorCompare: formatDisplayCurrency(sub2),
        tipo: 'modificado',
        seccion,
      })
    }

    const ic1 = getItemCount(g1)
    const ic2 = getItemCount(g2)
    if (ic1 !== ic2) {
      diffs.push({
        campo: `${seccion}_grupo_${i}_itemcount`,
        label: `"${g2.nombre || g1.nombre}" — Items`,
        valorBase: ic1,
        valorCompare: ic2,
        tipo: 'modificado',
        seccion,
      })
    }
  }

  return diffs
}

function computeDiffs(snap1: any, snap2: any): DiffItem[] {
  const diffs: DiffItem[] = []

  // Header fields
  for (const field of HEADER_FIELDS) {
    const v1 = snap1[field]
    const v2 = snap2[field]
    if (v1 !== v2) {
      diffs.push({
        campo: field,
        label: FIELD_LABELS[field] || field,
        valorBase: v1,
        valorCompare: v2,
        tipo: v1 === undefined || v1 === null ? 'agregado' : v2 === undefined || v2 === null ? 'eliminado' : 'modificado',
        seccion: 'General',
      })
    }
  }

  // Total fields
  for (const field of TOTAL_FIELDS) {
    const v1 = snap1[field]
    const v2 = snap2[field]
    if (v1 !== v2) {
      diffs.push({
        campo: field,
        label: FIELD_LABELS[field] || field,
        valorBase: v1,
        valorCompare: v2,
        tipo: 'modificado',
        seccion: 'Totales',
      })
    }
  }

  // Equipos
  const eqDiffs = compareArraySummary(
    snap1.equipos || [], snap2.equipos || [],
    'Equipos', 'items de equipo',
    g => (g.items?.length || 0),
    g => g.subtotalCliente || 0,
  )
  diffs.push(...eqDiffs)

  // Servicios
  const svDiffs = compareArraySummary(
    snap1.servicios || [], snap2.servicios || [],
    'Servicios', 'items de servicio',
    g => (g.items?.length || 0),
    g => g.subtotalCliente || 0,
  )
  diffs.push(...svDiffs)

  // Gastos
  const gsDiffs = compareArraySummary(
    snap1.gastos || [], snap2.gastos || [],
    'Gastos', 'items de gasto',
    g => (g.items?.length || 0),
    g => g.subtotalCliente || 0,
  )
  diffs.push(...gsDiffs)

  // Condiciones count
  const cond1 = (snap1.condiciones || []).length
  const cond2 = (snap2.condiciones || []).length
  if (cond1 !== cond2) {
    diffs.push({
      campo: 'condiciones_count',
      label: 'Cantidad de condiciones',
      valorBase: cond1,
      valorCompare: cond2,
      tipo: 'modificado',
      seccion: 'Condiciones',
    })
  }

  // Exclusiones count
  const excl1 = (snap1.exclusiones || []).length
  const excl2 = (snap2.exclusiones || []).length
  if (excl1 !== excl2) {
    diffs.push({
      campo: 'exclusiones_count',
      label: 'Cantidad de exclusiones',
      valorBase: excl1,
      valorCompare: excl2,
      tipo: 'modificado',
      seccion: 'Condiciones',
    })
  }

  return diffs
}

function DiffBadge({ tipo }: { tipo: DiffItem['tipo'] }) {
  switch (tipo) {
    case 'agregado':
      return <Badge className="bg-green-100 text-green-700 text-[10px] gap-1"><Plus className="h-3 w-3" />Agregado</Badge>
    case 'eliminado':
      return <Badge className="bg-red-100 text-red-700 text-[10px] gap-1"><Minus className="h-3 w-3" />Eliminado</Badge>
    case 'modificado':
      return <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1"><Pencil className="h-3 w-3" />Modificado</Badge>
    default:
      return <Badge variant="outline" className="text-[10px] gap-1"><Equal className="h-3 w-3" />Igual</Badge>
  }
}

function CollapsibleDiffSection({ title, diffs, defaultOpen = false }: { title: string; diffs: DiffItem[]; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (diffs.length === 0) return null

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-medium text-sm">{title}</span>
        <Badge variant="secondary" className="ml-auto text-xs">{diffs.length} {diffs.length === 1 ? 'cambio' : 'cambios'}</Badge>
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1.5 px-2 w-[30%]">Campo</th>
                  <th className="text-left py-1.5 px-2 w-[25%]">Versión Base</th>
                  <th className="text-center py-1.5 px-2 w-[20%]">Tipo</th>
                  <th className="text-left py-1.5 px-2 w-[25%]">Comparada</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d) => (
                  <tr key={d.campo} className="border-b last:border-0">
                    <td className="py-1.5 px-2 font-medium">{d.label}</td>
                    <td className="py-1.5 px-2 font-mono text-muted-foreground">
                      {CURRENCY_FIELDS.has(d.campo) ? formatDisplayCurrency(d.valorBase) : formatValue(d.campo, d.valorBase)}
                    </td>
                    <td className="py-1.5 px-2 text-center"><DiffBadge tipo={d.tipo} /></td>
                    <td className="py-1.5 px-2 font-mono">
                      {CURRENCY_FIELDS.has(d.campo) ? formatDisplayCurrency(d.valorCompare) : formatValue(d.campo, d.valorCompare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VersionCompareModal({
  open, onOpenChange, versiones
}: VersionCompareModalProps) {
  const [baseId, setBaseId] = useState<string>('')
  const [compareId, setCompareId] = useState<string>('')

  const diffs = useMemo(() => {
    if (!baseId || !compareId || baseId === compareId) return null

    const base = versiones.find(v => v.id === baseId)
    const compare = versiones.find(v => v.id === compareId)
    if (!base || !compare) return null

    try {
      const snap1 = JSON.parse(base.snapshot)
      const snap2 = JSON.parse(compare.snapshot)
      return computeDiffs(snap1, snap2)
    } catch {
      return null
    }
  }, [baseId, compareId, versiones])

  const groupedDiffs = useMemo(() => {
    if (!diffs) return null
    const groups: Record<string, DiffItem[]> = {}
    for (const d of diffs) {
      if (!groups[d.seccion]) groups[d.seccion] = []
      groups[d.seccion].push(d)
    }
    return groups
  }, [diffs])

  const summary = useMemo(() => {
    if (!diffs) return null
    const modificados = diffs.filter(d => d.tipo === 'modificado').length
    const agregados = diffs.filter(d => d.tipo === 'agregado').length
    const eliminados = diffs.filter(d => d.tipo === 'eliminado').length
    return { modificados, agregados, eliminados, total: diffs.length }
  }, [diffs])

  const baseVersion = versiones.find(v => v.id === baseId)
  const compareVersion = versiones.find(v => v.id === compareId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Comparar Versiones
          </DialogTitle>
          <DialogDescription>Selecciona dos versiones para ver las diferencias</DialogDescription>
        </DialogHeader>

        {/* Version selectors */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Versión base</label>
            <Select value={baseId} onValueChange={setBaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {versiones.map(v => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === compareId}>
                    v{v.version} — {v.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="h-5 w-5 text-muted-foreground mt-5 shrink-0" />

          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Comparar con</label>
            <Select value={compareId} onValueChange={setCompareId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {versiones.map(v => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === baseId}>
                    v{v.version} — {v.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Same version warning */}
        {baseId && compareId && baseId === compareId && (
          <p className="text-sm text-amber-600">Selecciona dos versiones distintas para comparar.</p>
        )}

        {/* Results */}
        {diffs && groupedDiffs && summary && (
          <>
            <Separator />

            {/* Summary */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                v{baseVersion?.version} vs v{compareVersion?.version}:
              </span>
              {summary.total === 0 ? (
                <Badge variant="outline" className="bg-green-50 text-green-700">Sin diferencias</Badge>
              ) : (
                <div className="flex gap-2">
                  {summary.modificados > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">{summary.modificados} modificados</Badge>
                  )}
                  {summary.agregados > 0 && (
                    <Badge className="bg-green-100 text-green-700 text-xs">{summary.agregados} agregados</Badge>
                  )}
                  {summary.eliminados > 0 && (
                    <Badge className="bg-red-100 text-red-700 text-xs">{summary.eliminados} eliminados</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Grouped diff sections */}
            {summary.total > 0 && (
              <div className="space-y-3">
                {Object.entries(groupedDiffs).map(([seccion, items]) => (
                  <CollapsibleDiffSection
                    key={seccion}
                    title={seccion}
                    diffs={items}
                    defaultOpen={seccion === 'General' || seccion === 'Totales'}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {(!baseId || !compareId) && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Selecciona dos versiones para ver las diferencias
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
