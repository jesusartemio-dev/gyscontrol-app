'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus, Eye, Send, XCircle, Pencil, CalendarOff, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SolicitudFormModal from '@/components/ausencias/SolicitudFormModal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TipoAusencia {
  id: string
  codigo: string
  nombre: string
  color: string
  descuentaSaldo: boolean
}

interface SaldoAusencia {
  diasAsignados: number
  diasGozados: number
  diasPendientes: number
  diasDisponibles: number
  tipoAusencia: TipoAusencia
}

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
  tipoAusencia: TipoAusencia
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
}

const ESTADO_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  borrador: 'outline',
  pendiente: 'secondary',
  aprobada: 'default',
  rechazada: 'destructive',
  cancelada: 'outline',
  en_curso: 'default',
  finalizada: 'secondary',
}

const HORAS_POR_DIA = 9.5

function formatFecha(iso: string) {
  return format(new Date(iso), 'dd/MM/yyyy', { locale: es })
}

function SaldoCard({ s }: { s: SaldoAusencia }) {
  const esCompHe = s.tipoAusencia.codigo === 'COMP_HE'

  if (esCompHe) {
    const diasComp = Math.floor(s.diasDisponibles / HORAS_POR_DIA)
    const negativo = s.diasDisponibles < 0
    return (
      <div className="rounded-lg border bg-card px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Compensación de horas</p>
        </div>
        <p className={`text-2xl font-bold ${negativo ? 'text-destructive' : ''}`}>
          {s.diasDisponibles >= 0 ? '+' : ''}{s.diasDisponibles}h
        </p>
        <p className="text-xs text-muted-foreground">
          {negativo
            ? 'Horas por compensar'
            : `≈ ${diasComp} día${diasComp !== 1 ? 's' : ''} compensable${diasComp !== 1 ? 's' : ''}`}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.tipoAusencia.color }} />
        <p className="text-xs font-medium text-muted-foreground">{s.tipoAusencia.nombre}</p>
      </div>
      <p className="text-2xl font-bold">{s.diasDisponibles}d</p>
      <p className="text-xs text-muted-foreground">
        de {s.diasAsignados}d asignados · {s.diasGozados}d gozados
      </p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MisAusenciasPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [saldos, setSaldos] = useState<SaldoAusencia[]>([])
  const [tipos, setTipos] = useState<TipoAusencia[]>([])
  const [loading, setLoading] = useState(true)

  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Solicitud | undefined>()

  const cargar = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/ausencias').then((r) => r.json()),
      fetch('/api/ausencias/mis-saldos').then((r) => r.json()),
      fetch('/api/tipos-ausencia').then((r) => r.json()),
    ])
      .then(([sols, slds, tps]) => {
        setSolicitudes(Array.isArray(sols) ? sols : [])
        setSaldos(Array.isArray(slds) ? slds : [])
        setTipos(Array.isArray(tps) ? tps : [])
      })
      .catch(() => toast.error('Error al cargar los datos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtroEstado !== 'todos' && s.estado !== filtroEstado) return false
    if (filtroTipo !== 'todos' && s.tipoAusenciaId !== filtroTipo) return false
    return true
  })

  const handleCancelar = async (id: string) => {
    if (!confirm('¿Cancelar esta solicitud?')) return
    const res = await fetch(`/api/ausencias/${id}/cancelar`, { method: 'PATCH' })
    if (res.ok) {
      toast.success('Solicitud cancelada')
      cargar()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Error al cancelar')
    }
  }

  const handleEnviar = async (id: string) => {
    const res = await fetch(`/api/ausencias/${id}/enviar`, { method: 'PATCH' })
    if (res.ok) {
      toast.success('Solicitud enviada para aprobación')
      cargar()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Error al enviar')
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarOff className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Mis Ausencias</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus solicitudes de ausencia</p>
          </div>
        </div>
        <Button onClick={() => { setEditando(undefined); setModalOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva solicitud
        </Button>
      </div>

      {/* Saldo cards */}
      {saldos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {saldos.map((s) => <SaldoCard key={s.tipoAusencia.id} s={s} />)}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(ESTADO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tipo de ausencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          No tienes solicitudes de ausencia aún.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Inicio</th>
                <th className="px-4 py-3 text-left font-medium">Fin</th>
                <th className="px-4 py-3 text-center font-medium">Días</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Creado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {solicitudesFiltradas.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: s.tipoAusencia.color }}
                      />
                      {s.tipoAusencia.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatFecha(s.fechaInicio)}</td>
                  <td className="px-4 py-3">{formatFecha(s.fechaFin)}</td>
                  <td className="px-4 py-3 text-center">
                    {s.diasHabiles != null ? `${s.diasHabiles}d` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ESTADO_VARIANTS[s.estado] ?? 'outline'}>
                      {ESTADO_LABELS[s.estado] ?? s.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatFecha(s.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/mi-trabajo/ausencias/${s.id}`)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {s.estado === 'borrador' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => { setEditando(s); setModalOpen(true) }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Enviar"
                            onClick={() => handleEnviar(s.id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {s.estado === 'pendiente' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Cancelar"
                          onClick={() => handleCancelar(s.id)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <SolicitudFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={cargar}
        solicitudExistente={editando}
      />
    </div>
  )
}
