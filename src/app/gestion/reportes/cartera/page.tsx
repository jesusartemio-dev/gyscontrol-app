'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Home, ChevronRight, Loader2, AlertTriangle, LayoutGrid, Settings2,
  TrendingUp, PlusCircle, CalendarClock, ArrowUpRight, Wallet,
} from 'lucide-react'

interface Fila {
  id: string
  codigo: string
  nombre: string
  estado: string
  esInterno: boolean
  centroCosto: string | null
  preparacion: {
    estado: string; listo: boolean; esInterno: boolean
    puedeCompararConPlan: boolean; titulo: string
  }
  avanceReal: number
  avanceActual: number
  brecha: number
  semanasConDato: number
  horasPresupuestadas: number
  horasConsumidas: number
  porcentajeHoras: number | null
  eficiencia: number | null
  fueraDePlan: {
    tareas: number; horasHombre: number; horasReales: number
    porcentajeSobrePlan: number; sinAlcancePlanificado: boolean
  }
  jornadasAbiertas: string[]
}
type Tipo = 'cliente' | 'interno' | 'todos'

interface Respuesta {
  proyectos: Fila[]
  tipo: Tipo
  conteos: { cliente: number; interno: number; todos: number }
  resumen: {
    total: number; listos: number; sinArmar: number; conBrecha: number
    conSobrecosto: number; fueraDePlanAlto: number; jornadasAbiertas: number
    horasPresupuestadas: number; horasConsumidas: number
  }
}

