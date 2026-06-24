'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, ChevronRight, Sparkles, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { ValorizacionExtracted, ValorizacionDiff } from '@/lib/agente/valorizacionExtractor'

// ── Tipos ─────────────────────────────────────────────────

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface ValResumen {
  id: string
  numero: number
  estado: string
  periodoFin: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  proyectoId?: string        // pre-selected (from detail page)
  valorizacionId?: string    // if given, forces verify mode
  proyectos?: Proyecto[]
  onSuccess?: (valId?: string) => void
}

type Mode = 'crear' | 'verificar'
type Step = 'upload' | 'processing' | 'result'

// ── Helpers ───────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function fmtNum(n: number | null | undefined, dec = 2): string {
  if (n == null) return '—'
  return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

// SSE stream reader (POST-compatible — no EventSource)
async function consumeSSE(
  res: Response,
  onProgress: (msg: string) => void,
  onResult: (data: unknown) => void,
  onError: (msg: string) => void,
): Promise<void> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  const process = (part: string) => {
    const lines = part.split('\n')
    let event = '', data = ''
    for (const l of lines) {
      if (l.startsWith('event: ')) event = l.slice(7).trim()
      else if (l.startsWith('data: ')) data = l.slice(6).trim()
    }
    if (!event) return
    try {
      const parsed = data ? JSON.parse(data) : {}
      if (event === 'progress') onProgress(parsed.message ?? '')
      else if (event === 'result') onResult(parsed)
      else if (event === 'error') onError(parsed.error ?? 'Error desconocido')
    } catch { /* skip bad parts */ }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) { if (buf.trim()) process(buf); break }
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop()!
    for (const part of parts) process(part)
  }
}

// ── Subcomponente: Zona de upload ─────────────────────────

function FileDropzone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.match(/\.xlsx?$/i)) onFile(f)
    else toast.error('Solo se aceptan archivos Excel (.xlsx)')
  }, [onFile])

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/20' : 'border-muted-foreground/30 hover:border-teal-400 hover:bg-muted/40'}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-medium">Arrastra aquí o haz clic para subir</p>
      <p className="text-xs text-muted-foreground mt-1">Excel del cliente (.xlsx) — máximo 20MB</p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </div>
  )
}

// ── Subcomponente: Preview crear ──────────────────────────

