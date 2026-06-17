'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Scale, Loader2, RotateCcw, Save, ChevronRight, ChevronDown, Wand2, Pencil } from 'lucide-react'
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
  sumaPesos: number
}

/**
 * Panel compacto y colapsable para asignar a mano el peso % de cada FASE del cronograma de
 * ejecución. NO modifica lo que el usuario escribe: muestra la suma y avisa si no llega a
 * 100% (con un botón para normalizar a mano). Debajo de la fase todo se reparte por horas.
 */
export function PesosFasePanel({ proyectoId, onGuardado }: { proyectoId: string; onGuardado?: () => void }) {
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

  // Peso usado por fase = lo que el usuario escribió, o el sugerido por horas si está vacío.
  // NO se normaliza: lo que ves es lo que se usa. La suma puede no dar 100 → se indica.
  const live = useMemo(() => {
    if (!data) return null
    const raws = data.fases.map((f) => {
      const t = manual[f.faseId]
      const v = t !== undefined && t !== '' ? Number(t) : f.pesoHorasDefault
      return Number.isFinite(v) && v >= 0 ? v : 0
    })
    const suma = raws.reduce((s, r) => s + r, 0)
    const avanceGlobal = data.fases.reduce((s, f, i) => s + (raws[i] / 100) * f.avanceFase, 0)
    return { raws, suma, avanceGlobal }
  }, [data, manual])

  const cuadra = live ? Math.abs(live.suma - 100) < 0.05 : true
  const delta = live ? 100 - live.suma : 0

  const dirty = useMemo(() => {
    if (!data) return false
    return data.fases.some((f) => (manual[f.faseId] ?? '') !== (f.pesoManual != null ? String(f.pesoManual) : ''))
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
      onGuardado?.() // refresca el árbol (columna Peso) sin tener que recalcular
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const usarSugeridos = () => {
    if (data) setManual(Object.fromEntries(data.fases.map((f) => [f.faseId, ''])))
  }

  // Reescala los valores actuales para que sumen 100% y los escribe en los inputs (acción
  // explícita del usuario; nunca automática).
  const normalizar = () => {
    if (!data || !live || live.suma <= 0) return
    const norm = repartirA100(live.raws.map((r) => (r / live.suma) * 100), 1)
    setManual(Object.fromEntries(data.fases.map((f, i) => [f.faseId, String(norm[i])])))
  }

  if (loading) return <Skeleton className="h-9 w-full rounded-lg mb-2" />
  if (!data || data.fases.length === 0) return null

  const avanceGlobal = live?.avanceGlobal ?? data.avanceGlobal
  const suma = live?.suma ?? data.sumaPesos

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
          · Avance global <span className="font-mono font-semibold text-foreground">{avanceGlobal.toFixed(2)}%</span>
          {' · '}suma{' '}
          <span className={`font-mono font-semibold ${cuadra ? 'text-emerald-600' : 'text-amber-600'}`}>{suma.toFixed(2)}%</span>
          {!cuadra && <span className="text-amber-600"> ({delta > 0 ? 'faltan' : 'sobran'} {Math.abs(delta).toFixed(2)}%)</span>}
        </span>
        {dirty && <span className="text-[10px] text-amber-600 font-medium">· sin guardar</span>}
        <span className="ml-auto text-xs text-muted-foreground">{open ? 'ocultar' : 'editar'}</span>
      </button>

      {/* Tabla editable (colapsable) */}
      {open && (
        <div className="px-3 pb-3 border-t">
          <div className="flex items-center justify-end gap-2 py-2">
            {!cuadra && (
              <span className="text-xs text-amber-600 mr-auto">
                ⚠ La suma es {suma.toFixed(2)}% — {delta > 0 ? 'faltan' : 'sobran'} {Math.abs(delta).toFixed(2)}%.
              </span>
            )}
            <Button size="sm" variant="ghost" className="h-7" onClick={usarSugeridos} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Usar sugeridos
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={normalizar} disabled={saving || cuadra}>
              <Wand2 className="h-3.5 w-3.5 mr-1" /> Normalizar a 100%
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
                  <th className="text-right py-1.5 font-medium w-24">
                    <span className="inline-flex items-center gap-1 justify-end text-indigo-600">
                      <Pencil className="h-3 w-3" /> Peso % <span className="text-muted-foreground font-normal">(editable)</span>
                    </span>
                  </th>
                  <th className="text-right py-1.5 font-medium">Avance</th>
                </tr>
              </thead>
              <tbody>
                {data.fases.map((f) => (
                  <tr key={f.faseId} className="border-b last:border-0">
                    <td className="py-1 font-medium">{f.nombre}</td>
                    <td className="py-1 text-right text-muted-foreground">{f.horasFase}h</td>
                    <td className="py-1 text-right text-muted-foreground">{f.pesoHorasDefault.toFixed(2)}%</td>
                    <td className="py-1 text-right">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-7 text-right text-sm ml-auto w-20"
                        placeholder={f.pesoHorasDefault.toFixed(2)}
                        value={manual[f.faseId] ?? ''}
                        onChange={(e) => setManual((p) => ({ ...p, [f.faseId]: e.target.value }))}
                      />
                    </td>
                    <td className="py-1 text-right font-mono">{f.avanceFase.toFixed(2)}%</td>
                  </tr>
                ))}
                {/* Total */}
                <tr className="border-t-2 font-medium">
                  <td className="py-1.5">Total</td>
                  <td className="py-1.5 text-right text-muted-foreground">{data.horasTotal}h</td>
                  <td className="py-1.5" />
                  <td className={`py-1.5 text-right font-mono ${cuadra ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {suma.toFixed(2)}%
                  </td>
                  <td className="py-1.5 text-right font-mono">{avanceGlobal.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Vacío = usa el sugerido por horas. No se modifica lo que escribes: si la suma no da 100%,
            ajústala o usa &quot;Normalizar a 100%&quot;. Debajo de la fase, EDT/actividad/tarea se reparten por horas.
          </p>
        </div>
      )}
    </Card>
  )
}
