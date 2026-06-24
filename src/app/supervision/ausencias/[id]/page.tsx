'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, CheckCircle2, XCircle, UserCheck,
  AlertTriangle, CalendarOff, FileText, Info, FlagTriangleRight, Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import StatusStepper from '@/components/ui/status-stepper'
import type { StatusStep } from '@/components/ui/status-stepper'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Solicitud {
  id: string
  estado: string
  fechaInicio: string
  fechaFin: string
  turnoInicio: string
  turnoFin: string
  diasHabiles: number | null
  motivo: string | null
  motivoRechazo: string | null
  requiereAsignacionAprobador: boolean
  fechaAprobacion1: string | null
  fechaAprobacion2: string | null
  tipoAusencia: {
    id: string
    nombre: string
    color: string
    requiereDocumento: boolean
    requiereAprobacion2: boolean
    diasUmbralAprobacion2: number | null
  }
  solicitante: { id: string; name: string; email: string }
  aprobador1: { id: string; name: string } | null
  aprobador1Id: string | null
  aprobador2: { id: string; name: string } | null
  aprobador2Id: string | null
  adjuntos: Array<{ id: string; nombreArchivo: string; urlArchivo: string }>
}

interface ConflictoItem {
  fecha: string
  turno: string
  planificacionDiaId: string
  proyectoId: string
  proyectoCodigo: string
  proyectoNombre: string
}

interface SaldoSolicitante {
  diasAsignados: number
  diasGozados: number
  diasPendientes: number
  diasDisponibles: number
  tipoAusencia: { id: string; nombre: string }
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
  return format(new Date(year, month - 1, day), 'dd/MM/yyyy', { locale: es })
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

  const steps: StatusStep[] = [
    {
      key: 'borrador',
      label: 'Borrador',
      status: est === 'borrador' ? 'current' : isTerminal ? 'cancelled' : 'completed',
    },
    {
      key: 'aprobacion1',
      label: 'Aprob. N1',
      status:
        est === 'borrador' ? 'future' :
        isTerminal ? 'cancelled' :
        n1Done ? 'completed' :
        'current',
      description: sol.aprobador1
        ? `${sol.aprobador1.name}${n1Done ? ` · ${formatFecha(sol.fechaAprobacion1!)}` : ' (pendiente)'}`
        : 'Sin asignar',
    },
  ]

  if (requiereN2) {
    steps.push({
      key: 'aprobacion2',
      label: 'Aprob. N2',
      status:
        !n1Done ? 'future' :
        isTerminal ? 'cancelled' :
        n2Done || isDone ? 'completed' :
        'current',
      description: sol.aprobador2
        ? `${sol.aprobador2.name}${n2Done ? ` · ${formatFecha(sol.fechaAprobacion2!)}` : ' (pendiente)'}`
        : n1Done ? 'Sin asignar' : undefined,
    })
  }

  steps.push(
    {
      key: 'aprobada',
      label: 'Aprobada',
      status:
        isDone ? 'completed' :
        isTerminal ? 'cancelled' :
        'future',
    },
    {
      key: 'finalizada',
      label: est === 'en_curso' ? 'En curso' : 'Finalizada',
      status:
        est === 'en_curso' ? 'current' :
        est === 'finalizada' ? 'completed' :
        isTerminal ? 'cancelled' :
        'future',
    },
  )

  return steps
}

// ── Modales inline ────────────────────────────────────────────────────────────

function RechazarModal({ onConfirm, onCancel }: {
  onConfirm: (motivo: string) => void
  onCancel: () => void
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-2xl space-y-4">
        <h3 className="font-semibold">Motivo de rechazo</h3>
        <Textarea
          placeholder="Indique el motivo del rechazo..."
          rows={4}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => motivo.trim() && onConfirm(motivo)}
            disabled={!motivo.trim()}
          >
            Rechazar
          </Button>
        </div>
      </div>
    </div>
  )
}

