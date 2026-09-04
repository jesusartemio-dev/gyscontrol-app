'use client'

import { tieneRol } from '@/lib/auth/roles'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader2, ShieldCheck, Search, ArrowUp, ArrowDown, MapPin } from 'lucide-react'
import { formatearTardanza } from '@/lib/utils/formatTardanza'
import { MatrizDiaCompacta, FranjaDepartamento, DEPT_STYLES, type GrupoMatriz } from '@/components/planificacion/MatrizDiaCompacta'

interface Fila {
  id: string
  fechaHora: string
  tipo: string
  minutosTarde: number
  estado: string
  dentroGeofence: boolean
  distanciaMetros: number | null
  metodoMarcaje: 'qr_estatico' | 'qr_supervisor' | 'gps_directo' | 'visita_externa' | 'manual_supervisor' | 'remoto'
  observacion: string | null
  banderas: string[]
  user: { name: string | null; email: string }
  empleado: { departamento: { nombre: string } | null; cargo: { nombre: string } | null } | null
  ubicacion: { nombre: string; tipo: string } | null
}

type SortKey = 'fechaHora' | 'trabajador' | 'minutosTarde' | 'distancia'
type SortDir = 'asc' | 'desc'

function fmtFecha(d: Date) {
  return d.toISOString().slice(0, 10)
}
function hoy() { return fmtFecha(new Date()) }
function haceDias(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return fmtFecha(d)
}
function inicioSemana(ref: Date = new Date()) {
  const d = new Date(ref)
  const diff = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - diff)
  return fmtFecha(d)
}
function inicioMes(ref: Date = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), 1)
  return fmtFecha(d)
}
function finMes(ref: Date = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  return fmtFecha(d)
}

const PRESETS: Array<{ label: string; desde: () => string; hasta: () => string }> = [
  { label: 'Hoy', desde: () => hoy(), hasta: () => hoy() },
  { label: 'Ayer', desde: () => haceDias(1), hasta: () => haceDias(1) },
  { label: 'Esta semana', desde: () => inicioSemana(), hasta: () => hoy() },
  {
    label: 'Semana pasada',
    desde: () => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return inicioSemana(d)
    },
    hasta: () => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      const inicio = new Date(inicioSemana(d))
      inicio.setDate(inicio.getDate() + 6)
      return fmtFecha(inicio)
    },
  },
  { label: 'Este mes', desde: () => inicioMes(), hasta: () => hoy() },
  {
    label: 'Mes pasado',
    desde: () => {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      return inicioMes(d)
    },
    hasta: () => {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      return finMes(d)
    },
  },
  { label: 'Últimos 7 días', desde: () => haceDias(6), hasta: () => hoy() },
  { label: 'Últimos 30 días', desde: () => haceDias(29), hasta: () => hoy() },
]

