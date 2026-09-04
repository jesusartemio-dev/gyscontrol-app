'use client'

import { tieneRol } from '@/lib/auth/roles'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader2, ShieldCheck } from 'lucide-react'
import { FranjaDepartamento, DEPT_STYLES } from '@/components/planificacion/MatrizDiaCompacta'

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

const ROLES_SUPERVISION_DISPOSITIVOS = ['admin', 'gerente', 'coordinador', 'gestor']
const STORAGE_KEY = 'gys_asistencia_por_proyecto_filtros'

export default function SupervisionAsistencia() {
  const { data: session } = useSession()
  const puedeSupervisarDispositivos = tieneRol(session, ROLES_SUPERVISION_DISPOSITIVOS)

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
    let ov: { desde?: string; hasta?: string } = {}
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (saved.desde) { setDesde(saved.desde); ov.desde = saved.desde }
      if (saved.hasta) { setHasta(saved.hasta); ov.hasta = saved.hasta }
    } catch {}
    cargarPorProyecto(ov)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistir filtros en localStorage cada vez que cambian
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ desde, hasta }))
    } catch {}
  }, [desde, hasta])

  function aplicarPreset(p: typeof PRESETS[number]) {
    const d = p.desde()
    const h = p.hasta()
    setDesde(d)
    setHasta(h)
    cargarPorProyecto({ desde: d, hasta: h })
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asistencia por Proyecto</h1>
          <p className="text-sm text-muted-foreground">
            Horas de campo ejecutadas por persona, agrupadas por proyecto
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
          <Button onClick={() => cargarPorProyecto()} disabled={porProyectoLoading}>
            {porProyectoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Filtrar
          </Button>
        </CardContent>
      </Card>

      {/* Por Proyecto */}
      {porProyectoLoading ? (
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
      )}
    </div>
  )
}
