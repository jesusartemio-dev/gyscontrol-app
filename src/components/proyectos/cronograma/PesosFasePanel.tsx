'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Scale, Loader2, RotateCcw, Save, ChevronRight, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { repartirA100 } from '@/lib/utils/repartirA100'

interface PesoFaseItem {
  faseId: string
  nombre: string
  orden: number
  horasFase: number
  avanceFase: number
  pesoHorasDefault: number
  pesoManual: number | null
  pesoEfectivo: number
}
interface PesosResp {
  cronogramaId: string | null
  horasTotal: number
  fases: PesoFaseItem[]
  avanceGlobal: number
}

/**
 * Panel compacto y colapsable para asignar a mano el peso % de cada FASE del cronograma de
 * ejecución. Debajo de la fase todo se reparte por horas. Los pesos se normalizan a 100%
 * automáticamente; la columna mostrada suma EXACTAMENTE 100% (método del resto mayor).
 */
export function PesosFasePanel({ proyectoId }: { proyectoId: string }) {
  const [data, setData] = useState<PesosResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false) // colapsado por defecto: el cronograma manda
  const [manual, setManual] = useState<Record<string, string>>({})

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/pesos-fase`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar pesos')
      const json: PesosResp = await res.json()
      setData(json)
      setManual(Object.fromEntries(json.fases.map((f) => [f.faseId, f.pesoManual != null ? String(f.pesoManual) : ''])))
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [proyectoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cálculo en vivo (raw = manual ?? sugerido; normaliza a 100%); display con resto mayor.
  const live = useMemo(() => {
    if (!data) return null
    const n = data.fases.length || 1
    const raws = data.fases.map((f) => {
      const txt = manual[f.faseId]
      const v = txt !== undefined && txt !== '' ? Number(txt) : f.pesoHorasDefault
      return Number.isFinite(v) && v >= 0 ? v : 0
    })
    const sumaRaw = raws.reduce((s, r) => s + r, 0)
    const efectivos = raws.map((r) => (sumaRaw > 0 ? (r / sumaRaw) * 100 : 100 / n))
    const efectivosDisplay = repartirA100(efectivos, 1) // suma EXACTA 100.0
    const avanceGlobal = data.fases.reduce((s, f, i) => s + (efectivos[i] / 100) * f.avanceFase, 0)
    return { efectivos, efectivosDisplay, avanceGlobal }
  }, [data, manual])

  const dirty = useMemo(() => {
    if (!data) return false
    return data.fases.some((f) => {
      const txt = manual[f.faseId] ?? ''
      return txt !== (f.pesoManual != null ? String(f.pesoManual) : '')
    })
  }, [data, manual])

  const guardar = async () => {
    if (!data) return
    setSaving(true)
    try {
      const pesos = data.fases.map((f) => {
        const txt = manual[f.faseId]
        return { faseId: f.faseId, pesoManual: txt !== undefined && txt !== '' ? Number(txt) : null }
      })
      const res = await fetch(`/api/proyectos/${proyectoId}/pesos-fase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pesos }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error al guardar')
      const json: PesosResp = await res.json()
      setData(json)
      setManual(Object.fromEntries(json.fases.map((f) => [f.faseId, f.pesoManual != null ? String(f.pesoManual) : ''])))
      toast.success('Pesos de fase guardados')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const usarSugeridos = () => {
    if (data) setManual(Object.fromEntries(data.fases.map((f) => [f.faseId, ''])))
  }

  if (loading) return <Skeleton className="h-9 w-full rounded-lg mb-2" />
  if (!data || data.fases.length === 0) return null

  const avanceGlobal = live?.avanceGlobal ?? data.avanceGlobal
  const sumaEfectivo = live ? live.efectivosDisplay.reduce((s, v) => s + v, 0) : 100

  return (
    <Card className="mb-2">
      {/* Barra compacta (siempre visible) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <Scale className="h-4 w-4 text-indigo-500" />
        <span className="font-medium">Pesos por fase</span>
        <span className="text-muted-foreground text-xs">
          · Avance global <span className="font-mono font-semibold text-foreground">{avanceGlobal.toFixed(1)}%</span>
          {' · '}suma <span className={`font-mono ${Math.round(sumaEfectivo * 10) === 1000 ? 'text-emerald-600' : 'text-amber-600'}`}>{sumaEfectivo.toFixed(1)}%</span>
        </span>
        {dirty && <span className="text-[10px] text-amber-600 font-medium">· sin guardar</span>}
        <span className="ml-auto text-xs text-muted-foreground">{open ? 'ocultar' : 'editar'}</span>
      </button>

      {/* Tabla editable (colapsable) */}
      {open && (
        <div className="px-3 pb-3 border-t">
          <div className="flex justify-end gap-2 py-2">
            <Button size="sm" variant="ghost" className="h-7" onClick={usarSugeridos} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Usar sugeridos
            </Button>
            <Button size="sm" className="h-7" onClick={guardar} disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />} Guardar
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-1.5 font-medium">Fase</th>
                  <th className="text-right py-1.5 font-medium">Horas</th>
                  <th className="text-right py-1.5 font-medium">Sugerido</th>
                  <th className="text-right py-1.5 font-medium w-24">Peso %</th>
                  <th className="text-right py-1.5 font-medium">Efectivo</th>
                  <th className="text-right py-1.5 font-medium">Avance</th>
                </tr>
              </thead>
              <tbody>
                {data.fases.map((f, i) => (
                  <tr key={f.faseId} className="border-b last:border-0">
                    <td className="py-1 font-medium">{f.nombre}</td>
                    <td className="py-1 text-right text-muted-foreground">{f.horasFase}h</td>
                    <td className="py-1 text-right text-muted-foreground">{f.pesoHorasDefault.toFixed(1)}%</td>
                    <td className="py-1 text-right">
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        className="h-7 text-right text-sm ml-auto w-20"
                        placeholder={f.pesoHorasDefault.toFixed(1)}
                        value={manual[f.faseId] ?? ''}
                        onChange={(e) => setManual((p) => ({ ...p, [f.faseId]: e.target.value }))}
                      />
                    </td>
                    <td className="py-1 text-right font-mono font-medium text-indigo-600">
                      {(live ? live.efectivosDisplay[i] : f.pesoEfectivo).toFixed(1)}%
                    </td>
                    <td className="py-1 text-right font-mono">{f.avanceFase.toFixed(1)}%</td>
                  </tr>
                ))}
                {/* Total */}
                <tr className="border-t-2 font-medium">
                  <td className="py-1.5">Total</td>
                  <td className="py-1.5 text-right text-muted-foreground">{data.horasTotal}h</td>
                  <td className="py-1.5" />
                  <td className="py-1.5" />
                  <td className="py-1.5 text-right font-mono text-emerald-600">{sumaEfectivo.toFixed(1)}%</td>
                  <td className="py-1.5 text-right font-mono">{avanceGlobal.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Vacío = usa el sugerido por horas. Se normaliza a 100% automáticamente. Debajo de la fase, EDT/actividad/tarea se reparten por horas.
          </p>
        </div>
      )}
    </Card>
  )
}