function estadoColor(e: string) {
  switch (e) {
    case 'a_tiempo': return 'bg-emerald-100 text-emerald-700'
    case 'tarde': return 'bg-amber-100 text-amber-700'
    case 'muy_tarde': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const ROLES_SUPERVISION_DISPOSITIVOS = ['admin', 'gerente', 'coordinador', 'gestor']
// Coordinador (vía PersonalProyecto) y gestor (vía Proyecto.gestorId) ven
// Detalle/Resumen acotado a su propio equipo — el scope lo aplica el
// endpoint (getUserIdsDeMiEquipo en /api/asistencia/reporte), esto solo
// decide si se les muestra el botón.
const ROLES_VER_EQUIPO = ['coordinador', 'gestor']
const STORAGE_KEY = 'gys_asistencia_por_proyecto_filtros'

export default function SupervisionAsistencia() {
  const { data: session } = useSession()
  const puedeSupervisarDispositivos = tieneRol(session, ROLES_SUPERVISION_DISPOSITIVOS)
  const puedeVerEquipo = tieneRol(session, ROLES_VER_EQUIPO)

  const [vista, setVista] = useState<'por_proyecto' | 'detalle' | 'resumen'>('por_proyecto')
  const [desde, setDesde] = useState(haceDias(7))
  const [hasta, setHasta] = useState(hoy())

  const [porProyectoData, setPorProyectoData] = useState<{
    userId: string; nombre: string; departamento: string; diasConAsistencia: number
    proyectos: {
      proyectoId: string; codigo: string; nombre: string; color: string
      horasAprobadas: number; horasPendientes: number; jornadas: number
    }[]
  }[]>([])
  const [porProyectoLoading, setPorProyectoLoading] = useState(false)

  // Detalle/Resumen de mi equipo (coordinador/gestor)
  const [data, setData] = useState<Fila[]>([])
  const [loading, setLoading] = useState(false)
  const [estado, setEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('fechaHora')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  async function cargarPorProyecto(ov: { desde?: string; hasta?: string } = {}) {
    setPorProyectoLoading(true)
    const d = ov.desde ?? desde
    const h = ov.hasta ?? hasta
    const params = new URLSearchParams({ desde: d, hasta: h })
    try {
      const r = await fetch(`/api/asistencia/por-proyecto?${params}`)
      const j = await r.json()
      setPorProyectoData(Array.isArray(j.personas) ? j.personas : [])
    } catch {
      setPorProyectoData([])
    } finally {
      setPorProyectoLoading(false)
    }
  }

  async function cargarEquipo(ov: { desde?: string; hasta?: string; estado?: string; busqueda?: string } = {}) {
    setLoading(true)
    const d = ov.desde ?? desde
    const h = ov.hasta ?? hasta
    const e = ov.estado ?? estado
    const q = (ov.busqueda ?? busqueda).trim()
    const params = new URLSearchParams({ desde: d, hasta: h })
    if (e !== 'todos') params.set('estado', e)
    if (q) params.set('q', q)
    try {
      const r = await fetch(`/api/asistencia/reporte?${params}`)
      const j = await r.json()
      setData(Array.isArray(j?.data) ? j.data : [])
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Inicializar desde localStorage y cargar datos con los filtros guardados
  useEffect(() => {
    let ovProyecto: { desde?: string; hasta?: string } = {}
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (saved.desde) { setDesde(saved.desde); ovProyecto.desde = saved.desde }
      if (saved.hasta) { setHasta(saved.hasta); ovProyecto.hasta = saved.hasta }
      if (saved.estado) setEstado(saved.estado)
      if (saved.busqueda) setBusqueda(saved.busqueda)
      if (saved.sortKey) setSortKey(saved.sortKey)
      if (saved.sortDir) setSortDir(saved.sortDir)
      if (saved.vista === 'detalle' || saved.vista === 'resumen') setVista(saved.vista)
    } catch {}
    cargarPorProyecto(ovProyecto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Corrige la vista si `session` recién resolvió y el usuario no puede ver
  // su equipo (venía restaurada de localStorage con un valor que ya no le
  // corresponde).
  useEffect(() => {
    if (!session) return
    if (!puedeVerEquipo && vista !== 'por_proyecto') {
      setVista('por_proyecto')
    }
  }, [session, puedeVerEquipo, vista])

  // Cargar Detalle/Resumen la primera vez que se entra a esa vista
  useEffect(() => {
    if ((vista === 'detalle' || vista === 'resumen') && puedeVerEquipo && data.length === 0 && !loading) {
      cargarEquipo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, puedeVerEquipo])

  // Persistir filtros en localStorage cada vez que cambian
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ desde, hasta, estado, busqueda, sortKey, sortDir, vista }))
    } catch {}
  }, [desde, hasta, estado, busqueda, sortKey, sortDir, vista])

  function aplicarPreset(p: typeof PRESETS[number]) {
    const d = p.desde()
    const h = p.hasta()
    setDesde(d)
    setHasta(h)
    if (vista === 'por_proyecto') cargarPorProyecto({ desde: d, hasta: h })
    else cargarEquipo({ desde: d, hasta: h })
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'fechaHora' ? 'desc' : 'asc')
    }
  }

  const dataFiltrada = useMemo(() => {
    let rows = data
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      rows = rows.filter(f =>
        (f.user.name || '').toLowerCase().includes(q) ||
        f.user.email.toLowerCase().includes(q) ||
        (f.empleado?.departamento?.nombre || '').toLowerCase().includes(q) ||
        (f.ubicacion?.nombre || '').toLowerCase().includes(q),
      )
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'fechaHora') {
        cmp = new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
      } else if (sortKey === 'trabajador') {
        cmp = (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email)
      } else if (sortKey === 'minutosTarde') {
        cmp = a.minutosTarde - b.minutosTarde
      } else if (sortKey === 'distancia') {
        cmp = (a.distanciaMetros ?? -1) - (b.distanciaMetros ?? -1)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [data, busqueda, sortKey, sortDir])

  const resumenPorPersona = useMemo(() => {
    type Grupo = { ingresos: Fila[]; salidas: Fila[] }
    const grupos = new Map<string, Grupo>()

    for (const f of dataFiltrada) {
      if (f.tipo !== 'ingreso' && f.tipo !== 'salida') continue
      const fechaLima = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(f.fechaHora))
      const key = `${f.user.email}|${fechaLima}`
      if (!grupos.has(key)) grupos.set(key, { ingresos: [], salidas: [] })
      const g = grupos.get(key)!
      if (f.tipo === 'ingreso') g.ingresos.push(f)
      else g.salidas.push(f)
    }

    return Array.from(grupos.entries())
      .map(([key, { ingresos, salidas }]) => {
        const fecha = key.split('|')[1]
        const sortAsc = (a: Fila, b: Fila) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
        const primerIngreso = [...ingresos].sort(sortAsc)[0] ?? null
        const salidasPost = primerIngreso
          ? salidas.filter(s => new Date(s.fechaHora) > new Date(primerIngreso.fechaHora))
          : salidas
        const ultimaSalida = [...salidasPost].sort(sortAsc).at(-1) ?? null
        const ref = primerIngreso ?? ([...salidas].sort(sortAsc).at(-1) ?? null)!

        const horasTrabajadas = primerIngreso && ultimaSalida
          ? (new Date(ultimaSalida.fechaHora).getTime() - new Date(primerIngreso.fechaHora).getTime()) / 3600000
          : null

        return {
          key,
          fecha,
          nombre: ref.user.name || ref.user.email,
          email: ref.user.email,
          dpto: ref.empleado?.departamento?.nombre ?? null,
          ingreso: primerIngreso ? {
            hora: new Date(primerIngreso.fechaHora),
            estado: primerIngreso.estado,
            minutosTarde: primerIngreso.minutosTarde,
          } : null,
          salida: ultimaSalida ? {
            hora: new Date(ultimaSalida.fechaHora),
            esAutoCierre: ultimaSalida.banderas?.includes('auto_cierre') ?? false,
          } : null,
          horasTrabajadas,
        }
      })
      .sort((a, b) => {
        const fd = b.fecha.localeCompare(a.fecha)
        return fd !== 0 ? fd : a.nombre.localeCompare(b.nombre)
      })
  }, [dataFiltrada])

  function formatDistancia(m: number | null) {
    if (m == null) return '—'
    return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(2)}km`
  }

  function fmtHoras(h: number) {
    const horas = Math.floor(h)
    const mins = Math.round((h - horas) * 60)
    return mins === 0 ? `${horas}h` : `${horas}h ${mins}m`
  }

  function onFiltrar() {
    if (vista === 'por_proyecto') cargarPorProyecto()
    else cargarEquipo()
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asistencia por Proyecto</h1>
          <p className="text-sm text-muted-foreground">
            {vista === 'por_proyecto'
              ? 'Horas de campo ejecutadas por persona, agrupadas por proyecto'
              : 'Marcajes de tu equipo — proyectos donde eres gestor o coordinador'}
          </p>
        </div>
        {puedeSupervisarDispositivos && (
          <Link href="/supervision/asistencia/dispositivos">
            <Button variant="outline">
              <ShieldCheck className="mr-2 h-4 w-4" /> Aprobar dispositivos
            </Button>
          </Link>
        )}
      </div>

      {/* Presets rápidos */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <span className="mr-1 text-xs font-medium text-muted-foreground">Rápido:</span>
          {PRESETS.map(p => (
            <Button
              key={p.label}
              size="sm"
              variant="outline"
              onClick={() => aplicarPreset(p)}
              className="h-7 text-xs"
            >
              {p.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          {vista !== 'por_proyecto' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Estado</label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="a_tiempo">A tiempo</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="muy_tarde">Muy tarde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground">Buscar (nombre, email, depto, ubicación)</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Ej. Juan..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
          <Button onClick={onFiltrar} disabled={porProyectoLoading || loading}>
            {(porProyectoLoading || loading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Filtrar
          </Button>
        </CardContent>
      </Card>

      {/* Toggle de vista (Detalle/Resumen solo para coordinador/gestor) */}
      {puedeVerEquipo && (
        <div className="mb-3 flex overflow-hidden rounded-lg border text-sm w-fit">
          <button
            onClick={() => setVista('por_proyecto')}
            className={`px-3 py-1.5 transition-colors ${vista === 'por_proyecto' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Por Proyecto
          </button>
          <button
            onClick={() => setVista('detalle')}
            className={`px-3 py-1.5 transition-colors ${vista === 'detalle' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Detalle
          </button>
          <button
            onClick={() => setVista('resumen')}
            className={`px-3 py-1.5 transition-colors ${vista === 'resumen' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Resumen
          </button>
        </div>
      )}

      {/* Por Proyecto */}
      {vista === 'por_proyecto' && (
        porProyectoLoading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos por proyecto...
          </div>
        ) : porProyectoData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Sin registros de jornada de campo en el período seleccionado.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Totales */}
            {(() => {
              const totalAprobadas = porProyectoData.reduce((s, p) => s + p.proyectos.reduce((ps, pr) => ps + pr.horasAprobadas, 0), 0)
              const totalPendientes = porProyectoData.reduce((s, p) => s + p.proyectos.reduce((ps, pr) => ps + pr.horasPendientes, 0), 0)
              const fmtH = (h: number) => { if (h === 0) return '—'; const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return mm === 0 ? `${hh}h` : `${hh}h ${mm}m` }
              return (
                <div className="flex flex-wrap gap-3">
                  <Card className="flex-1 min-w-[140px]"><CardContent className="py-3">
                    <p className="text-xs text-muted-foreground">Personas</p>
                    <p className="text-2xl font-bold">{porProyectoData.length}</p>
                  </CardContent></Card>
                  <Card className="flex-1 min-w-[140px]"><CardContent className="py-3">
                    <p className="text-xs text-muted-foreground">H. aprobadas</p>
                    <p className="text-2xl font-bold text-emerald-700">{fmtH(totalAprobadas)}</p>
                  </CardContent></Card>
                  {totalPendientes > 0 && (
                    <Card className="flex-1 min-w-[140px]"><CardContent className="py-3">
                      <p className="text-xs text-muted-foreground">H. pendientes</p>
                      <p className="text-2xl font-bold text-amber-700">{fmtH(totalPendientes)}</p>
                    </CardContent></Card>
                  )}
                </div>
              )
            })()}

            {/* Tabla agrupada por departamento (franja vertical) */}
            {(() => {
              const fmtH = (h: number) => { if (h === 0) return '—'; const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return mm === 0 ? `${hh}h` : `${hh}h ${mm}m` }
              const gruposPP: Array<{ dept: string; personas: typeof porProyectoData }> = []
              for (const p of porProyectoData) {
                const dept = p.departamento || 'Sin área'
                let g = gruposPP.find(x => x.dept === dept)
                if (!g) { g = { dept, personas: [] }; gruposPP.push(g) }
                g.personas.push(p)
              }
              return (
                <div className="space-y-3">
                  {gruposPP.map((grupo, gi) => (
                    <div key={grupo.dept} className="relative">
                      <FranjaDepartamento nombre={grupo.dept} color={DEPT_STYLES[gi % DEPT_STYLES.length].stripe} />
                      <Card className="ml-3">
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Persona</TableHead>
                                <TableHead>Proyecto</TableHead>
                                <TableHead className="text-center">Jornadas</TableHead>
                                <TableHead className="text-center hidden md:table-cell">Días c/ingreso</TableHead>
                                <TableHead className="text-right">H. aprobadas</TableHead>
                                <TableHead className="text-right">H. pendientes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {grupo.personas.map(persona => (
                                persona.proyectos.map((proy, pi) => (
                                  <TableRow key={`${persona.userId}-${proy.proyectoId}`}>
                                    {pi === 0 && (
                                      <TableCell rowSpan={persona.proyectos.length} className="align-top font-medium border-r">
                                        {persona.nombre}
                                      </TableCell>
                                    )}
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: proy.color }} />
                                        <span className="font-mono text-xs text-muted-foreground">{proy.codigo}</span>
                                        <span className="text-sm truncate max-w-[200px]">{proy.nombre}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="outline" className="font-mono text-xs">{proy.jornadas}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center hidden md:table-cell">
                                      {pi === 0 ? (
                                        persona.diasConAsistencia > 0
                                          ? <Badge variant="outline" className="font-mono text-xs border-blue-400 text-blue-700">{persona.diasConAsistencia}d</Badge>
                                          : <span className="text-xs text-muted-foreground">—</span>
                                      ) : null}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                      {proy.horasAprobadas > 0
                                        ? <span className="text-emerald-700 font-semibold">{fmtH(proy.horasAprobadas)}</span>
                                        : <span className="text-muted-foreground text-xs">—</span>}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                      {proy.horasPendientes > 0
                                        ? <span className="text-amber-700">{fmtH(proy.horasPendientes)}</span>
                                        : <span className="text-muted-foreground text-xs">—</span>}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )
            })()}
            <p className="text-xs text-muted-foreground text-center">
              Aprobadas: jornadas de campo aprobadas · Pendientes: iniciadas o en revisión
            </p>
          </div>
        )
      )}

      {/* Resumen de mi equipo */}
      {vista === 'resumen' && puedeVerEquipo && (() => {
        const fmtTime = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })
        const diasEnRango: string[] = []
        const dCur = new Date(desde + 'T12:00:00Z')
        const dFin = new Date(hasta + 'T12:00:00Z')
        while (dCur <= dFin) { diasEnRango.push(dCur.toISOString().slice(0, 10)); dCur.setUTCDate(dCur.getUTCDate() + 1) }

        if (loading) return (
          <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        )

        const personaMap = new Map<string, { nombre: string; dpto: string | null; dias: Map<string, typeof resumenPorPersona[0]> }>()
        for (const r of resumenPorPersona) {
          if (!personaMap.has(r.email)) personaMap.set(r.email, { nombre: r.nombre, dpto: r.dpto, dias: new Map() })
          personaMap.get(r.email)!.dias.set(r.fecha, r)
        }
        const personas = Array.from(personaMap.values()).sort((a, b) => (a.dpto || '').localeCompare(b.dpto || '') || a.nombre.localeCompare(b.nombre))

        if (personas.length === 0) return (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Sin registros en el rango seleccionado.</div>
        )

        const gruposResumen: GrupoMatriz<typeof personas[0]>[] = []
        for (const p of personas) {
          const dept = p.dpto || 'Sin área'
          let g = gruposResumen.find(x => x.dept === dept)
          if (!g) { g = { dept, personas: [] }; gruposResumen.push(g) }
          g.personas.push(p)
        }

        return (
          <MatrizDiaCompacta<typeof personas[0]>
            dias={diasEnRango}
            grupos={gruposResumen}
            getKey={p => p.nombre + (p.dpto ?? '')}
            nameColWidthPx={170}
            colWidthPx={62}
            rowMinHeightClass="min-h-[56px]"
            totalHeader="Total"
            renderNombre={p => (
              <span className="text-xs font-medium truncate" title={p.nombre}>{p.nombre}</span>
            )}
            renderCelda={(persona, dStr) => {
              const r = persona.dias.get(dStr)
              if (!r) return <span className="text-muted-foreground/30 text-xs">—</span>

              const estadoBg = !r.ingreso ? 'bg-muted/40' :
                r.ingreso.estado === 'a_tiempo' ? 'bg-emerald-50' :
                r.ingreso.estado === 'tarde' ? 'bg-amber-50' :
                r.ingreso.estado === 'muy_tarde' ? 'bg-red-50' : ''

              return (
                <div className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded py-0.5 ${estadoBg}`}>
                  {r.ingreso ? (
                    <span className={`font-mono text-xs font-semibold leading-none ${
                      r.ingreso.estado === 'a_tiempo' ? 'text-emerald-700' :
                      r.ingreso.estado === 'tarde' ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {fmtTime(r.ingreso.hora)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">sin ing.</span>
                  )}
                  {r.salida ? (
                    <span className="font-mono text-xs text-muted-foreground leading-none">
                      {fmtTime(r.salida.hora)}{r.salida.esAutoCierre ? '·auto' : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 leading-none">sin sal.</span>
                  )}
                  {r.horasTrabajadas != null ? (
                    <span className={`text-[11px] font-bold leading-none mt-0.5 ${
                      r.horasTrabajadas < 4 ? 'text-red-600' :
                      r.horasTrabajadas >= 8 ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {fmtHoras(r.horasTrabajadas)}
                    </span>
                  ) : null}
                  {r.ingreso && r.ingreso.minutosTarde > 0 && (
                    <span className="text-[9px] text-amber-600 leading-none">+{r.ingreso.minutosTarde}m</span>
                  )}
                </div>
              )
            }}
            renderTotal={persona => {
              let total = 0
              for (const dStr of diasEnRango) {
                const r = persona.dias.get(dStr)
                if (r?.horasTrabajadas != null) total += r.horasTrabajadas
              }
              return total > 0
                ? <span className="text-xs font-bold text-emerald-700">{fmtHoras(total)}</span>
                : <span className="text-xs font-medium text-muted-foreground">—</span>
            }}
          />
        )
      })()}

      {/* Detalle de mi equipo */}
      {vista === 'detalle' && puedeVerEquipo && (
        loading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button onClick={() => toggleSort('fechaHora')} className="flex items-center gap-1 hover:text-foreground">
                        Fecha/Hora
                        {sortKey === 'fechaHora' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort('trabajador')} className="flex items-center gap-1 hover:text-foreground">
                        Trabajador
                        {sortKey === 'trabajador' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </TableHead>
                    <TableHead>Dpto.</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort('minutosTarde')} className="flex items-center gap-1 hover:text-foreground">
                        Min tarde
                        {sortKey === 'minutosTarde' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort('distancia')} className="flex items-center gap-1 hover:text-foreground">
                        Distancia
                        {sortKey === 'distancia' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataFiltrada.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {new Date(f.fechaHora).toLocaleString('es-PE')}
                      </TableCell>
                      <TableCell>{f.user.name || f.user.email}</TableCell>
                      <TableCell className="text-xs">{f.empleado?.departamento?.nombre || '—'}</TableCell>
                      <TableCell>{f.tipo.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span>
                            {f.ubicacion?.nombre || (f.metodoMarcaje === 'remoto' ? 'Casa' : '—')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{f.minutosTarde > 0 ? formatearTardanza(f.minutosTarde) : '—'}</TableCell>
                      <TableCell>
                        {f.distanciaMetros != null ? (
                          <span className={`inline-flex items-center gap-1 text-xs ${f.dentroGeofence ? 'text-emerald-600' : 'text-red-600'}`}>
                            <MapPin className="h-3 w-3" /> {formatDistancia(f.distanciaMetros)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoColor(f.estado)} variant="outline">
                          {f.estado.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {dataFiltrada.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Sin registros en el rango seleccionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}
