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
const STORAGE_KEY = 'gys_asistencia_filtros'

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

  const [vista, setVista] = useState<'detalle' | 'resumen' | 'por_proyecto' | 'horas_dia'>('detalle')
  const [modoAsistencia, setModoAsistencia] = useState<'todos' | 'campo' | 'remoto' | 'oficina'>('todos')
  const [personasOcultas, setPersonasOcultas] = useState<Set<string>>(new Set())

  const [porProyectoData, setPorProyectoData] = useState<{
    userId: string; nombre: string; departamento: string; diasConAsistencia: number
    proyectos: {
      proyectoId: string; codigo: string; nombre: string; color: string
      horasAprobadas: number; horasPendientes: number; jornadas: number
    }[]
  }[]>([])
  const [porProyectoLoading, setPorProyectoLoading] = useState(false)

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

  async function cargar(ov: { desde?: string; hasta?: string; estado?: string; metodo?: string } = {}) {
    setLoading(true)
    const d = ov.desde ?? desde
    const h = ov.hasta ?? hasta
    const e = ov.estado ?? estado
    const m = ov.metodo ?? metodo
    const params = new URLSearchParams({ desde: d, hasta: h })
    if (e !== 'todos') params.set('estado', e)
    if (m !== 'todos') params.set('metodoMarcaje', m)
    const r = await fetch(`/api/asistencia/reporte?${params}`)
    const j = await r.json()
    setData(Array.isArray(j) ? j : [])
    setLoading(false)
  }

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

  // Inicializar desde localStorage y cargar datos con los filtros guardados
  useEffect(() => {
    let ov: { desde?: string; hasta?: string; estado?: string; metodo?: string } = {}
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (saved.desde)   { setDesde(saved.desde);       ov.desde   = saved.desde   }
      if (saved.hasta)   { setHasta(saved.hasta);       ov.hasta   = saved.hasta   }
      if (saved.estado)  { setEstado(saved.estado);     ov.estado  = saved.estado  }
      if (saved.metodo)  { setMetodo(saved.metodo);     ov.metodo  = saved.metodo  }
      if (saved.busqueda)  setBusqueda(saved.busqueda)
      if (saved.sortKey)   setSortKey(saved.sortKey)
      if (saved.sortDir)   setSortDir(saved.sortDir)
      if (saved.vista)           setVista(saved.vista)
      if (saved.modoAsistencia)  setModoAsistencia(saved.modoAsistencia)
    } catch {}
    cargar(ov)
    fetch('/api/asistencia/visitas-externas-mes')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setVisitasMes(d))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistir filtros en localStorage cada vez que cambian
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ desde, hasta, estado, metodo, busqueda, sortKey, sortDir, vista, modoAsistencia }))
    } catch {}
  }, [desde, hasta, estado, metodo, busqueda, sortKey, sortDir, vista, modoAsistencia])

  const usuariosExcedenUmbral = useMemo(
    () => new Set((visitasMes?.resumen || []).filter(r => r.excedeUmbral).map(r => r.email)),
    [visitasMes],
  )

  function aplicarPreset(p: typeof PRESETS[number]) {
    const d = p.desde()
    const h = p.hasta()
    setDesde(d)
    setHasta(h)
    cargar({ desde: d, hasta: h })
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
        // Solo contar salidas que ocurran DESPUÉS del primer ingreso (evita negativos en turno noche)
        const salidasPost = primerIngreso
          ? salidas.filter(s => new Date(s.fechaHora) > new Date(primerIngreso.fechaHora))
          : salidas
        const ultimaSalida = [...salidasPost].sort(sortAsc).at(-1) ?? null
        const ref = primerIngreso ?? ([...salidas].sort(sortAsc).at(-1) ?? null)!

        const horasTrabajadas = primerIngreso && ultimaSalida
          ? (new Date(ultimaSalida.fechaHora).getTime() - new Date(primerIngreso.fechaHora).getTime()) / 3600000
          : null

        const alertas: string[] = []
        if (ingresos.length > 1) alertas.push('multi_ingreso')
        if (salidas.length > 1) alertas.push('multi_salida')

        return {
          key,
          fecha,
          nombre: ref.user.name || ref.user.email,
          email: ref.user.email,
          dpto: ref.empleado?.departamento?.nombre ?? null,
          ubicacion: (primerIngreso ?? ultimaSalida)?.ubicacion?.nombre ?? null,
          ingreso: primerIngreso ? {
            hora: new Date(primerIngreso.fechaHora),
            estado: primerIngreso.estado,
            minutosTarde: primerIngreso.minutosTarde,
            count: ingresos.length,
          } : null,
          salida: ultimaSalida ? {
            hora: new Date(ultimaSalida.fechaHora),
            esAutoCierre: ultimaSalida.banderas?.includes('auto_cierre') ?? false,
            count: salidas.length,
          } : null,
          horasTrabajadas,
          alertas,
        }
      })
      .sort((a, b) => {
        const fd = b.fecha.localeCompare(a.fecha)
        return fd !== 0 ? fd : a.nombre.localeCompare(b.nombre)
      })
  }, [dataFiltrada])

  const horasDiaData = useMemo(() => {
    type DiaEntry = { horasTrabajadas: number | null; ubicacion: string | null; modo: 'campo' | 'remoto' | 'oficina'; ingresoHora: Date; salidaHora: Date | null }
    type PersonaEntry = { nombre: string; email: string; dpto: string | null; dias: Map<string, DiaEntry> }

    // Agrupar todos los registros por persona (no por día)
    const personRecords = new Map<string, { nombre: string; dpto: string | null; records: Fila[] }>()
    for (const f of dataFiltrada) {
      if (f.tipo !== 'ingreso' && f.tipo !== 'salida') continue
      const email = f.user.email
      if (!personRecords.has(email)) {
        personRecords.set(email, { nombre: f.user.name || email, dpto: f.empleado?.departamento?.nombre ?? null, records: [] })
      }
      personRecords.get(email)!.records.push(f)
    }

    const result: PersonaEntry[] = []

    for (const [email, { nombre, dpto, records }] of personRecords) {
      // Ordenar cronológicamente todos los registros de la persona
      const sorted = [...records].sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())
      const dias = new Map<string, DiaEntry>()

      let i = 0
      while (i < sorted.length) {
        const rec = sorted[i]
        if (rec.tipo !== 'ingreso') { i++; continue }

        const ingreso = rec
        let salida: Fila | null = null
        let nextI = i + 1

        // Buscar el siguiente salida (cross-day incluido); parar si hay otro ingreso antes
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j].tipo === 'salida') {
            salida = sorted[j]
            nextI = j + 1
            break
          }
          if (sorted[j].tipo === 'ingreso') break // ingreso sin salida
        }
        i = nextI

        const fechaLima = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date(ingreso.fechaHora))

        const horasTrabajadas = salida
          ? (new Date(salida.fechaHora).getTime() - new Date(ingreso.fechaHora).getTime()) / 3600000
          : null

        let modo: 'campo' | 'remoto' | 'oficina' = 'oficina'
        if (ingreso.metodoMarcaje === 'remoto') modo = 'remoto'
        else if (ingreso.metodoMarcaje === 'visita_externa' || ingreso.ubicacion?.tipo === 'planta' || ingreso.ubicacion?.tipo === 'obra') modo = 'campo'

        if (modoAsistencia === 'todos' || modo === modoAsistencia) {
          // Varios turnos el mismo día: conservar el de más horas
          const existing = dias.get(fechaLima)
          if (!existing || (horasTrabajadas ?? 0) > (existing.horasTrabajadas ?? 0)) {
            dias.set(fechaLima, {
              horasTrabajadas,
              ubicacion: ingreso.ubicacion?.nombre ?? salida?.ubicacion?.nombre ?? null,
              modo,
              ingresoHora: new Date(ingreso.fechaHora),
              salidaHora: salida ? new Date(salida.fechaHora) : null,
            })
          }
        }
      }

      if (dias.size > 0) result.push({ nombre, email, dpto, dias })
    }
    return result.sort((a, b) => (a.dpto || '').localeCompare(b.dpto || '') || a.nombre.localeCompare(b.nombre))
  }, [dataFiltrada, modoAsistencia])

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

  function fmtHoras(h: number) {
    const horas = Math.floor(h)
    const mins = Math.round((h - horas) * 60)
    return mins === 0 ? `${horas}h` : `${horas}h ${mins}m`
  }

  function exportarResumen() {
    const rows = resumenPorPersona.map(r => ({
      Fecha: r.fecha,
      Trabajador: r.nombre,
      Departamento: r.dpto || '',
      Ubicación: r.ubicacion || '',
      'H. Ingreso': r.ingreso ? r.ingreso.hora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }) : '',
      'Min. tarde': r.ingreso?.minutosTarde ?? 0,
      'Estado ingreso': r.ingreso?.estado ?? '',
      'H. Salida': r.salida ? r.salida.hora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }) : '',
      'Salida auto': r.salida?.esAutoCierre ? 'Sí' : 'No',
      'Horas trabajadas': r.horasTrabajadas != null ? fmtHoras(r.horasTrabajadas) : '',
      Alertas: r.alertas.join(', '),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen')
    XLSX.writeFile(wb, `resumen_asistencia_${desde}_a_${hasta}.xlsx`)
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
          <Button onClick={() => { cargar(); if (vista === 'por_proyecto') cargarPorProyecto() }} disabled={loading || porProyectoLoading}>
            {(loading || porProyectoLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Filtrar
          </Button>
          {vista !== 'por_proyecto' && vista !== 'horas_dia' && (
            <Button
              variant="outline"
              onClick={vista === 'detalle' ? exportarExcel : exportarResumen}
              disabled={dataFiltrada.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
            </Button>
          )}
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

      {/* Toggle de vista */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border text-sm">
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
          <button
            onClick={() => { setVista('por_proyecto'); cargarPorProyecto() }}
            className={`px-3 py-1.5 transition-colors ${vista === 'por_proyecto' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Por Proyecto
          </button>
          <button
            onClick={() => setVista('horas_dia')}
            className={`px-3 py-1.5 transition-colors ${vista === 'horas_dia' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Horas por día
          </button>
        </div>
        {vista === 'resumen' && (
          <span className="text-xs text-muted-foreground">
            {resumenPorPersona.length} jornada(s) · primer ingreso y última salida por día
          </span>
        )}
        {vista === 'por_proyecto' && (
          <span className="text-xs text-muted-foreground">
            Horas de campo ejecutadas (jornadas) agrupadas por proyecto
          </span>
        )}
        {vista === 'horas_dia' && (
          <span className="text-xs text-muted-foreground">
            {horasDiaData.length} persona(s) · horas totales por día según ingreso/salida
          </span>
        )}
      </div>

      {/* Filtro de modo para Horas por día */}
      {vista === 'horas_dia' && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Modo:</span>
          <div className="flex overflow-hidden rounded-md border text-xs">
            {(['todos', 'campo', 'remoto', 'oficina'] as const).map(m => (
              <button
                key={m}
                onClick={() => setModoAsistencia(m)}
                className={`px-3 py-1.5 transition-colors ${modoAsistencia === m ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
              >
                {m === 'todos' ? 'Todos' : m === 'campo' ? 'Campo' : m === 'remoto' ? 'Remoto' : 'Oficina'}
              </button>
            ))}
          </div>
          {personasOcultas.size > 0 && (
            <button
              onClick={() => setPersonasOcultas(new Set())}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Mostrar todas ({personasOcultas.size} oculta{personasOcultas.size !== 1 ? 's' : ''})
            </button>
          )}
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

            {/* Tabla */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Dpto.</TableHead>
                      <TableHead>Proyecto</TableHead>
                      <TableHead className="text-center">Jornadas</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Días c/ingreso</TableHead>
                      <TableHead className="text-right">H. aprobadas</TableHead>
                      <TableHead className="text-right">H. pendientes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porProyectoData.map(persona => {
                      const fmtH = (h: number) => { if (h === 0) return '—'; const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return mm === 0 ? `${hh}h` : `${hh}h ${mm}m` }
                      return persona.proyectos.map((proy, pi) => (
                        <TableRow key={`${persona.userId}-${proy.proyectoId}`}>
                          {pi === 0 && (
                            <TableCell rowSpan={persona.proyectos.length} className="align-top font-medium border-r">
                              {persona.nombre}
                            </TableCell>
                          )}
                          {pi === 0 && (
                            <TableCell rowSpan={persona.proyectos.length} className="align-top text-xs text-muted-foreground border-r">
                              {persona.departamento || '—'}
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
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-center">
              Aprobadas: jornadas de campo aprobadas · Pendientes: iniciadas o en revisión
            </p>
          </div>
        )
      )}

      {/* Horas por día */}
      {vista === 'horas_dia' && (() => {
        const diasEnRango: string[] = []
        const dCur = new Date(desde + 'T12:00:00Z')
        const dFin = new Date(hasta + 'T12:00:00Z')
        while (dCur <= dFin) { diasEnRango.push(dCur.toISOString().slice(0, 10)); dCur.setUTCDate(dCur.getUTCDate() + 1) }
        const DIAS_LABEL = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']

        const fmtTime = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })

        if (horasDiaData.length === 0) return (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Sin registros de asistencia en el período seleccionado.
          </div>
        )

        return (
          <>
            <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
              <table className="w-full border-collapse text-sm" style={{ minWidth: `${280 + diasEnRango.length * 92}px` }}>
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="sticky left-0 z-10 bg-muted/30 text-left px-3 py-2 font-medium text-xs text-muted-foreground w-[180px]">Persona</th>
                    <th className="sticky left-[180px] z-10 bg-muted/30 text-left px-2 py-2 font-medium text-xs text-muted-foreground w-[100px] border-r">Dpto.</th>
                    {diasEnRango.map(d => {
                      const dt = new Date(d + 'T12:00:00Z')
                      const dow = dt.getUTCDay()
                      const isWeekend = dow === 0 || dow === 6
                      return (
                        <th key={d} className={`text-center px-1 py-1.5 font-medium text-xs w-[92px] ${isWeekend ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                          <div>{DIAS_LABEL[dow]}</div>
                          <div className="font-mono">{String(dt.getUTCDate()).padStart(2, '0')}</div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {horasDiaData.filter(p => !personasOcultas.has(p.email)).map((persona, pi) => (
                    <tr key={persona.email} className={`border-b last:border-b-0 ${pi % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                      <td className={`sticky left-0 z-10 px-3 py-1.5 text-sm ${pi % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                        <div className="flex items-center justify-between gap-1 group">
                          <span className="font-medium">{persona.nombre}</span>
                          <button
                            onClick={() => setPersonasOcultas(prev => new Set([...prev, persona.email]))}
                            title="Ocultar fila"
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity text-xs leading-none px-0.5"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                      <td className={`sticky left-[180px] z-10 px-2 py-1.5 text-xs text-muted-foreground border-r ${pi % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                        {persona.dpto || '—'}
                      </td>
                      {diasEnRango.map(dStr => {
                        const dt = new Date(dStr + 'T12:00:00Z')
                        const dow = dt.getUTCDay()
                        const isWeekend = dow === 0 || dow === 6
                        const dia = persona.dias.get(dStr)

                        if (!dia) return (
                          <td key={dStr} className={`text-center px-1 py-1.5 ${isWeekend ? 'bg-muted/20' : ''}`}>
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          </td>
                        )

                        const modoBadge = dia.modo === 'campo'
                          ? 'bg-orange-100 text-orange-700'
                          : dia.modo === 'remoto'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        const modoLabel = dia.modo === 'campo' ? 'Campo' : dia.modo === 'remoto' ? 'Remoto' : 'Oficina'

                        const ubicacionCorta = dia.ubicacion ? dia.ubicacion.split('-')[0].trim() : null
                        return (
                          <td key={dStr} className={`px-1 py-1 text-center ${isWeekend ? 'bg-muted/20' : ''}`}>
                            <div className="flex flex-col items-center gap-0.5 justify-center">
                              <span className="text-[9px] text-muted-foreground font-mono leading-none whitespace-nowrap">
                                ↑{fmtTime(dia.ingresoHora)}{' '}
                                {dia.salidaHora
                                  ? <span>↓{fmtTime(dia.salidaHora)}</span>
                                  : <span className="text-amber-500">↓–</span>}
                              </span>
                              {dia.horasTrabajadas != null ? (
                                <span className={`text-[12px] font-bold leading-none ${
                                  dia.horasTrabajadas < 4 ? 'text-red-600' :
                                  dia.horasTrabajadas >= 8 ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                  {fmtHoras(dia.horasTrabajadas)}
                                </span>
                              ) : null}
                              <span
                                className={`text-[8px] rounded px-1 leading-tight ${modoBadge}`}
                                title={dia.ubicacion ?? undefined}
                              >
                                {ubicacionCorta ? `${ubicacionCorta} · ${modoLabel}` : modoLabel}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5"><span className="font-bold text-emerald-700">8h+</span> Jornada completa</span>
              <span className="flex items-center gap-1.5"><span className="font-bold text-amber-700">4–8h</span> Jornada parcial</span>
              <span className="flex items-center gap-1.5"><span className="font-bold text-red-600">&lt;4h</span> Jornada corta</span>
              <span className="flex items-center gap-1.5"><span className="rounded px-1 bg-orange-100 text-orange-700">Campo</span> visita externa / planta</span>
              <span className="flex items-center gap-1.5"><span className="rounded px-1 bg-blue-100 text-blue-700">Remoto</span> trabajo remoto</span>
              <span className="flex items-center gap-1.5"><span className="rounded px-1 bg-gray-100 text-gray-600">Oficina</span> sede</span>
            </div>
          </>
        )
      })()}

      {/* Tabla detalle */}
      {vista === 'resumen' ? (() => {
        // Pivot resumenPorPersona → persona × día (matriz)
        const fmtTime = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })
        const diasEnRango: string[] = []
        const dCur = new Date(desde + 'T12:00:00Z')
        const dFin = new Date(hasta + 'T12:00:00Z')
        while (dCur <= dFin) { diasEnRango.push(dCur.toISOString().slice(0, 10)); dCur.setUTCDate(dCur.getUTCDate() + 1) }

        const personaMap = new Map<string, { nombre: string; dpto: string | null; dias: Map<string, typeof resumenPorPersona[0]> }>()
        for (const r of resumenPorPersona) {
          if (!personaMap.has(r.email)) personaMap.set(r.email, { nombre: r.nombre, dpto: r.dpto, dias: new Map() })
          personaMap.get(r.email)!.dias.set(r.fecha, r)
        }
        const personas = Array.from(personaMap.values()).sort((a, b) => (a.dpto || '').localeCompare(b.dpto || '') || a.nombre.localeCompare(b.nombre))

        const DIAS_LABEL = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']

        if (personas.length === 0) return (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Sin registros en el rango seleccionado.</div>
        )

        return (
          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <table className="w-full border-collapse text-sm" style={{ minWidth: `${280 + diasEnRango.length * 92}px` }}>
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="sticky left-0 z-10 bg-muted/30 text-left px-3 py-2 font-medium text-xs text-muted-foreground w-[180px]">Persona</th>
                  <th className="sticky left-[180px] z-10 bg-muted/30 text-left px-2 py-2 font-medium text-xs text-muted-foreground w-[100px] border-r">Dpto.</th>
                  {diasEnRango.map(d => {
                    const dt = new Date(d + 'T12:00:00Z')
                    const dow = dt.getUTCDay()
                    const isWeekend = dow === 0 || dow === 6
                    return (
                      <th key={d} className={`text-center px-1 py-1.5 font-medium text-xs w-[92px] ${isWeekend ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                        <div>{DIAS_LABEL[dow]}</div>
                        <div className="font-mono">{String(dt.getUTCDate()).padStart(2, '0')}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {personas.map((persona, pi) => (
                  <tr key={persona.nombre + pi} className={`border-b last:border-b-0 ${pi % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                    <td className={`sticky left-0 z-10 px-3 py-1.5 font-medium text-sm ${pi % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                      {persona.nombre}
                    </td>
                    <td className={`sticky left-[180px] z-10 px-2 py-1.5 text-xs text-muted-foreground border-r ${pi % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                      {persona.dpto || '—'}
                    </td>
                    {diasEnRango.map(dStr => {
                      const dt = new Date(dStr + 'T12:00:00Z')
                      const dow = dt.getUTCDay()
                      const isWeekend = dow === 0 || dow === 6
                      const r = persona.dias.get(dStr)

                      if (!r) return (
                        <td key={dStr} className={`text-center px-1 py-1.5 ${isWeekend ? 'bg-muted/20' : ''}`}>
                          <span className="text-muted-foreground/30 text-xs">—</span>
                        </td>
                      )

                      const estadoBg = !r.ingreso ? 'bg-muted/30' :
                        r.ingreso.estado === 'a_tiempo' ? 'bg-emerald-50' :
                        r.ingreso.estado === 'tarde' ? 'bg-amber-50' :
                        r.ingreso.estado === 'muy_tarde' ? 'bg-red-50' : ''

                      return (
                        <td key={dStr} className={`px-1 py-1.5 text-center ${isWeekend ? 'bg-muted/20' : estadoBg}`}>
                          <div className="flex flex-col items-center gap-0.5 min-h-[52px] justify-center">
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
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })() : vista === 'detalle' ? (
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
      ) : null}

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
