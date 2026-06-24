'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { ArrowLeft, Send, XCircle, Pencil, FileText, CalendarOff, Paperclip, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import StatusStepper from '@/components/ui/status-stepper'
import type { StatusStep } from '@/components/ui/status-stepper'
import SolicitudFormModal from '@/components/ausencias/SolicitudFormModal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Solicitud {
  id: string
  tipoAusenciaId: string
  fechaInicio: string
  fechaFin: string
  turnoInicio: string
  turnoFin: string
  diasHabiles: number | null
  motivo: string | null
  estado: string
  motivoRechazo: string | null
  tipoAusencia: {
    id: string
    codigo: string
    nombre: string
    color: string
    requiereDocumento: boolean
    requiereAprobacion2: boolean
    diasUmbralAprobacion2: number | null
  }
  solicitante: { id: string; name: string; email: string }
  aprobador1: { id: string; name: string } | null
  aprobador2: { id: string; name: string } | null
  fechaAprobacion1: string | null
  fechaAprobacion2: string | null
  adjuntos: Array<{ id: string; nombreArchivo: string; urlArchivo: string; tipoArchivo: string | null }>
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TURNO_LABELS: Record<string, string> = {
  dia_completo: 'Día completo',
  am: 'Solo mañana (AM)',
  pm: 'Solo tarde (PM)',
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
}

function formatFecha(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return format(new Date(year, month - 1, day), "dd 'de' MMMM 'de' yyyy", { locale: es })
}