function AsignarAprobadorModal({ nivel, usuarios, onConfirm, onCancel }: {
  nivel: 1 | 2
  usuarios: Array<{ id: string; name: string }>
  onConfirm: (userId: string) => void
  onCancel: () => void
}) {
  const [userId, setUserId] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-2xl space-y-4">
        <h3 className="font-semibold">Asignar aprobador nivel {nivel}</h3>
        <div className="space-y-1.5">
          <Label>Seleccionar aprobador</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {usuarios.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => userId && onConfirm(userId)} disabled={!userId}>
            Asignar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SupervisionAusenciaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [conflictos, setConflictos] = useState<ConflictoItem[]>([])
  const [saldos, setSaldos] = useState<SaldoSolicitante[]>([])
  const [usuarios, setUsuarios] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)

  const [showRechazar, setShowRechazar] = useState(false)
  const [showAsignar, setShowAsignar] = useState<1 | 2 | null>(null)
  const [showConfirm, setShowConfirm] = useState<'finalizar' | 'cancelar-urgencia' | null>(null)
  const [desasignarProyectos, setDesasignarProyectos] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const [solRes, conflRes] = await Promise.all([
        fetch(`/api/ausencias/${id}`).then((r) => r.json()),
        fetch(`/api/ausencias/${id}/conflictos`).then((r) => r.json()),
      ])
      setSolicitud(solRes)
      setConflictos(conflRes.conflictos ?? [])
      if (solRes.solicitante?.id) {
        const sRes = await fetch(`/api/saldos-ausencia?userId=${solRes.solicitante.id}`)
        if (sRes.ok) setSaldos(await sRes.json())
      }
    } catch {
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    fetch('/api/admin/usuarios')
      .then((r) => r.ok ? r.json() : [])
      .then((u) => Array.isArray(u) ? setUsuarios(u) : setUsuarios([]))
      .catch(() => setUsuarios([]))
  }, [id])

  // ── Derivar estado de aprobación ─────────────────────────────────────────

  const userId = session?.user?.id
  const role = (session?.user as any)?.role as string | undefined
  const isAdmin = role ? ['admin', 'administracion'].includes(role) : false

  const n1Pendiente = solicitud?.estado === 'pendiente' && !solicitud.fechaAprobacion1
  const n2Pendiente = solicitud?.estado === 'pendiente' && Boolean(solicitud?.fechaAprobacion1)

  // ¿Puede este usuario aprobar N1?
  const puedeAprobar1 = Boolean(
    n1Pendiente &&
    solicitud?.aprobador1Id &&
    (isAdmin || solicitud?.aprobador1Id === userId)
  )

  // ¿Puede este usuario aprobar N2?
  const puedeAprobar2 = Boolean(
    n2Pendiente &&
    solicitud?.aprobador2Id &&
    (isAdmin || solicitud?.aprobador2Id === userId) &&
    solicitud?.aprobador1Id !== userId // no puede ser el mismo que N1
  )

  const puedeRechazar = solicitud?.estado === 'pendiente'

  const esAprobado = ['aprobada', 'en_curso'].includes(solicitud?.estado ?? '')
  // Finalizar: solo admin, cuando ya está aprobada o en curso
  const puedeFinalizar = isAdmin && esAprobado
  // Cancelar urgencia: admin o aprobador1, cuando ya está aprobada o en curso
  const puedeCancelarUrgencia = esAprobado && (isAdmin || solicitud?.aprobador1Id === userId)

  // ¿Cuál nivel necesita asignación manual?
  const necesitaAsignarN1 = Boolean(n1Pendiente && solicitud?.requiereAsignacionAprobador)
  const necesitaAsignarN2 = Boolean(n2Pendiente && solicitud?.requiereAsignacionAprobador)

  const hayAcciones = puedeAprobar1 || puedeAprobar2 || puedeRechazar || necesitaAsignarN1 || necesitaAsignarN2 || puedeFinalizar || puedeCancelarUrgencia

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAprobar1 = async () => {
    const res = await fetch(`/api/ausencias/${id}/aprobar-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desasignarProyectos }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(data.requiereNivel2 ? 'Nivel 1 aprobado — se requiere aprobación nivel 2' : 'Ausencia aprobada')
      cargar()
    } else if (res.status === 409) {
      toast.error('Conflictos de planificación. Active "Desasignar proyectos" para continuar.')
    } else {
      toast.error(data.error ?? 'Error al aprobar')
    }
  }

  const handleAprobar2 = async () => {
    const res = await fetch(`/api/ausencias/${id}/aprobar-2`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desasignarProyectos }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Ausencia aprobada — nivel 2 completado')
      cargar()
    } else if (res.status === 409) {
      toast.error('Conflictos de planificación. Active "Desasignar proyectos" para continuar.')
    } else {
      toast.error(data.error ?? 'Error al aprobar nivel 2')
    }
  }

  const handleRechazar = async (motivo: string) => {
    setShowRechazar(false)
    const res = await fetch(`/api/ausencias/${id}/rechazar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    })
    if (res.ok) { toast.success('Solicitud rechazada'); cargar() }
    else { const d = await res.json(); toast.error(d.error ?? 'Error') }
  }

  const handleFinalizar = async () => {
    setShowConfirm(null)
    const res = await fetch(`/api/ausencias/${id}/finalizar`, { method: 'PATCH' })
    if (res.ok) { toast.success('Ausencia marcada como finalizada'); cargar() }
    else { const d = await res.json(); toast.error(d.error ?? 'Error') }
  }

  const handleCancelarUrgencia = async () => {
    setShowConfirm(null)
    const res = await fetch(`/api/ausencias/${id}/cancelar`, { method: 'PATCH' })
    if (res.ok) { toast.success('Ausencia cancelada — planificación y saldo revertidos'); cargar() }
    else { const d = await res.json(); toast.error(d.error ?? 'Error') }
  }

  const handleAsignar = async (aprobadorId: string) => {
    const nivel = showAsignar!
    setShowAsignar(null)
    const res = await fetch(`/api/ausencias/${id}/asignar-aprobador`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aprobadorId, nivel }),
    })
    if (res.ok) { toast.success(`Aprobador nivel ${nivel} asignado`); cargar() }
    else { const d = await res.json(); toast.error(d.error ?? 'Error') }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>
  if (!solicitud) return <div className="p-6 text-sm text-destructive">Solicitud no encontrada</div>

  const saldoTipo = saldos.find((s) => s.tipoAusencia.id === solicitud.tipoAusencia.id)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/supervision/ausencias')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CalendarOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold">{solicitud.tipoAusencia.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              Solicitado por <strong>{solicitud.solicitante.name}</strong>
            </p>
          </div>
        </div>

        {/* Acciones */}
        {hayAcciones && (
          <div className="flex flex-col items-end gap-2">
            {conflictos.length > 0 && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={desasignarProyectos}
                  onChange={(e) => setDesasignarProyectos(e.target.checked)}
                  className="rounded"
                />
                Desasignar proyectos en conflicto
              </label>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              {/* Asignar aprobador N1 */}
              {necesitaAsignarN1 && (
                <Button variant="outline" onClick={() => setShowAsignar(1)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Asignar aprobador
                </Button>
              )}
              {/* Asignar aprobador N2 */}
              {necesitaAsignarN2 && (
                <Button variant="outline" onClick={() => setShowAsignar(2)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Asignar aprobador N2
                </Button>
              )}
              {puedeRechazar && (
                <Button variant="destructive" onClick={() => setShowRechazar(true)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
              )}
              {puedeAprobar1 && (
                <Button onClick={handleAprobar1}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprobar
                </Button>
              )}
              {puedeAprobar2 && (
                <Button onClick={handleAprobar2}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprobar nivel 2
                </Button>
              )}
              {puedeCancelarUrgencia && (
                <Button variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => setShowConfirm('cancelar-urgencia')}>
                  <Ban className="mr-2 h-4 w-4" />
                  Cancelar (urgencia)
                </Button>
              )}
              {puedeFinalizar && (
                <Button variant="secondary" onClick={() => setShowConfirm('finalizar')}>
                  <FlagTriangleRight className="mr-2 h-4 w-4" />
                  Finalizar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Banner N2 pendiente */}
      {n2Pendiente && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Nivel 1 aprobado · Esperando aprobación de nivel 2</p>
            <p className="text-xs mt-0.5 opacity-80">
              {solicitud.aprobador2
                ? `Aprobador N2: ${solicitud.aprobador2.name}`
                : 'No hay aprobador N2 asignado. Usa "Asignar aprobador N2" para designar uno.'}
            </p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="rounded-lg border bg-card px-6 py-4 overflow-x-auto">
        <StatusStepper steps={buildSteps(solicitud)} />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Col 1 (2/3): Datos + conflictos + adjuntos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Detalles</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: solicitud.tipoAusencia.color }} />
                {solicitud.tipoAusencia.nombre}
              </dd>

              <dt className="text-muted-foreground">Inicio</dt>
              <dd>{formatFecha(solicitud.fechaInicio)} — {TURNO_LABELS[solicitud.turnoInicio]}</dd>

              <dt className="text-muted-foreground">Fin</dt>
              <dd>{formatFecha(solicitud.fechaFin)} — {TURNO_LABELS[solicitud.turnoFin]}</dd>

              <dt className="text-muted-foreground">Días hábiles</dt>
              <dd className="font-semibold">{solicitud.diasHabiles ?? '—'}</dd>

              <dt className="text-muted-foreground">Estado</dt>
              <dd><Badge>{ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}</Badge></dd>

              <dt className="text-muted-foreground">Aprobador N1</dt>
              <dd className="flex items-center gap-1.5">
                {solicitud.aprobador1?.name ?? <span className="italic text-muted-foreground">Sin asignar</span>}
                {solicitud.fechaAprobacion1 && (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                    ✓ {formatFecha(solicitud.fechaAprobacion1)}
                  </Badge>
                )}
              </dd>

              <dt className="text-muted-foreground">Aprobador N2</dt>
              <dd className="flex items-center gap-1.5">
                {solicitud.aprobador2?.name ?? <span className="italic text-muted-foreground">Sin asignar</span>}
                {solicitud.fechaAprobacion2 && (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                    ✓ {formatFecha(solicitud.fechaAprobacion2)}
                  </Badge>
                )}
              </dd>
            </dl>

            {solicitud.motivo && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-0.5">Motivo</p>
                <p className="rounded bg-muted/40 px-3 py-2 text-sm">{solicitud.motivo}</p>
              </div>
            )}
            {solicitud.motivoRechazo && (
              <div className="mt-2">
                <p className="text-xs text-destructive mb-0.5">Motivo de rechazo</p>
                <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{solicitud.motivoRechazo}</p>
              </div>
            )}
          </div>

          {/* Conflictos */}
          {conflictos.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="font-semibold text-amber-800 dark:text-amber-400">
                  Conflictos de planificación ({conflictos.length})
                </h2>
              </div>
              <div className="rounded border bg-background overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Turno</th>
                      <th className="px-3 py-2 text-left">Proyecto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {conflictos.map((c) => (
                      <tr key={c.planificacionDiaId}>
                        <td className="px-3 py-2">{formatFecha(c.fecha)}</td>
                        <td className="px-3 py-2">{TURNO_LABELS[c.turno] ?? c.turno}</td>
                        <td className="px-3 py-2">[{c.proyectoCodigo}] {c.proyectoNombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Adjuntos */}
          {solicitud.adjuntos.length > 0 && (
            <div className="rounded-lg border bg-card p-5 space-y-2">
              <h2 className="font-semibold">Documentos adjuntos</h2>
              <ul className="space-y-1.5">
                {solicitud.adjuntos.map((adj) => (
                  <li key={adj.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <a href={adj.urlArchivo} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {adj.nombreArchivo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Col 2 (1/3): Saldo solicitante */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Saldo del colaborador</h2>
            <p className="text-sm text-muted-foreground">{solicitud.solicitante.name}</p>
            {saldoTipo ? (
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Asignados</dt>
                  <dd className="font-medium">{saldoTipo.diasAsignados}d</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Gozados</dt>
                  <dd className="font-medium">{saldoTipo.diasGozados}d</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Pendientes</dt>
                  <dd className="font-medium">{saldoTipo.diasPendientes}d</dd>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <dt className="font-medium">Disponibles</dt>
                  <dd className={`font-bold ${saldoTipo.diasDisponibles < (solicitud.diasHabiles ?? 0) ? 'text-destructive' : 'text-emerald-600'}`}>
                    {saldoTipo.diasDisponibles}d
                  </dd>
                </div>
                {solicitud.diasHabiles != null && saldoTipo.diasDisponibles < solicitud.diasHabiles && (
                  <p className="text-xs text-destructive">
                    Saldo insuficiente ({solicitud.diasHabiles}d solicitados).
                  </p>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin saldo registrado para este tipo.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {showRechazar && (
        <RechazarModal onConfirm={handleRechazar} onCancel={() => setShowRechazar(false)} />
      )}
      {showAsignar && (
        <AsignarAprobadorModal
          nivel={showAsignar}
          usuarios={usuarios}
          onConfirm={handleAsignar}
          onCancel={() => setShowAsignar(null)}
        />
      )}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-2xl space-y-4">
            {showConfirm === 'finalizar' ? (
              <>
                <h3 className="font-semibold">Finalizar ausencia</h3>
                <p className="text-sm text-muted-foreground">
                  Marca esta ausencia como completada. No se revierte la planificación ni el saldo.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowConfirm(null)}>Cancelar</Button>
                  <Button variant="secondary" onClick={handleFinalizar}>
                    <FlagTriangleRight className="mr-2 h-4 w-4" />
                    Confirmar finalización
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold">Cancelar por urgencia</h3>
                <p className="text-sm text-muted-foreground">
                  El colaborador tuvo que presentarse. Se revertirá la planificación y se devolverán los días al saldo disponible.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowConfirm(null)}>Volver</Button>
                  <Button className="border-amber-400 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleCancelarUrgencia}>
                    <Ban className="mr-2 h-4 w-4" />
                    Confirmar cancelación
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
