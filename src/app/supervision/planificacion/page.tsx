'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AsignacionCeldaModal from '@/components/planificacion/AsignacionCeldaModal'
import AusenciaDetailModal from '@/components/planificacion/AusenciaDetailModal'
import CopiarSemanaModal from '@/components/planificacion/CopiarSemanaModal'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

interface CeldaEntry {
  id: string
  turno: string
  tipo: 'proyecto' | 'ausencia'
  proyecto?: { id: string; codigo: string; nombre: string; color: string }
  ausencia?: { tipo: string | undefined; codigo: string | undefined; color: string | undefined }
  esExcepcional: boolean
  notas: string | null
}

interface PersonaEntry {
  userId: string
  nombre: string
  iniciales: string
  cargo: string | null
  utilizacion: string
  dias: Record<string, CeldaEntry[]>
}

interface SemanaResponse {
  semana: { inicio: string; fin: string; isoWeek: string }
  departamento: { id: string; nombre: string } | null
  personas: PersonaEntry[]
  proyectos: Array<{ id: string; codigo: string; nombre: string; color: string }>
}

interface Departamento {
  id: string
  nombre: string
}

interface ProyectoActivo {
  id: string
  codigo: string
  nombre: string
  color: string
  estado: string
}

function currentMondayUTC(): string {
  const now = new Date()
  const day = now.getUTCDay() || 7
  const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (day - 1) * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00.000Z')
  return new Date(d.getTime() + n * 7 * 86400000).toISOString().slice(0, 10)
}

function formatDateRange(inicio: string): string {
  const d1 = new Date(inicio + 'T00:00:00.000Z')
  const d2 = new Date(d1.getTime() + 6 * 86400000)
  return `${format(d1, 'd MMM', { locale: es })} – ${format(d2, 'd MMM yyyy', { locale: es })}`
}