const num = (n: number) => n.toLocaleString('es-PE')
const ddmm = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}` }

function colorEficiencia(e: number | null): string {
  if (e == null) return 'text-muted-foreground'
  if (e >= 1) return 'text-emerald-600'
  if (e >= 0.8) return 'text-amber-600'
  return 'text-red-600'
}

export default function CarteraAvancePage() {
  const [data, setData] = useState<Respuesta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [incluirCerrados, setIncluirCerrados] = useState(false)
  const [tipo, setTipo] = useState<Tipo>('cliente')

  useEffect(() => {
    setLoading(true); setError('')
    fetch(`/api/gestion/cartera-avance?tipo=${tipo}&incluirCerrados=${incluirCerrados ? 1 : 0}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`)
        return r.json()
      })
      .then((d: Respuesta) => setData(d))
      .catch((e: Error) => setError(e.message || 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [incluirCerrados, tipo])

  return (
    <div className="p-4 space-y-4">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors"><Home className="h-3.5 w-3.5" /></Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion" className="hover:text-foreground transition-colors">Gestión</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion/reportes" className="hover:text-foreground transition-colors">Reportes</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Cartera</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Avance de la cartera</h1>
          <p className="text-sm text-muted-foreground">
            Una fila por proyecto: cuánto lleva, cuánto de eso está fechado, qué horas consumió
            y cuánto trabajo va fuera del plan. Los proyectos internos son centros de costo para
            imputar horas, no obras — por eso van aparte.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <div className="inline-flex rounded-md border border-input overflow-hidden">
            {([
              ['cliente', 'De cliente'],
              ['interno', 'Internos'],
              ['todos', 'Todos'],
            ] as [Tipo, string][]).map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setTipo(valor)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  tipo === valor
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-background hover:bg-muted text-muted-foreground'
                }`}
              >
                {etiqueta}
                {data && <span className="ml-1.5 opacity-70">{data.conteos[valor]}</span>}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={incluirCerrados}
              onChange={(e) => setIncluirCerrados(e.target.checked)}
              className="accent-primary"
            />
            Incluir proyectos cerrados
          </label>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <Card><CardContent className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </CardContent></Card>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Mini icon={LayoutGrid} color="text-blue-500" valor={`${data.resumen.listos} / ${data.resumen.total}`}
              label="con cronograma utilizable"
              detalle={data.resumen.sinArmar > 0 ? `${data.resumen.sinArmar} sin armar` : 'todos listos'} />
            <Mini icon={TrendingUp} color={data.resumen.conSobrecosto > 0 ? 'text-red-500' : 'text-emerald-500'}
              valor={String(data.resumen.conSobrecosto)} label="en sobrecosto"
              detalle="gastan más horas de las que avanzan" />
            <Mini icon={PlusCircle} color={data.resumen.fueraDePlanAlto > 0 ? 'text-red-500' : 'text-violet-500'}
              valor={String(data.resumen.fueraDePlanAlto)} label="con alcance desbordado"
              detalle="+50% de trabajo fuera del plan" />
            <Mini icon={CalendarClock} color={data.resumen.jornadasAbiertas > 0 ? 'text-orange-500' : 'text-muted-foreground'}
              valor={String(data.resumen.jornadasAbiertas)} label="jornadas sin cerrar"
              detalle="su avance aún no existe" />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Proyectos</CardTitle>
              <p className="text-xs text-muted-foreground">
                El % mide el alcance planificado. El trabajo fuera del plan no resta avance,
                pero sus horas sí pesan en la eficiencia.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs pl-4">Proyecto</TableHead>
                      <TableHead className="text-xs text-right w-24">Avance</TableHead>
                      <TableHead className="text-xs w-28">Semanas</TableHead>
                      <TableHead className="text-xs text-right w-28">Horas</TableHead>
                      <TableHead className="text-xs text-right w-28">Fuera del plan</TableHead>
                      <TableHead className="text-xs text-right w-24">Eficiencia</TableHead>
                      <TableHead className="text-xs w-40">Atención</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.proyectos.map((p) => (
                      <TableRow key={p.id} className="text-xs">
                        <TableCell className="pl-4 py-2">
                          <span className="font-mono font-medium">{p.codigo}</span>
                          <span className="block text-muted-foreground truncate max-w-[16rem]">
                            {p.esInterno && p.centroCosto ? `Centro de costo · ${p.centroCosto}` : p.nombre}
                          </span>
                        </TableCell>

                        <TableCell className="text-right py-2 font-mono tabular-nums">
                          {p.preparacion.listo
                            ? <span className="font-medium">{p.avanceReal.toFixed(1)}%</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        <TableCell className="py-2 font-mono tabular-nums text-muted-foreground">
                          {p.semanasConDato > 0 ? `${p.semanasConDato} con dato` : '—'}
                        </TableCell>

                        <TableCell className="text-right py-2 font-mono tabular-nums">
                          {p.porcentajeHoras == null
                            ? <span className="text-muted-foreground">—</span>
                            : <span className={p.porcentajeHoras > 100 ? 'text-red-600 font-medium' : ''}>
                                {p.porcentajeHoras.toFixed(0)}%
                              </span>}
                          <span className="block text-[10px] text-muted-foreground">
                            {num(p.horasConsumidas)} / {num(p.horasPresupuestadas)} h
                          </span>
                        </TableCell>

                        <TableCell className="text-right py-2 font-mono tabular-nums">
                          {p.fueraDePlan.tareas === 0
                            ? <span className="text-muted-foreground">—</span>
                            : <span
                                className={p.fueraDePlan.sinAlcancePlanificado || p.fueraDePlan.porcentajeSobrePlan >= 50
                                  ? 'text-red-600 font-medium' : 'text-violet-700'}
                                title={p.fueraDePlan.sinAlcancePlanificado
                                  ? 'No hay alcance planificado: todo el trabajo va fuera del plan'
                                  : `${num(p.fueraDePlan.horasReales)} h gastadas fuera del plan`}
                              >
                                {p.fueraDePlan.tareas} ·{' '}
                                {p.fueraDePlan.sinAlcancePlanificado
                                  ? 'todo'
                                  : `${p.fueraDePlan.porcentajeSobrePlan.toFixed(0)}%`}
                              </span>}
                        </TableCell>

                        <TableCell className={`text-right py-2 font-mono tabular-nums font-medium ${colorEficiencia(p.eficiencia)}`}>
                          {p.eficiencia == null ? '—' : p.eficiencia.toFixed(2)}
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {p.preparacion.estado === 'centro_de_costo' ? (
                              <Chip color="slate" icon={Wallet} title={p.preparacion.titulo}>
                                centro de costo
                              </Chip>
                            ) : !p.preparacion.listo ? (
                              <Chip color="slate" icon={Settings2} title={p.preparacion.titulo}>sin armar</Chip>
                            ) : null}
                            {p.preparacion.listo && !p.preparacion.puedeCompararConPlan && (
                              <Chip color="yellow" title="No hay línea base para comparar">sin plan</Chip>
                            )}
                            {p.brecha > 1 && (
                              <Chip color="amber" title={`${p.brecha.toFixed(1)} puntos de avance sin fecha registrada`}>
                                {p.brecha.toFixed(1)} sin fechar
                              </Chip>
                            )}
                            {p.jornadasAbiertas.length > 0 && (
                              <Chip color="orange" icon={CalendarClock}
                                title={`Jornadas del ${p.jornadasAbiertas.map(ddmm).join(', ')}`}>
                                {p.jornadasAbiertas.length} jornada{p.jornadasAbiertas.length === 1 ? '' : 's'}
                              </Chip>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-2">
                          <Link
                            href={`/gestion/reportes/curva-s-avance`}
                            title={`Ver la curva de ${p.codigo}`}
                            className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function Mini({
  icon: Icon, color, valor, label, detalle,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: string; valor: string; label: string; detalle: string
}) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums">{valor}</p>
      <p className="text-xs text-muted-foreground">{detalle}</p>
    </CardContent></Card>
  )
}

const COLORES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  amber: 'bg-amber-100 text-amber-800',
  orange: 'bg-orange-100 text-orange-800',
}

function Chip({
  color, icon: Icon, title, children,
}: {
  color: keyof typeof COLORES | string
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  children: React.ReactNode
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${COLORES[color] ?? COLORES.slate}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}
