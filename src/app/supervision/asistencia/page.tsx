'use client'

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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, ShieldCheck, FileSpreadsheet, Trash2, Search, ArrowUp, ArrowDown, MapPin, Smartphone, MapPinOff, Moon, Home, Briefcase } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { formatearTardanza } from '@/lib/utils/formatTardanza'

interface Fila {
  id: string
  fechaHora: string
  tipo: string
  minutosTarde: number
  estado: string
  dentroGeofence: boolean
  distanciaMetros: number | null
  latitud: number | null
  longitud: number | null
  precisionGps: number | null
  metodoMarcaje: 'qr_estatico' | 'qr_supervisor' | 'gps_directo' | 'visita_externa' | 'manual_supervisor' | 'remoto'
  observacion: string | null
  banderas: string[]
  user: { name: string | null; email: string }
  empleado: { departamento: { nombre: string } | null; cargo: { nombre: string } | null } | null
  ubicacion: { nombre: string; tipo: string } | null
  dispositivo: { nombre: string | null; modelo: string | null; plataforma: string; aprobado: boolean }
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
    // Legacy (registros viejos que aún no han sido migrados)
    case 'fuera_zona': return 'bg-orange-100 text-orange-700'
    case 'dispositivo_nuevo': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const ROLES_SUPERVISION_DISPOSITIVOS = ['admin', 'gerente', 'coordinador', 'gestor']

export default function SupervisionAsistencia() {
  const { data: session } = useSession()
  const esAdmin = session?.user?.role === 'admin' || session?.user?.role === 'gerente'
  const puedeSupervisarDispositivos = ROLES_SUPERVISION_DISPOSITIVOS.includes(
    session?.user?.role || '',
  )

  const [data, setData] = useState<Fila[]>([])
  const [loading, setLoading] = useState(false)
  const [desde, setDesde] = useState(haceDias(7))
  const [hasta, setHasta] = useState(hoy())
  const [estado, setEstado] = useState('todos')
  const [metodo, setMetodo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('fechaHora')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [filaAEliminar, setFilaAEliminar] = useState<Fila | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const [visitasMes, setVisitasMes] = useState<{
    umbral: number
    resumen: Array<{
      userId: string
      nombre: string
      email: string
      totalDiasMarcados: number
      diasVisitaExterna: number
      ratio: number
      excedeUmbral: boolean
      ultimosLugares: string[]
    }>
  } | null>(null)
  const [dialogVisitas, setDialogVisitas] = useState(false)

  async function cargar(overrideDesde?: string, overrideHasta?: string) {
    setLoading(true)
    const d = overrideDesde ?? desde
    const h = overrideHasta ?? hasta
    const params = new URLSearchParams({ desde: d, hasta: h })
    if (estado !== 'todos') params.set('estado', estado)
    if (metodo !== 'todos') params.set('metodoMarcaje', metodo)
    const r = await fetch(`/api/asistencia/reporte?${params}`)
    const j = await r.json()
    setData(Array.isArray(j) ? j : [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    fetch('/api/asistencia/visitas-externas-mes')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setVisitasMes(d))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const usuariosExcedenUmbral = useMemo(
    () => new Set((visitasMes?.resumen || []).filter(r => r.excedeUmbral).map(r => r.email)),
    [visitasMes],
  )

  function aplicarPreset(p: typeof PRESETS[number]) {
    const d = p.desde()
    const h = p.hasta()
    setDesde(d)
    setHasta(h)
    cargar(d, h)
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

  const contadores = useMemo(() => {
    const c = { total: 0, a_tiempo: 0, tarde: 0, muy_tarde: 0, fuera_zona: 0, dispositivo_nuevo: 0, sin_qr: 0, sin_gps: 0 }
    for (const f of dataFiltrada) {
      c.total++
      // Puntualidad
      if (f.estado === 'a_tiempo') c.a_tiempo++
      else if (f.estado === 'tarde') c.tarde++
      else if (f.estado === 'muy_tarde') c.muy_tarde++
      // Alertas (pueden convivir con cualquier puntualidad)
      if (f.banderas?.includes('fuera_zona') || (!f.dentroGeofence && f.metodoMarcaje !== 'remoto')) c.fuera_zona++
      if (f.banderas?.includes('dispositivo_nuevo')) c.dispositivo_nuevo++
      if (f.metodoMarcaje === 'gps_directo') c.sin_qr++
      // Marcaje presencial sin coordenadas registradas — bypass histórico antes del fix
      if (f.metodoMarcaje === 'gps_directo' && f.distanciaMetros == null) c.sin_gps++
    }
    return c
  }, [dataFiltrada])

  async function confirmarEliminar() {
    if (!filaAEliminar) return
    setEliminando(true)
    try {
      const r = await fetch(`/api/asistencia/${filaAEliminar.id}`, { method: 'DELETE' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        toast.error(j.error || 'Error al eliminar')
        return
      }
      toast.success('Marcaje eliminado')
      setData(prev => prev.filter(f => f.id !== filaAEliminar.id))
      setFilaAEliminar(null)
    } finally {
      setEliminando(false)
    }
  }

  function exportarExcel() {
    const rows = dataFiltrada.map(f => ({
      Fecha: new Date(f.fechaHora).toLocaleString('es-PE'),
      Trabajador: f.user.name || f.user.email,
      Departamento: f.empleado?.departamento?.nombre || '',
      Cargo: f.empleado?.cargo?.nombre || '',
      Tipo: f.tipo,
      Modo: f.metodoMarcaje === 'remoto' ? 'Remoto' : 'Presencial',
      Ubicación: f.ubicacion?.nombre || (f.metodoMarcaje === 'remoto' ? 'Casa' : ''),
      'Min. tarde': f.minutosTarde,
      'Distancia (m)': f.distanciaMetros != null ? Math.round(f.distanciaMetros) : '',
      Estado: f.estado,
      Geofence: f.metodoMarcaje === 'remoto' ? 'N/A' : f.dentroGeofence ? 'Dentro' : 'Fuera',
      Método: f.metodoMarcaje,
      Dispositivo: `${f.dispositivo.modelo || f.dispositivo.plataforma}${f.dispositivo.aprobado ? '' : ' (NUEVO)'}`,
      Banderas: f.banderas.join(', '),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia')
    XLSX.writeFile(wb, `asistencia_${desde}_a_${hasta}.xlsx`)
  }

  function formatDistancia(m: number | null) {
    if (m == null) return '—'
    return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(2)}km`
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supervisión de Asistencia</h1>
          <p className="text-sm text-muted-foreground">
            Marcajes del equipo y gestión de dispositivos
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
          <div>
            <label className="text-xs text-muted-foreground">Modo</label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="remoto">Solo remoto</SelectItem>
                <SelectItem value="qr_estatico">QR estático</SelectItem>
                <SelectItem value="qr_supervisor">QR supervisor</SelectItem>
                <SelectItem value="gps_directo">GPS sin QR</SelectItem>
                <SelectItem value="visita_externa">Visita externa</SelectItem>
                <SelectItem value="manual_supervisor">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Buscar (nombre, email, depto, ubicación)</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Ej. Juan, proyectos..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={() => cargar()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Filtrar
          </Button>
          <Button variant="outline" onClick={exportarExcel} disabled={dataFiltrada.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
        </CardContent>
      </Card>

      {/* Alerta de visitas externas del mes (>50%) */}
      {visitasMes && visitasMes.resumen.some(r => r.excedeUmbral) && (
        <Card className="mb-4 border-2 border-amber-400 bg-amber-50">
          <CardContent className="flex items-start justify-between gap-3 py-3">
            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 shrink-0 text-amber-700" />
              <div className="text-sm">
                <p className="font-bold text-amber-900">
                  {visitasMes.resumen.filter(r => r.excedeUmbral).length} trabajador(es) con más del{' '}
                  {Math.round(visitasMes.umbral * 100)}% del mes en visita externa
                </p>
                <p className="text-xs text-amber-800">
                  Revisa si las visitas son legítimas o si están saltando el control de sede oficial.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setDialogVisitas(true)}>
              Ver detalle
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contadores */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-8">
        <Card><CardContent className="py-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{contadores.total}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-xs text-muted-foreground">A tiempo</p>
          <p className="text-2xl font-bold text-emerald-700">{contadores.a_tiempo}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-xs text-muted-foreground">Tarde</p>
          <p className="text-2xl font-bold text-amber-700">{contadores.tarde}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-xs text-muted-foreground">Muy tarde</p>
          <p className="text-2xl font-bold text-red-700">{contadores.muy_tarde}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-xs text-muted-foreground">Fuera zona</p>
          <p className="text-2xl font-bold text-orange-700">{contadores.fuera_zona}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-xs text-muted-foreground">Disp. nuevo</p>
          <p className="text-2xl font-bold text-blue-700">{contadores.dispositivo_nuevo}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-xs text-muted-foreground" title="Marcajes sin escanear QR">Sin QR</p>
          <p className="text-2xl font-bold text-amber-700">{contadores.sin_qr}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p
            className="text-xs text-muted-foreground"
            title="Presencial sin coordenadas registradas — bypass del sistema (legacy)"
          >
            Sin GPS
          </p>
          <p className="text-2xl font-bold text-red-700">{contadores.sin_gps}</p>
        </CardContent></Card>
      </div>

      {/* Tabla */}
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
                <TableHead>Modo</TableHead>
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
                <TableHead>Alertas</TableHead>
                <TableHead>Dispositivo</TableHead>
                {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataFiltrada.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {new Date(f.fechaHora).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      {f.user.name || f.user.email}
                      {usuariosExcedenUmbral.has(f.user.email) && (
                        <span
                          title={`Más del ${Math.round((visitasMes?.umbral ?? 0.5) * 100)}% del mes en visita externa`}
                          className="inline-flex items-center gap-0.5 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
                        >
                          <Briefcase className="h-3 w-3" /> {Math.round(
                            (visitasMes?.resumen.find(r => r.email === f.user.email)?.ratio ?? 0) * 100,
                          )}%
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{f.empleado?.departamento?.nombre || '—'}</TableCell>
                  <TableCell>{f.tipo.replace('_', ' ')}</TableCell>
                  <TableCell>
                    {f.metodoMarcaje === 'remoto' ? (
                      <Badge variant="outline" className="bg-purple-100 text-purple-800">remoto</Badge>
                    ) : f.metodoMarcaje === 'visita_externa' ? (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800" title={f.observacion || 'Visita externa'}>
                        <Briefcase className="mr-1 h-3 w-3" /> visita
                      </Badge>
                    ) : f.metodoMarcaje === 'gps_directo' ? (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800" title="Marcó sin escanear el QR">
                        sin QR
                      </Badge>
                    ) : f.metodoMarcaje === 'manual_supervisor' ? (
                      <Badge variant="outline" className="bg-slate-100 text-slate-700">manual</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">presencial</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {f.metodoMarcaje === 'visita_externa' ? (
                        <span className="text-xs italic text-orange-700" title={f.observacion || ''}>
                          {f.observacion || 'visita'}
                        </span>
                      ) : (
                        <span>
                          {f.ubicacion?.nombre || (f.metodoMarcaje === 'remoto' ? 'Casa' : '—')}
                        </span>
                      )}
                      {f.latitud != null && f.longitud != null && (
                        <a
                          href={`https://www.google.com/maps?q=${f.latitud},${f.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title={`Ver en mapa · ${f.latitud.toFixed(6)}, ${f.longitud.toFixed(6)}${
                            f.precisionGps ? ` · ±${Math.round(f.precisionGps)}m` : ''
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </a>
                      )}
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
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(f.banderas?.includes('dispositivo_nuevo') || f.estado === 'dispositivo_nuevo') && (
                        <span
                          title="Dispositivo nuevo"
                          className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700"
                        >
                          <Smartphone className="h-3 w-3" /> nuevo
                        </span>
                      )}
                      {(f.banderas?.includes('fuera_zona') || f.estado === 'fuera_zona' || (!f.dentroGeofence && f.metodoMarcaje !== 'remoto')) && (
                        <span
                          title="Fuera de zona"
                          className="inline-flex items-center gap-0.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700"
                        >
                          <MapPinOff className="h-3 w-3" /> fuera
                        </span>
                      )}
                      {f.metodoMarcaje === 'gps_directo' && f.distanciaMetros == null && (
                        <span
                          title="Marcaje presencial sin coordenadas — bypass del sistema (legacy)"
                          className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700"
                        >
                          <MapPinOff className="h-3 w-3" /> sin GPS
                        </span>
                      )}
                      {f.banderas?.includes('auto_cierre') && (
                        <span
                          title="Salida cerrada automáticamente"
                          className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                        >
                          <Moon className="h-3 w-3" /> auto
                        </span>
                      )}
                      {f.banderas?.some(b => b.startsWith('remoto:')) && (
                        <span
                          title="Origen remoto"
                          className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700"
                        >
                          <Home className="h-3 w-3" /> remoto
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.dispositivo.modelo
                      ? f.dispositivo.modelo.includes(f.dispositivo.plataforma)
                        ? f.dispositivo.modelo
                        : `${f.dispositivo.plataforma} · ${f.dispositivo.modelo}`
                      : f.dispositivo.plataforma}
                    {!f.dispositivo.aprobado && (
                      <Badge variant="outline" className="ml-1 bg-blue-50 text-blue-700">nuevo</Badge>
                    )}
                  </TableCell>
                  {esAdmin && (
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600 hover:bg-red-50"
                        onClick={() => setFilaAEliminar(f)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {dataFiltrada.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={esAdmin ? 12 : 11} className="py-8 text-center text-muted-foreground">
                    Sin registros en el rango seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog detalle de visitas externas del mes */}
      <Dialog open={dialogVisitas} onOpenChange={setDialogVisitas}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Visitas externas del mes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {visitasMes && visitasMes.resumen.length > 0 ? (
              visitasMes.resumen.map(r => (
                <div
                  key={r.userId}
                  className={`rounded-md border p-3 text-sm ${
                    r.excedeUmbral ? 'border-amber-400 bg-amber-50' : 'border-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.nombre}</p>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        r.excedeUmbral ? 'bg-amber-200 text-amber-900' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {Math.round(r.ratio * 100)}% ({r.diasVisitaExterna}/{r.totalDiasMarcados} días)
                    </span>
                  </div>
                  {r.ultimosLugares.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Últimos lugares: {r.ultimosLugares.join(' · ')}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nadie ha registrado visitas externas este mes.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setDialogVisitas(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog open={!!filaAEliminar} onOpenChange={v => !v && setFilaAEliminar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este marcaje?</DialogTitle>
          </DialogHeader>
          {filaAEliminar && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Esta acción <strong>elimina definitivamente</strong> el registro. No se puede deshacer.
              </p>
              <div className="rounded bg-muted p-3">
                <p className="font-semibold">{filaAEliminar.user.name || filaAEliminar.user.email}</p>
                <p className="text-xs">
                  {new Date(filaAEliminar.fechaHora).toLocaleString('es-PE')} — {filaAEliminar.tipo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {filaAEliminar.ubicacion?.nombre || (filaAEliminar.metodoMarcaje === 'remoto' ? 'Remoto' : '—')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilaAEliminar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarEliminar} disabled={eliminando}>
              {eliminando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