function PreviewCrear({
  resultado,
  onConfirm,
  onDiscard,
  saving,
}: {
  resultado: ValorizacionExtracted
  onConfirm: () => void
  onDiscard: () => void
  saving: boolean
}) {
  const { cabecera: c, partidas, advertencias, confianza } = resultado
  return (
    <div className="space-y-4">
      {/* Confianza */}
      <div className="flex items-center gap-2">
        <Badge variant={confianza === 'alta' ? 'default' : confianza === 'media' ? 'secondary' : 'destructive'}>
          Confianza {confianza}
        </Badge>
        {c.codigoDocumento && <span className="text-xs text-muted-foreground">{c.codigoDocumento}</span>}
      </div>

      {/* Advertencias */}
      {advertencias.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Advertencias IA
          </p>
          {advertencias.map((a, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-400">• {a}</p>
          ))}
        </div>
      )}

      {/* Cabecera */}
      <div className="rounded-md border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datos del documento</p>
        {/* Cifra principal: subtotal sin IGV (lo que el cliente destaca en el documento) */}
        <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-md p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">Subtotal sin IGV</p>
            <p className="text-xs text-teal-600 dark:text-teal-500 mt-0.5">Cifra principal del documento</p>
          </div>
          <p className="text-xl font-bold text-teal-700 dark:text-teal-300">
            {c.moneda} {fmtNum(c.subtotalSinIGV ?? c.montoValorizacion)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {c.clienteNombre && <><span className="text-muted-foreground">Cliente</span><span className="font-medium">{c.clienteNombre}</span></>}
          {c.proyectoNombre && <><span className="text-muted-foreground">Proyecto</span><span className="font-medium">{c.proyectoNombre}</span></>}
          <span className="text-muted-foreground">Período</span>
          <span className="font-medium">{fmtDate(c.periodoInicio)} — {fmtDate(c.periodoFin)}</span>
          <span className="text-muted-foreground">Moneda</span><span className="font-medium">{c.moneda}</span>
          {c.montoValorizacion != null && c.subtotalSinIGV != null && Math.abs(c.montoValorizacion - c.subtotalSinIGV) > 0.5 && (
            <><span className="text-muted-foreground">Monto bruto</span><span className="font-medium">{fmtNum(c.montoValorizacion)}</span></>
          )}
          <span className="text-muted-foreground">IGV {c.igvPorcentaje}%</span>
          <span className="font-medium">{(c.subtotalSinIGV ?? c.montoValorizacion) != null ? fmtNum((c.subtotalSinIGV ?? c.montoValorizacion)! * c.igvPorcentaje / 100) : '—'}</span>
          <span className="text-muted-foreground">Neto con IGV</span>
          <span className="font-semibold text-green-700 dark:text-green-400">{c.moneda} {fmtNum(c.netoARecibir)}</span>
          {c.adelantoPorcentaje > 0 && <><span className="text-muted-foreground">Amort. adelanto</span><span>{c.adelantoPorcentaje}%</span></>}
          {c.descuentoComercialPorcentaje > 0 && <><span className="text-muted-foreground">Descuento comercial</span><span>{c.descuentoComercialPorcentaje}%</span></>}
          {c.fondoGarantiaPorcentaje > 0 && <><span className="text-muted-foreground">Fondo garantía</span><span>{c.fondoGarantiaPorcentaje}%</span></>}
        </div>
      </div>

      {/* Partidas */}
      {partidas.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide p-3 border-b bg-muted/30">
            Partidas extraídas ({partidas.length})
          </p>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">#</th>
                  <th className="text-left p-2 font-medium">Descripción</th>
                  <th className="text-right p-2 font-medium">Contractual</th>
                  <th className="text-right p-2 font-medium">% Ant.</th>
                  <th className="text-right p-2 font-medium">% Act.</th>
                  <th className="text-right p-2 font-medium">Monto período</th>
                </tr>
              </thead>
              <tbody>
                {partidas.map((p, i) => (
                  <tr key={i} className="border-t hover:bg-muted/20">
                    <td className="p-2 text-muted-foreground">{p.numero}</td>
                    <td className="p-2 max-w-[200px] truncate">{p.descripcion}</td>
                    <td className="p-2 text-right">{fmtNum(p.montoContractual)}</td>
                    <td className="p-2 text-right text-muted-foreground">{fmtNum(p.porcentajeAcumuladoAnterior, 1)}%</td>
                    <td className="p-2 text-right">{fmtNum(p.porcentajeAcumuladoActual, 1)}%</td>
                    <td className="p-2 text-right font-medium">{fmtNum(p.montoAvance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onDiscard} disabled={saving}>Descartar</Button>
        <Button onClick={onConfirm} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Crear Valorización</>}
        </Button>
      </div>
    </div>
  )
}

// ── Subcomponente: Diff verificar ─────────────────────────

function DiffVerificar({
  diff,
  onDiscard,
}: {
  diff: ValorizacionDiff
  onDiscard: () => void
}) {
  const { resumen } = diff
  const pct = resumen.totalCampos > 0 ? Math.round(resumen.coinciden / resumen.totalCampos * 100) : 0

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="default" className="bg-green-600 text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {resumen.coinciden} coinciden
        </Badge>
        {resumen.difieren > 0 && (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" /> {resumen.difieren} difieren
          </Badge>
        )}
        {resumen.partidasSoloDoc > 0 && (
          <Badge variant="secondary">{resumen.partidasSoloDoc} solo en documento</Badge>
        )}
        {resumen.partidasSoloSistema > 0 && (
          <Badge variant="secondary">{resumen.partidasSoloSistema} solo en sistema</Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{pct}% de coincidencia</span>
      </div>

      {resumen.difieren === 0 && resumen.partidasSoloDoc === 0 && resumen.partidasSoloSistema === 0 ? (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Los datos coinciden perfectamente</p>
          <p className="text-xs text-muted-foreground mt-1">El sistema está alineado con el documento del cliente.</p>
        </div>
      ) : (
        <>
          {/* Diff cabecera */}
          {diff.cabecera.some(d => !d.coincide) && (
            <div className="rounded-md border overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide p-3 border-b bg-muted/30">
                Diferencias en cabecera
              </p>
              <table className="w-full text-xs">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left p-2 font-medium">Campo</th>
                    <th className="text-left p-2 font-medium">En sistema</th>
                    <th className="text-left p-2 font-medium">En documento</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {diff.cabecera.filter(d => !d.coincide).map((d, i) => (
                    <tr key={i} className="border-t bg-red-50/40 dark:bg-red-950/10">
                      <td className="p-2 font-medium text-muted-foreground">{d.label}</td>
                      <td className="p-2">{d.valorSistema ?? '—'}{d.unidad ? ` ${d.unidad}` : ''}</td>
                      <td className="p-2 font-semibold text-red-700 dark:text-red-400">{d.valorDocumento ?? '—'}{d.unidad ? ` ${d.unidad}` : ''}</td>
                      <td className="p-2"><AlertTriangle className="h-3 w-3 text-amber-500" /></td>
                    </tr>
                  ))}
                  {diff.cabecera.filter(d => d.coincide).map((d, i) => (
                    <tr key={`ok-${i}`} className="border-t opacity-50">
                      <td className="p-2 text-muted-foreground">{d.label}</td>
                      <td className="p-2">{d.valorSistema ?? '—'}</td>
                      <td className="p-2">{d.valorDocumento ?? '—'}</td>
                      <td className="p-2"><CheckCircle2 className="h-3 w-3 text-green-500" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Diff partidas */}
          {diff.partidas.some(p => !p.coincide) && (
            <div className="rounded-md border overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide p-3 border-b bg-muted/30">
                Diferencias en partidas
              </p>
              <div className="max-h-56 overflow-y-auto">
                {diff.partidas.filter(p => !p.coincide).map((p, pi) => (
                  <div key={pi} className="border-b last:border-0 p-3">
                    <p className="text-xs font-medium mb-1">
                      {p.soloEnDocumento && <Badge variant="secondary" className="mr-2 text-[10px]">Solo en doc</Badge>}
                      {p.soloEnSistema && <Badge variant="secondary" className="mr-2 text-[10px]">Solo en sistema</Badge>}
                      #{p.numero} — {p.descripcion}
                    </p>
                    {p.diffs.filter(d => !d.coincide).map((d, di) => (
                      <div key={di} className="flex gap-4 text-xs text-muted-foreground pl-2">
                        <span className="w-28 shrink-0">{d.label}</span>
                        <span className="line-through">{d.valorSistema ?? '—'}{d.unidad ? ` ${d.unidad}` : ''}</span>
                        <ChevronRight className="h-3 w-3 shrink-0 text-red-400 mt-px" />
                        <span className="font-semibold text-red-700 dark:text-red-400">{d.valorDocumento ?? '—'}{d.unidad ? ` ${d.unidad}` : ''}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={onDiscard}>Cerrar</Button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────

export function ValorizacionImportIAModal({
  open,
  onClose,
  proyectoId: propProyectoId,
  valorizacionId: propValId,
  proyectos = [],
  onSuccess,
}: Props) {
  const forceVerify = !!propValId

  const [mode, setMode] = useState<Mode>(forceVerify ? 'verificar' : 'crear')
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [selectedProyectoId, setSelectedProyectoId] = useState(propProyectoId ?? '')
  const [selectedValId, setSelectedValId] = useState(propValId ?? '')
  const [valList, setValList] = useState<ValResumen[]>([])
  const [loadingVals, setLoadingVals] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [resultado, setResultado] = useState<ValorizacionExtracted | null>(null)
  const [diff, setDiff] = useState<ValorizacionDiff | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setMode(forceVerify ? 'verificar' : 'crear')
      setStep('upload')
      setFile(null)
      setSelectedProyectoId(propProyectoId ?? '')
      setSelectedValId(propValId ?? '')
      setMessages([])
      setResultado(null)
      setDiff(null)
      setError(null)
      setSaving(false)
    }
  }, [open, propProyectoId, propValId, forceVerify])

  // Load valorizations when project changes (verify mode)
  useEffect(() => {
    const pid = selectedProyectoId
    if (!pid || mode !== 'verificar') { setValList([]); return }
    setLoadingVals(true)
    fetch(`/api/gestion/valorizaciones?proyectoId=${pid}`)
      .then(r => r.json())
      .then((data: ValResumen[]) => setValList(data))
      .catch(() => setValList([]))
      .finally(() => setLoadingVals(false))
  }, [selectedProyectoId, mode])

  // ── Procesamiento SSE ──────────────────────────────────

  const handleAnalizar = useCallback(async () => {
    if (!file) return toast.error('Selecciona un archivo')
    if (!selectedProyectoId && mode === 'crear') return toast.error('Selecciona un proyecto')
    if (mode === 'verificar' && !selectedValId && !propValId) return toast.error('Selecciona una valorización')

    const valId = selectedValId || propValId || ''
    const endpoint = mode === 'crear' ? '/api/ia/valorizaciones/extraer' : '/api/ia/valorizaciones/verificar'

    const form = new FormData()
    form.append('file', file)
    if (mode === 'verificar') form.append('valorizacionId', valId)

    setStep('processing')
    setMessages([])
    setError(null)

    try {
      const res = await fetch(endpoint, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }

      await consumeSSE(
        res,
        msg => setMessages(prev => [...prev, msg]),
        data => {
          if (mode === 'crear') setResultado(data as ValorizacionExtracted)
          else setDiff(data as ValorizacionDiff)
          setStep('result')
        },
        errMsg => {
          setError(errMsg)
          setStep('upload')
        },
      )
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setError(msg)
      setStep('upload')
    }
  }, [file, selectedProyectoId, selectedValId, propValId, mode])

  // ── Confirmar crear ────────────────────────────────────

  const handleCrear = useCallback(async () => {
    if (!resultado || !selectedProyectoId) return
    const c = resultado.cabecera
    setSaving(true)
    try {
      // 1. Crear valorización
      const valPayload = {
        montoValorizacion: c.montoValorizacion ?? 0,
        periodoInicio: c.periodoInicio ?? null,
        periodoFin: c.periodoFin ?? null,
        descuentoComercialPorcentaje: c.descuentoComercialPorcentaje,
        adelantoPorcentaje: c.adelantoPorcentaje,
        igvPorcentaje: c.igvPorcentaje,
        fondoGarantiaPorcentaje: c.fondoGarantiaPorcentaje,
        moneda: c.moneda,
        observaciones: c.observaciones ?? null,
      }
      const valRes = await fetch(`/api/proyectos/${selectedProyectoId}/valorizaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valPayload),
      })
      if (!valRes.ok) {
        const err = await valRes.json().catch(() => ({}))
        throw new Error(err.error || 'Error al crear valorización')
      }
      const val = await valRes.json()
      const newValId: string = val.id

      // 2. Crear partidas
      const partidaErrors: string[] = []
      for (const p of resultado.partidas) {
        const pRes = await fetch(`/api/proyectos/${selectedProyectoId}/valorizaciones/${newValId}/partidas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero: p.numero,
            descripcion: p.descripcion,
            montoContractual: p.montoContractual,
            porcentajeAvance: p.porcentajeAvance,
            orden: p.numero,
          }),
        })
        if (!pRes.ok) {
          const err = await pRes.json().catch(() => ({}))
          partidaErrors.push(err.error || `Partida ${p.numero}`)
        }
      }

      if (partidaErrors.length > 0) {
        toast.warning(`Valorización creada, pero ${partidaErrors.length} partida(s) fallaron. Puedes agregarlas manualmente.`)
      } else {
        toast.success(`Valorización creada con ${resultado.partidas.length} partidas`)
      }

      onSuccess?.(newValId)
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }, [resultado, selectedProyectoId, onSuccess, onClose])

  // ── Render ─────────────────────────────────────────────

  const canAnalizar = !!file && (mode === 'verificar' ? !!(selectedValId || propValId) : !!selectedProyectoId)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-500" />
            Importar Valorización con IA
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Sube el documento del cliente para extraer o verificar los datos automáticamente.'}
            {step === 'processing' && 'Analizando el documento con inteligencia artificial...'}
            {step === 'result' && mode === 'crear' && 'Revisa los datos extraídos antes de crear la valorización.'}
            {step === 'result' && mode === 'verificar' && 'Comparación entre el documento del cliente y los datos del sistema.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP: upload ── */}
        {step === 'upload' && (
          <div className="space-y-4 pt-2">
            {/* Mode selector — solo si no es verify forzado */}
            {!forceVerify && (
              <div className="flex rounded-md border overflow-hidden">
                {(['crear', 'verificar'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-teal-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {m === 'crear' ? 'Crear nueva valorización' : 'Verificar valorización existente'}
                  </button>
                ))}
              </div>
            )}

            {/* Selector de proyecto */}
            {!propProyectoId && (
              <div className="space-y-1">
                <Label className="text-xs">Proyecto</Label>
                <Select value={selectedProyectoId} onValueChange={v => { setSelectedProyectoId(v); setSelectedValId('') }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecciona un proyecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectos.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{p.codigo}</span>{p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selector de valorización (verify mode) */}
            {mode === 'verificar' && !propValId && (
              <div className="space-y-1">
                <Label className="text-xs">Valorización a verificar</Label>
                <Select value={selectedValId} onValueChange={setSelectedValId} disabled={!selectedProyectoId || loadingVals}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={loadingVals ? 'Cargando...' : 'Selecciona valorización...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {valList.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        Val. #{v.numero} — {v.estado} {v.periodoFin ? `(hasta ${fmtDate(v.periodoFin)})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dropzone */}
            {file ? (
              <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/30">
                <FileSpreadsheet className="h-8 w-8 text-teal-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <FileDropzone onFile={setFile} />
            )}

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={handleAnalizar}
                disabled={!canAnalizar}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analizar con IA
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: processing ── */}
        {step === 'processing' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
                <Sparkles className="h-5 w-5 text-teal-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-center">Analizando documento con IA...</p>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {i === messages.length - 1 && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                  {i < messages.length - 1 && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: result ── */}
        {step === 'result' && mode === 'crear' && resultado && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Vista previa de la valorización a crear</p>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <RefreshCw className="h-3 w-3 mr-1" /> Volver a subir
              </Button>
            </div>
            <PreviewCrear
              resultado={resultado}
              onConfirm={handleCrear}
              onDiscard={onClose}
              saving={saving}
            />
          </div>
        )}

        {step === 'result' && mode === 'verificar' && diff && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Resultado de verificación</p>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <RefreshCw className="h-3 w-3 mr-1" /> Volver a subir
              </Button>
            </div>
            <DiffVerificar diff={diff} onDiscard={onClose} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