function CeldaDia({
  celda,
  dimmed,
  onClickEmpty,
  onClickProyecto,
  onClickAusencia,
}: {
  celda: CeldaEntry[]
  dimmed: boolean
  onClickEmpty: () => void
  onClickProyecto: () => void
  onClickAusencia: () => void
}) {
  if (!celda || celda.length === 0) {
    return (
      <div
        className="group relative flex items-center justify-center h-full border border-dashed border-transparent hover:border-border cursor-pointer rounded"
        onClick={onClickEmpty}
      >
        <span className="text-muted-foreground/30 group-hover:text-muted-foreground text-lg font-light">+</span>
      </div>
    )
  }

  const c = celda[0]

  if (c.tipo === 'ausencia') {
    return (
      <div
        className={cn('relative flex items-center justify-center h-full rounded cursor-pointer text-xs font-medium', dimmed && 'opacity-30')}
        style={{ background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)' }}
        onClick={onClickAusencia}
      >
        <span className="bg-white/80 rounded px-1">{c.ausencia?.codigo ?? 'AUS'}</span>
      </div>
    )
  }

  const color = c.proyecto?.color ?? '#6b7280'
  return (
    <div
      className={cn('relative flex items-center justify-center h-full rounded cursor-pointer text-xs font-semibold px-1', dimmed && 'opacity-30')}
      style={{ backgroundColor: color + '33', border: `1px solid ${color}66`, color }}
      onClick={onClickProyecto}
    >
      <span className="truncate">{c.proyecto?.codigo}</span>
      {c.esExcepcional && <span className="absolute top-0.5 right-0.5 text-[9px]">⏰</span>}
    </div>
  )
}

function UtilBadge({ util }: { util: string }) {
  const [dias, total] = util.split('/').map(Number)
  if (dias > total) return <span className="text-xs font-medium text-yellow-600">{util}</span>
  if (dias === total) return <span className="text-xs font-medium text-green-600">{util}</span>
  if (dias <= Math.floor(total / 2)) return <span className="text-xs font-medium text-red-500">{util}</span>
  return <span className="text-xs font-medium text-muted-foreground">{util}</span>
}

export default function PlanificacionPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  const [semanaInicio, setSemanaInicio] = useState<string>(currentMondayUTC)
  const [departamentoId, setDepartamentoId] = useState<string>('')
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('')
  const [busqueda, setBusqueda] = useState('')
  const [data, setData] = useState<SemanaResponse | null>(null)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(true)

  const [modalCelda, setModalCelda] = useState<{ userId: string; nombre: string; fecha: string; celda?: CeldaEntry } | null>(null)
  const [modalAusencia, setModalAusencia] = useState<CeldaEntry | null>(null)
  const [showCopiarModal, setShowCopiarModal] = useState(false)

  const hoy = useMemo(() => currentMondayUTC(), [])

  useEffect(() => {
    fetch('/api/planificacion/departamentos')
      .then((r) => r.json())
      .then(setDepartamentos)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!semanaInicio) return
    setLoading(true)
    const params = new URLSearchParams({ inicio: semanaInicio })
    if (departamentoId) params.set('departamentoId', departamentoId)
    fetch(`/api/planificacion/semana?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Error al cargar planificación'))
      .finally(() => setLoading(false))
  }, [semanaInicio, departamentoId])

  const personasFiltradas = useMemo(() => {
    if (!data?.personas) return []
    return data.personas.filter(
      (p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    )
  }, [data?.personas, busqueda])

  const diasHeader = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(semanaInicio + 'T00:00:00.000Z')
      d.setUTCDate(d.getUTCDate() + i)
      return { dateKey: d.toISOString().slice(0, 10), d }
    })
  }, [semanaInicio])

  const reload = () => {
    setLoading(true)
    const params = new URLSearchParams({ inicio: semanaInicio })
    if (departamentoId) params.set('departamentoId', departamentoId)
    fetch(`/api/planificacion/semana?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Error al cargar planificación'))
      .finally(() => setLoading(false))
  }

  if (role && !ROLES_PERMITIDOS.includes(role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No tienes acceso a esta sección.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Planificación de personal</h1>
          <p className="text-sm text-muted-foreground">
            Semana {data?.semana.isoWeek ?? '…'} · {formatDateRange(semanaInicio)}
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowCopiarModal(true)}>
          <Copy className="mr-2 h-4 w-4" /> Copiar semana
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setSemanaInicio(addWeeks(semanaInicio, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSemanaInicio(hoy)}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSemanaInicio(addWeeks(semanaInicio, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Input
          placeholder="Buscar persona..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-48 h-9"
        />

        <Select value={departamentoId} onValueChange={setDepartamentoId}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {departamentos.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
          <SelectTrigger className="w-52 h-9">
            <SelectValue placeholder="Filtrar proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los proyectos</SelectItem>
            {data?.proyectos.map((p) => (
              <SelectItem key={p.id} value={p.id}>[{p.codigo}] {p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Cargando planificación...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[200px_repeat(7,1fr)_70px] text-xs font-medium text-muted-foreground border-b mb-0.5 pb-1">
              <div className="px-3">Persona</div>
              {diasHeader.map(({ dateKey, d }) => {
                const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
                const dayName = d.toLocaleDateString('es', { weekday: 'short', timeZone: 'UTC' })
                const dayNum = d.getUTCDate()
                return (
                  <div key={dateKey} className={cn('text-center', isWeekend && 'text-muted-foreground/50')}>
                    {dayName} {dayNum}
                  </div>
                )
              })}
              <div className="text-center">Util.</div>
            </div>

            {personasFiltradas.length === 0 && !loading && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No hay personal en esta semana
              </div>
            )}

            {personasFiltradas.map((persona) => (
              <div
                key={persona.userId}
                className="grid grid-cols-[200px_repeat(7,1fr)_70px] h-10 border-b hover:bg-muted/20 items-center"
              >
                <div className="flex items-center gap-2 px-3 overflow-hidden">
                  <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                    {persona.iniciales}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate leading-none">{persona.nombre}</p>
                    {persona.cargo && (
                      <p className="text-xs text-muted-foreground truncate">{persona.cargo}</p>
                    )}
                  </div>
                </div>

                {diasHeader.map(({ dateKey, d }) => {
                  const celdasDia = persona.dias[dateKey] ?? []
                  const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
                  const dimmed =
                    !!proyectoFiltro &&
                    celdasDia.length > 0 &&
                    !celdasDia.some((c) => c.proyecto?.id === proyectoFiltro)
                  return (
                    <div key={dateKey} className={cn('h-full px-0.5 py-1', isWeekend && 'bg-muted/30')}>
                      <CeldaDia
                        celda={celdasDia}
                        dimmed={dimmed}
                        onClickEmpty={() =>
                          setModalCelda({ userId: persona.userId, nombre: persona.nombre, fecha: dateKey })
                        }
                        onClickProyecto={() =>
                          setModalCelda({
                            userId: persona.userId,
                            nombre: persona.nombre,
                            fecha: dateKey,
                            celda: celdasDia[0],
                          })
                        }
                        onClickAusencia={() => setModalAusencia(celdasDia[0])}
                      />
                    </div>
                  )
                })}

                <div className="flex items-center justify-center">
                  <UtilBadge util={persona.utilizacion} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#3B82F666' }} /> Proyecto
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded"
            style={{ background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 3px, #e5e7eb 3px, #e5e7eb 6px)' }}
          /> Ausencia
        </span>
        <span className="flex items-center gap-1">⏰ Excepcional</span>
        {data?.proyectos.map((p) => (
          <span key={p.id} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: p.color + '88' }} />
            [{p.codigo}] {p.nombre}
          </span>
        ))}
      </div>

      {modalCelda && (
        <AsignacionCeldaModal
          open={true}
          onClose={() => setModalCelda(null)}
          onSaved={() => { setModalCelda(null); reload() }}
          userId={modalCelda.userId}
          userName={modalCelda.nombre}
          fecha={modalCelda.fecha}
          celdaExistente={modalCelda.celda}
        />
      )}

      <AusenciaDetailModal
        open={!!modalAusencia}
        onClose={() => setModalAusencia(null)}
        celda={modalAusencia}
      />

      <CopiarSemanaModal
        open={showCopiarModal}
        onClose={() => { setShowCopiarModal(false); reload() }}
        semanaActual={semanaInicio}
        departamentoId={departamentoId || undefined}
      />
    </div>
  )
}
