'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Home, ChevronRight, TrendingUp, Loader2, Activity, AlertTriangle,
  Calendar, Camera, Target, Check, Trash2,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { formatearSemanaIso } from '@/lib/utils/isoWeek'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ProyectoLight { id: string; codigo: string; nombre: string }
interface AvanceWeek {
  weekStart: string   // "YYYY-MM-DD" UTC (lunes de la semana ISO)
  weekLabel: string
  planificadoAcum: number | null
  realAcum: number | null
}
interface SnapshotResumen { semanaIso: string; progresoGeneral: number }
interface CurvaAvanceResponse {
  weeks: AvanceWeek[]
  hasBaseline: boolean
  tieneSnapshots: boolean
  cronogramaPlanId: string | null
  cronogramaEjecId: string | null
  proyecto: ProyectoLight
  snapshots: SnapshotResumen[]
}

// weekStart es "YYYY-MM-DD" en UTC. Para derivar semanaIso en el cliente sin
// errores de timezone, parseamos las partes de la fecha como fecha LOCAL (no UTC).
function semanaIsoDeWeekStart(weekStart: string): string {
  const [y, m, d] = weekStart.slice(0, 10).split('-').map(Number)
  return formatearSemanaIso(new Date(y, m - 1, d))
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(1)}%`)

const ROLES_EDICION = ['admin', 'gerente', 'gestor', 'proyectos', 'coordinador']

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CurvaSAvancePage() {
  const { data: session } = useSession()
  const puedeEditar = ROLES_EDICION.includes((session?.user as { role?: string } | undefined)?.role ?? '')

  const [proyectos, setProyectos] = useState<ProyectoLight[]>([])
  const [proyectoId, setProyectoId] = useState('')
  const [data, setData] = useState<CurvaAvanceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProyectos, setLoadingProyectos] = useState(true)
  const [error, setError] = useState('')

  // Estado de la tabla editable
  const [valorEditable, setValorEditable] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState<Record<string, boolean>>({})
  const [confirmBorrar, setConfirmBorrar] = useState<string | null>(null)

  // ── Lista de proyectos ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingProyectos(true)
    fetch('/api/proyectos?fields=id,codigo,nombre')
      .then((r) => r.json())
      .then((list: ProyectoLight[]) => setProyectos(Array.isArray(list) ? list : []))
      .catch(() => setProyectos([]))
      .finally(() => setLoadingProyectos(false))
  }, [])

  // ── Carga de la curva ──────────────────────────────────────────────────────
  // Extraída a useCallback para que mutaciones puedan recargar sin duplicar código.
  const cargarCurva = useCallback(() => {
    if (!proyectoId) { setData(null); setError(''); return }
    setLoading(true); setError(''); setData(null)
    fetch(`/api/proyectos/${proyectoId}/curva-avance`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`)
        return r.json()
      })
      .then((result: CurvaAvanceResponse) => setData(result))
      .catch((e: Error) => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }, [proyectoId])

  useEffect(() => { cargarCurva() }, [cargarCurva])

  // ── Inicializar inputs desde snapshots al cargar data ─────────────────────
  useEffect(() => {
    if (!data) { setValorEditable({}); return }
    // Actualización funcional: sincroniza los valores de snapshots existentes,
    // pero no toca semanas sin snapshot (preserva edits en progreso si hubiera).
    setValorEditable((prev) => {
      const next = { ...prev }
      for (const s of data.snapshots) {
        next[s.semanaIso] = s.progresoGeneral.toFixed(2)
      }
      return next
    })
  }, [data])

  // ── Mapa rápido semanaIso → progresoGeneral ───────────────────────────────
  const snapshotMap = new Map(
    (data?.snapshots ?? []).map((s) => [s.semanaIso, s.progresoGeneral]),
  )

  // ── Helpers de la tabla ───────────────────────────────────────────────────
  function tieneCambios(semanaIso: string): boolean {
    const valorStr = (valorEditable[semanaIso] ?? '').trim()
    if (!snapshotMap.has(semanaIso)) return valorStr !== ''
    if (!valorStr) return false
    const parsed = parseFloat(valorStr)
    if (isNaN(parsed)) return false
    return Math.abs(parsed - snapshotMap.get(semanaIso)!) > 0.005
  }

  async function guardarSemana(semanaIso: string) {
    const valorStr = (valorEditable[semanaIso] ?? '').trim()
    const nuevoValor = parseFloat(valorStr)
    if (isNaN(nuevoValor) || nuevoValor < 0 || nuevoValor > 100) {
      toast.error('El valor debe estar entre 0 y 100')
      return
    }
    setGuardando((g) => ({ ...g, [semanaIso]: true }))
    try {
      if (snapshotMap.has(semanaIso)) {
        // Editar progresoGeneral del snapshot existente (PUT)
        const res = await fetch(`/api/proyectos/${proyectoId}/snapshot`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semanaIso, progresoGeneral: nuevoValor }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`)
        toast.success(`${semanaIso} actualizado a ${nuevoValor.toFixed(1)}%`)
      } else {
        // Crear snapshot con la foto actual del proyecto (POST),
        // luego ajustar el valor si el usuario escribió uno diferente (PUT).
        const resPost = await fetch(`/api/proyectos/${proyectoId}/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semanaIso }),
        })
        if (!resPost.ok) throw new Error((await resPost.json().catch(() => ({}))).error || `Error ${resPost.status}`)
        const postData = await resPost.json() as { progresoGeneral: number }
        if (Math.abs(postData.progresoGeneral - nuevoValor) > 0.005) {
          const resPut = await fetch(`/api/proyectos/${proyectoId}/snapshot`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ semanaIso, progresoGeneral: nuevoValor }),
          })
          if (!resPut.ok) throw new Error((await resPut.json().catch(() => ({}))).error || `Error ${resPut.status}`)
          toast.success(`Snapshot creado y ajustado a ${nuevoValor.toFixed(1)}%`)
        } else {
          toast.success(`Snapshot creado: ${postData.progresoGeneral.toFixed(1)}%`)
        }
      }
      cargarCurva()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando((g) => ({ ...g, [semanaIso]: false }))
    }
  }

  async function borrarSemana(semanaIso: string) {
    setGuardando((g) => ({ ...g, [semanaIso]: true }))
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/snapshot?semanaIso=${encodeURIComponent(semanaIso)}`,
        { method: 'DELETE' },
      )
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`)
      toast.success(`Snapshot de ${semanaIso} eliminado`)
      setConfirmBorrar(null)
      cargarCurva()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al borrar')
    } finally {
      setGuardando((g) => ({ ...g, [semanaIso]: false }))
    }
  }

  // ── "A la fecha" = última semana con valor real ───────────────────────────
  let refReal: number | null = null
  let refPlan: number | null = null
  if (data) {
    for (const w of data.weeks) if (w.realAcum != null) { refReal = w.realAcum; refPlan = w.planificadoAcum }
  }
  const indice = refReal != null && refPlan != null && refPlan > 0 ? refReal / refPlan : null

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors"><Home className="h-3.5 w-3.5" /></Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion" className="hover:text-foreground transition-colors">Gestión</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion/reportes" className="hover:text-foreground transition-colors">Reportes</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Curva S — Avance</span>
      </nav>

      {/* Header + Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Curva S — Avance físico</h1>
          <p className="text-sm text-muted-foreground">
            % planificado (línea base) vs % real (snapshots) por semana
          </p>
        </div>
        <Select value={proyectoId} onValueChange={setProyectoId} disabled={loadingProyectos}>
          <SelectTrigger className="w-[320px] text-xs h-9">
            <SelectValue placeholder={loadingProyectos ? 'Cargando proyectos...' : 'Seleccionar proyecto...'} />
          </SelectTrigger>
          <SelectContent>
            {proyectos.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.codigo} — {p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <Card><CardContent className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </CardContent></Card>
      )}

      {!proyectoId && !loading && (
        <Card><CardContent className="p-16 text-center">
          <TrendingUp className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Selecciona un proyecto</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Compara el avance planificado (cronograma línea base) vs el avance real
            registrado en los snapshots semanales.
          </p>
        </CardContent></Card>
      )}

      {data && !loading && (
        <>
          {/* Avisos */}
          {!data.hasBaseline && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Sin línea base.</span>{' '}
                Este proyecto no tiene cronograma de planificación marcado como línea base,
                por lo que no se puede dibujar la curva planeada.
              </div>
            </div>
          )}
          {!data.tieneSnapshots && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <Camera className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Aún no hay snapshots de avance.</span>{' '}
                Toma uno desde el reporte semanal del proyecto para empezar a trazar la curva real.
              </div>
            </div>
          )}

          {/* Chart — intacto */}
          {data.weeks.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{data.proyecto.codigo} — Curva S de avance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={420}>
                  <ComposedChart data={data.weeks} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="weekLabel"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                      tickFormatter={(val: string, idx: number) =>
                        data.weeks.length > 30 ? (idx % 4 === 0 ? val : '') : val}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                      width={48}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [value == null ? '—' : `${value.toFixed(1)}%`, name]}
                      labelFormatter={(label: string) => `Semana del ${label}`}
                    />
                    <Legend verticalAlign="top" />
                    <Line type="monotone" dataKey="planificadoAcum" name="Planificado" stroke="#3B82F6" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
                    <Line type="monotone" dataKey="realAcum" name="Real" stroke="#10B981" strokeWidth={2.5} dot={false} connectNulls />
                    <ReferenceLine y={100} stroke="#9CA3AF" strokeDasharray="4 2" label={{ value: 'Meta 100%', position: 'insideTopRight', fill: '#6B7280', fontSize: 11 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Sin datos suficientes para generar la curva. Verifica que el proyecto tenga
                cronograma con tareas o algún snapshot de avance.
              </p>
            </CardContent></Card>
          )}

          {/* Summary Cards — intactas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard icon={Calendar} iconColor="text-blue-500" label="Planeado a la fecha" value={pct(refPlan)} />
            <SummaryCard icon={TrendingUp} iconColor="text-emerald-500" label="Real a la fecha" value={pct(refReal)} />
            <IndiceCard indice={indice} />
          </div>

          {/* ─── Tabla editable de snapshots ─── */}
          {data.weeks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Snapshots por semana
                  {!puedeEditar && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(solo lectura)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs pl-4 w-40">Semana</TableHead>
                        <TableHead className="text-xs text-right w-24">Plan %</TableHead>
                        <TableHead className="text-xs text-right w-36">Real %</TableHead>
                        <TableHead className="text-xs w-28">Estado</TableHead>
                        {puedeEditar && <TableHead className="text-xs w-20">Acción</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.weeks.map((week) => {
                        const semanaIso = semanaIsoDeWeekStart(week.weekStart)
                        const tieneSnap = snapshotMap.has(semanaIso)
                        const estaGuardando = guardando[semanaIso] ?? false
                        const hayCambios = tieneCambios(semanaIso)
                        return (
                          <TableRow key={semanaIso} className="text-xs">
                            {/* Semana */}
                            <TableCell className="pl-4 py-1.5">
                              <span className="font-medium">{week.weekLabel}</span>
                              <span className="block text-muted-foreground font-mono text-[10px]">{semanaIso}</span>
                            </TableCell>
                            {/* Plan % — solo lectura */}
                            <TableCell className="text-right font-mono text-muted-foreground py-1.5">
                              {pct(week.planificadoAcum)}
                            </TableCell>
                            {/* Real % — input editable */}
                            <TableCell className="text-right py-1.5">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                disabled={!puedeEditar || estaGuardando}
                                value={valorEditable[semanaIso] ?? ''}
                                onChange={(e) =>
                                  setValorEditable((v) => ({ ...v, [semanaIso]: e.target.value }))
                                }
                                placeholder="—"
                                className="w-20 text-right font-mono text-xs border border-input rounded px-1.5 py-0.5 bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </TableCell>
                            {/* Estado */}
                            <TableCell className="py-1.5">
                              {tieneSnap ? (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700">
                                  tomado
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500">
                                  sin snapshot
                                </span>
                              )}
                            </TableCell>
                            {/* Acciones — solo si puedeEditar */}
                            {puedeEditar && (
                              <TableCell className="py-1.5">
                                <div className="flex items-center gap-1">
                                  {estaGuardando ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                  ) : (
                                    <>
                                      {hayCambios && (
                                        <button
                                          onClick={() => guardarSemana(semanaIso)}
                                          title="Guardar"
                                          className="inline-flex items-center justify-center h-6 w-6 rounded text-green-600 hover:bg-green-50 transition-colors"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {tieneSnap && (
                                        <button
                                          onClick={() => setConfirmBorrar(semanaIso)}
                                          title="Borrar snapshot"
                                          className="inline-flex items-center justify-center h-6 w-6 rounded text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* AlertDialog de confirmación de borrado */}
      <AlertDialog open={!!confirmBorrar} onOpenChange={(open) => { if (!open) setConfirmBorrar(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el snapshot de la semana{' '}
              <span className="font-mono font-medium">{confirmBorrar}</span>.
              La línea Real del gráfico perderá el punto de esa semana.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmBorrar) borrarSemana(confirmBorrar) }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Sub-components (sin cambios) ─────────────────────────────────────────────

function SummaryCard({
  icon: Icon, iconColor, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  label: string
  value: string
}) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono">{value}</p>
    </CardContent></Card>
  )
}

function indiceColor(i: number) {
  if (i >= 1.0) return { bg: 'bg-green-50', text: 'text-green-700' }
  if (i >= 0.9) return { bg: 'bg-yellow-50', text: 'text-yellow-700' }
  return { bg: 'bg-red-50', text: 'text-red-700' }
}

function IndiceCard({ indice }: { indice: number | null }) {
  const c = indice != null ? indiceColor(indice) : { bg: 'bg-gray-50', text: 'text-gray-500' }
  return (
    <Card className={indice != null ? c.bg : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {indice != null ? <Activity className={`h-4 w-4 ${c.text}`} /> : <Target className="h-4 w-4 text-gray-400" />}
          <span className="text-xs text-muted-foreground">Índice de avance (real / plan)</span>
        </div>
        <p className={`text-2xl font-bold font-mono ${indice != null ? c.text : 'text-gray-400'}`}>
          {indice != null ? indice.toFixed(2) : '—'}
        </p>
        {indice != null && (
          <p className={`text-xs ${c.text}`}>
            {indice >= 1.0 ? 'En tiempo o adelantado' : indice >= 0.9 ? 'Leve retraso' : 'Retraso significativo'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
