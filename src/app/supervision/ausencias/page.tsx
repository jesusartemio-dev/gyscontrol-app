'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Eye, CalendarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Solicitud {
  id: string
  estado: string
  fechaInicio: string
  fechaFin: string
  diasHabiles: number | null
  createdAt: string
  tipoAusencia: { id: string; nombre: string; color: string }
  solicitante: { id: string; name: string; email: string }
  aprobador1: { id: string; name: string } | null
  fechaAprobacion1: string | null
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

const POR_APROBAR_ESTADOS = ['pendiente']
const HISTORICO_ESTADOS = ['aprobada', 'rechazada', 'cancelada', 'en_curso', 'finalizada']

function formatFecha(iso: string) {
  return format(new Date(iso), 'dd/MM/yyyy', { locale: es })
}

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = 'por-aprobar' | 'historico'

export default function SupervisionAusenciasPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const isAdmin = role ? ['admin', 'administracion'].includes(role) : false

  const [tab, setTab] = useState<Tab>('por-aprobar')
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [tipos, setTipos] = useState<Array<{ id: string; nombre: string }>>([])

  const cargar = () => {
    setLoading(true)
    // Admin ve todas las solicitudes; el resto solo las que tiene asignadas como aprobador
    const url = isAdmin ? '/api/ausencias' : '/api/ausencias?vista=aprobador'
    Promise.all([
      fetch(url).then((r) => r.json()),
      fetch('/api/tipos-ausencia').then((r) => r.json()),
    ])
      .then(([sols, tps]) => {
        setSolicitudes(Array.isArray(sols) ? sols : [])
        setTipos(Array.isArray(tps) ? tps : [])
      })
      .catch(() => toast.error('Error al cargar datos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [isAdmin])

  const estadosTab = tab === 'por-aprobar' ? POR_APROBAR_ESTADOS : HISTORICO_ESTADOS
  const filtradas = solicitudes.filter((s) => {
    if (!estadosTab.includes(s.estado)) return false
    if (filtroTipo !== 'todos' && s.tipoAusencia.id !== filtroTipo) return false
    return true
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarOff className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Aprobar Ausencias</h1>
          <p className="text-sm text-muted-foreground">Gestión de solicitudes del equipo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['por-aprobar', 'historico'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'por-aprobar' ? 'Por Aprobar' : 'Histórico'}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
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
      ) : filtradas.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          {tab === 'por-aprobar' ? 'No hay solicitudes pendientes de aprobación.' : 'No hay solicitudes en el histórico.'}
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Colaborador</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Inicio</th>
                <th className="px-4 py-3 text-left font-medium">Fin</th>
                <th className="px-4 py-3 text-center font-medium">Días</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Aprobador</th>
                <th className="px-4 py-3 text-left font-medium">Solicitado</th>
                <th className="px-4 py-3 text-right font-medium">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtradas.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{s.solicitante.name}</td>
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
                    {s.diasHabiles != null ? `${s.diasHabiles}d` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ESTADO_VARIANTS[s.estado] ?? 'outline'}>
                      {ESTADO_LABELS[s.estado] ?? s.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.aprobador1?.name ?? <span className="italic">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatFecha(s.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/supervision/ausencias/${s.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