function buildSteps(sol: Solicitud): StatusStep[] {
  const est = sol.estado
  const n1Done = sol.fechaAprobacion1 !== null
  const n2Done = sol.fechaAprobacion2 !== null

  const isTerminal = ['rechazada', 'cancelada'].includes(est)
  const isDone = ['aprobada', 'en_curso', 'finalizada'].includes(est)

  const requiereN2 =
    sol.tipoAusencia.requiereAprobacion2 ||
    (sol.tipoAusencia.diasUmbralAprobacion2 !== null &&
      (sol.diasHabiles ?? 0) > sol.tipoAusencia.diasUmbralAprobacion2)

  const borrador: StatusStep = {
    key: 'borrador',
    label: 'Borrador',
    status: est === 'borrador' ? 'current' : isTerminal ? 'cancelled' : 'completed',
  }

  // When N2 is required, relabel this step so the employee knows it's only N1
  const pendiente: StatusStep = {
    key: 'pendiente',
    label: requiereN2 ? 'Aprob. N1' : 'Pendiente',
    status:
      est === 'borrador' ? 'future' :
      est === 'pendiente' && !n1Done ? 'current' :
      est === 'rechazada' ? 'rejected' :
      est === 'cancelada' ? 'cancelled' :
      'completed',
    description: est === 'pendiente' && !n1Done && sol.aprobador1
      ? `Aprobador: ${sol.aprobador1.name}`
      : undefined,
  }

  const aprobada: StatusStep = {
    key: 'aprobada',
    label: 'Aprobada',
    status:
      est === 'aprobada' ? 'current' :
      ['en_curso', 'finalizada'].includes(est) ? 'completed' :
      ['rechazada', 'cancelada'].includes(est) ? 'cancelled' :
      'future',
    description: (sol.fechaAprobacion2 ?? sol.fechaAprobacion1)
      ? `Aprobado el ${format(new Date((sol.fechaAprobacion2 ?? sol.fechaAprobacion1)!), 'dd/MM/yyyy', { locale: es })}`
      : undefined,
  }

  const finalizada: StatusStep = {
    key: 'finalizada',
    label: est === 'en_curso' ? 'En curso' : 'Finalizada',
    status:
      est === 'en_curso' ? 'current' :
      est === 'finalizada' ? 'completed' :
      ['rechazada', 'cancelada'].includes(est) ? 'cancelled' :
      'future',
  }

  const steps: StatusStep[] = [borrador, pendiente]

  if (requiereN2) {
    steps.push({
      key: 'aprobacion2',
      label: 'Aprob. N2',
      status:
        !n1Done ? 'future' :
        isTerminal ? 'cancelled' :
        n2Done || isDone ? 'completed' :
        'current',
      description: n1Done && sol.aprobador2
        ? `Aprobador: ${sol.aprobador2.name}`
        : undefined,
    })
  }

  steps.push(aprobada, finalizada)
  return steps
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MiAusenciaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargar = () => {
    setLoading(true)
    fetch(`/api/ausencias/${id}`)
      .then((r) => r.json())
      .then((d) => setSolicitud(d))
      .catch(() => toast.error('Error al cargar la solicitud'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [id])

  const handleEnviar = async () => {
    const res = await fetch(`/api/ausencias/${id}/enviar`, { method: 'PATCH' })
    if (res.ok) { toast.success('Solicitud enviada'); cargar() }
    else { const d = await res.json(); toast.error(d.error ?? 'Error') }
  }

  const handleCancelar = async () => {
    if (!confirm('¿Cancelar esta solicitud?')) return
    const res = await fetch(`/api/ausencias/${id}/cancelar`, { method: 'PATCH' })
    if (res.ok) { toast.success('Solicitud cancelada'); cargar() }
    else { const d = await res.json(); toast.error(d.error ?? 'Error') }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/ausencias/${id}/adjuntos`, { method: 'POST', body: formData })
      if (res.ok) { toast.success('Documento adjuntado'); cargar() }
      else { const d = await res.json(); toast.error(d.error ?? 'Error al subir') }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAdjunto = async (adjId: string) => {
    if (!confirm('¿Eliminar este documento?')) return
    const res = await fetch(`/api/ausencias/${id}/adjuntos/${adjId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Documento eliminado'); cargar() }
    else { const d = await res.json(); toast.error(d.error ?? 'Error') }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>
  if (!solicitud) return <div className="p-6 text-sm text-destructive">Solicitud no encontrada</div>

  const steps = buildSteps(solicitud)

  return (
    <div className="space-y-6 p-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/mi-trabajo/ausencias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <CalendarOff className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">{solicitud.tipoAusencia.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {formatFecha(solicitud.fechaInicio)} — {formatFecha(solicitud.fechaFin)}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {solicitud.estado === 'borrador' && (
            <>
              <Button variant="outline" onClick={() => setModalOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                onClick={handleEnviar}
                disabled={solicitud.tipoAusencia.requiereDocumento && solicitud.adjuntos.length === 0}
                title={solicitud.tipoAusencia.requiereDocumento && solicitud.adjuntos.length === 0
                  ? 'Adjunta al menos un documento antes de enviar'
                  : undefined}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar solicitud
              </Button>
            </>
          )}
          {solicitud.estado === 'pendiente' && (
            <Button variant="destructive" onClick={handleCancelar}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Status Stepper */}
      <div className="rounded-lg border bg-card px-6 py-4">
        <StatusStepper steps={steps} />
      </div>

      {/* Datos */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Detalles de la solicitud</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: solicitud.tipoAusencia.color }}
                />
                {solicitud.tipoAusencia.nombre}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fecha inicio</dt>
              <dd>{formatFecha(solicitud.fechaInicio)} — {TURNO_LABELS[solicitud.turnoInicio]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fecha fin</dt>
              <dd>{formatFecha(solicitud.fechaFin)} — {TURNO_LABELS[solicitud.turnoFin]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Días hábiles</dt>
              <dd className="font-semibold">{solicitud.diasHabiles ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Estado</dt>
              <dd><Badge>{ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}</Badge></dd>
            </div>
            {solicitud.motivo && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Motivo</dt>
                <dd className="rounded bg-muted/40 px-2 py-1 text-xs">{solicitud.motivo}</dd>
              </div>
            )}
            {solicitud.motivoRechazo && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-destructive">Motivo de rechazo</dt>
                <dd className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">{solicitud.motivoRechazo}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Aprobadores */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Aprobadores</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Aprobador nivel 1</dt>
              <dd>{solicitud.aprobador1?.name ?? <span className="text-muted-foreground italic">Sin asignar</span>}</dd>
            </div>
            {solicitud.tipoAusencia.requiereAprobacion2 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Aprobador nivel 2</dt>
                <dd>{solicitud.aprobador2?.name ?? <span className="text-muted-foreground italic">Sin asignar</span>}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Adjuntos */}
      {(solicitud.tipoAusencia.requiereDocumento || solicitud.adjuntos.length > 0) && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              Documentos adjuntos
              {solicitud.tipoAusencia.requiereDocumento && (
                <span className="text-xs font-normal text-destructive">(requerido)</span>
              )}
            </h2>
            {solicitud.estado === 'borrador' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file)
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading
                    ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    : <Paperclip className="mr-2 h-3.5 w-3.5" />}
                  {uploading ? 'Subiendo...' : 'Adjuntar archivo'}
                </Button>
              </>
            )}
          </div>

          {solicitud.tipoAusencia.requiereDocumento && solicitud.adjuntos.length === 0 && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Adjunta al menos un documento antes de enviar la solicitud.
            </div>
          )}

          {solicitud.adjuntos.length > 0 ? (
            <ul className="space-y-1.5">
              {solicitud.adjuntos.map((adj) => (
                <li key={adj.id} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={adj.urlArchivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-primary hover:underline truncate"
                  >
                    {adj.nombreArchivo}
                  </a>
                  {solicitud.estado === 'borrador' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteAdjunto(adj.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            solicitud.adjuntos.length === 0 && !solicitud.tipoAusencia.requiereDocumento && (
              <p className="text-sm text-muted-foreground italic">Sin documentos adjuntos.</p>
            )
          )}
        </div>
      )}

      {/* Edit modal */}
      <SolicitudFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={cargar}
        solicitudExistente={solicitud}
      />
    </div>
  )
}
