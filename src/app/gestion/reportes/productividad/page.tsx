'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Home, ChevronRight, Loader2, AlertTriangle, Users, Briefcase, Wallet,
  ChevronDown, ChevronRightIcon,
} from 'lucide-react'

interface Destino {
  codigo: string; nombre: string; esInterno: boolean; centroCosto: string | null
  horas: number; porMes: number[]
}
interface Mes {
  mes: string; total: number; directo: number; indirecto: number; porcentajeDirecto: number | null
}
interface Persona {
  id: string; nombre: string
  horas: { total: number; directo: number; indirecto: number }
  costo: { total: number; directo: number; indirecto: number }
  horasSinCosto: number
  costoHora: number
  costoNoConfigurado: boolean
  cargo: string | null
  activo: boolean | null
  tieneFicha: boolean
  tieneSueldo: boolean
  porcentajeDirecto: number | null
  porcentajeIndirecto: number | null
  porMes: Mes[]
  destinos: Destino[]
}
interface Respuesta {
  meses: string[]
  personas: Persona[]
  total: {
    personas: number
    horas: { total: number; directo: number; indirecto: number }
    costo: { total: number; directo: number; indirecto: number }
    horasSinCosto: number
    personasSinCosto: number
    horasSinTarifa: number
    sinCostoDetalle: {
      nombre: string; cargo: string | null; activo: boolean | null
      horas: number; tieneFicha: boolean
    }[]
    porcentajeDirecto: number | null
    porcentajeIndirecto: number | null
    porMes: Mes[]
  }
}

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function etiquetaMes(iso: string): string {
  const [a, m] = iso.split('-').map(Number)
  return `${MES_CORTO[m - 1]} ${String(a).slice(2)}`
}
const h = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 0 })
const soles = (n: number) =>
  n >= 1000 ? `S/ ${(n / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}k` : `S/ ${h(n)}`

/** Verde a partir de 80 % directo, ámbar entre 60 y 80, rojo por debajo. */
function colorDirecto(p: number | null): string {
  if (p == null) return 'text-muted-foreground'
  if (p >= 80) return 'text-emerald-600'
  if (p >= 60) return 'text-amber-600'
  return 'text-red-600'
}
function fondoDirecto(p: number | null): string {
  if (p == null) return 'bg-muted'
  if (p >= 80) return 'bg-emerald-500'
  if (p >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function ProductividadPage() {
  const [data, setData] = useState<Respuesta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meses, setMeses] = useState('6')
  const [modo, setModo] = useState<'porcentaje' | 'horas'>('porcentaje')
  const [abierta, setAbierta] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError('')
    fetch(`/api/gestion/productividad-personal?meses=${meses}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`)
        return r.json()
      })
      .then((d: Respuesta) => setData(d))
      .catch((e: Error) => setError(e.message || 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [meses])

  return (
    <div className="p-4 space-y-4">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors"><Home className="h-3.5 w-3.5" /></Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion" className="hover:text-foreground transition-colors">Gestión</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion/reportes" className="hover:text-foreground transition-colors">Reportes</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Productividad</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Productividad del personal</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            En qué se va el tiempo de cada persona: proyectos de cliente, que son{' '}
            <strong>costo directo</strong>, contra centros de costo internos, que son{' '}
            <strong>costo indirecto</strong> de la empresa.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-md border border-input overflow-hidden">
            {([['porcentaje', '% directo'], ['horas', 'Horas']] as const).map(([v, etiqueta]) => (
              <button
                key={v}
                onClick={() => setModo(v)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  modo === v ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-background hover:bg-muted text-muted-foreground'}`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
          <Select value={meses} onValueChange={setMeses}>
            <SelectTrigger className="w-[150px] text-xs h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3" className="text-xs">Últimos 3 meses</SelectItem>
              <SelectItem value="6" className="text-xs">Últimos 6 meses</SelectItem>
              <SelectItem value="12" className="text-xs">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
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
            <Mini icon={Users} color="text-blue-500" valor={String(data.total.personas)}
              label="personas con horas" detalle={`en ${data.meses.length} meses`} />
            <Mini icon={Briefcase} color={colorDirecto(data.total.porcentajeDirecto).replace('text-', 'text-')}
              valor={data.total.porcentajeDirecto == null ? '—' : `${data.total.porcentajeDirecto}%`}
              label="del tiempo es directo"
              detalle={`${h(data.total.horas.directo)} de ${h(data.total.horas.total)} h`} />
            <Mini icon={Wallet} color="text-emerald-600" valor={soles(data.total.costo.directo)}
              label="costo directo" detalle="imputado a proyectos de cliente" />
            <Mini icon={Wallet} color="text-red-500" valor={soles(data.total.costo.indirecto)}
              label="costo indirecto" detalle="absorbido por la empresa" />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Por persona</CardTitle>
              <p className="text-xs text-muted-foreground">
                {modo === 'porcentaje'
                  ? 'Las celdas mensuales muestran qué porcentaje de ese mes fue a proyectos de cliente.'
                  : 'Las celdas mensuales muestran las horas totales de ese mes.'}
                {' '}Haz clic en una fila para ver a dónde fue su tiempo.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs pl-4">Persona</TableHead>
                      <TableHead className="text-xs text-right w-20">Total</TableHead>
                      <TableHead className="text-xs w-40">Reparto</TableHead>
                      <TableHead className="text-xs text-right w-20">% dir.</TableHead>
                      <TableHead className="text-xs text-right w-20">% ind.</TableHead>
                      <TableHead className="text-xs text-right w-24">Costo dir.</TableHead>
                      <TableHead className="text-xs text-right w-24">Costo ind.</TableHead>
                      {data.meses.map((m) => (
                        <TableHead key={m} className="text-xs text-right w-16">{etiquetaMes(m)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.personas.map((p) => [
                      <TableRow
                        key={p.id}
                        className="text-xs cursor-pointer hover:bg-muted/50"
                        onClick={() => setAbierta(abierta === p.id ? null : p.id)}
                      >
                        <TableCell className="pl-4 py-2 font-medium">
                          <span className="inline-flex items-center gap-1">
                            {abierta === p.id
                              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              : <ChevronRightIcon className="h-3 w-3 text-muted-foreground" />}
                            {p.nombre}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-2 font-mono tabular-nums">{h(p.horas.total)}</TableCell>
                        <TableCell className="py-2">
                          <div className="h-2 rounded-full overflow-hidden bg-red-200 flex"
                            title={`${h(p.horas.directo)} h directas · ${h(p.horas.indirecto)} h indirectas`}>
                            <div className={fondoDirecto(p.porcentajeDirecto)}
                              style={{ width: `${p.porcentajeDirecto ?? 0}%` }} />
                          </div>
                        </TableCell>
                        <TableCell className={`text-right py-2 font-mono tabular-nums font-medium ${colorDirecto(p.porcentajeDirecto)}`}>
                          {p.porcentajeDirecto == null ? '—' : `${p.porcentajeDirecto}%`}
                        </TableCell>
                        <TableCell className="text-right py-2 font-mono tabular-nums text-red-600">
                          {p.porcentajeIndirecto == null ? '—' : `${p.porcentajeIndirecto}%`}
                        </TableCell>
                        <TableCell className="text-right py-2 font-mono tabular-nums text-emerald-700">
                          {p.costoNoConfigurado
                            ? <span className="text-muted-foreground" title="Sin costo por hora configurado">s/ tarifa</span>
                            : soles(p.costo.directo)}
                        </TableCell>
                        <TableCell className="text-right py-2 font-mono tabular-nums text-red-600">
                          {p.costoNoConfigurado ? <span className="text-muted-foreground">—</span>
                            : p.costo.indirecto > 0 ? soles(p.costo.indirecto) : '—'}
                        </TableCell>
                        {p.porMes.map((m) => (
                          <TableCell key={m.mes} className="text-right py-2 font-mono tabular-nums">
                            {m.total === 0 ? <span className="opacity-30">·</span>
                              : modo === 'porcentaje'
                                ? <span className={colorDirecto(m.porcentajeDirecto)}>{m.porcentajeDirecto}%</span>
                                : h(m.total)}
                          </TableCell>
                        ))}
                      </TableRow>,
                      ...(abierta === p.id ? [
                        <TableRow key={`${p.id}-detalle`} className="text-xs bg-muted/30">
                          <TableCell colSpan={7 + data.meses.length} className="py-3 px-4">
                            <p className="text-xs font-medium mb-2">
                              A dónde fue su tiempo, mes a mes
                            </p>
                            <div className="overflow-x-auto">
                              <table className="text-xs w-full">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="text-left font-medium pb-1 pr-3">Destino</th>
                                    <th className="text-right font-medium pb-1 px-2">Total</th>
                                    {data.meses.map((m) => (
                                      <th key={m} className="text-right font-medium pb-1 px-2 w-14">
                                        {etiquetaMes(m)}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.destinos.map((d) => (
                                    <tr key={d.codigo} className="border-t border-border/50">
                                      <td className="py-1 pr-3">
                                        <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 ${
                                          d.esInterno ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                          <span className="font-mono font-medium">{d.codigo}</span>
                                          {d.esInterno && (
                                            <span className="opacity-75">
                                              {d.centroCosto ? `· ${d.centroCosto}` : '· interno'}
                                            </span>
                                          )}
                                        </span>
                                        <span className="block text-[10px] text-muted-foreground truncate max-w-[18rem] mt-0.5">
                                          {d.nombre}
                                        </span>
                                      </td>
                                      <td className="text-right py-1 px-2 font-mono tabular-nums font-medium">
                                        {h(d.horas)}
                                      </td>
                                      {d.porMes.map((hh, i) => (
                                        <td key={i} className="text-right py-1 px-2 font-mono tabular-nums text-muted-foreground">
                                          {hh > 0 ? h(hh) : <span className="opacity-30">·</span>}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {p.horasSinCosto > 0 && (
                              <p className="text-[11px] text-muted-foreground mt-2">
                                {h(p.horasSinCosto)} h vienen de jornadas aún sin aprobar y no traen costo
                                por hora, así que el importe está subestimado.
                              </p>
                            )}
                          </TableCell>
                        </TableRow>,
                      ] : []),
                    ])}
                    <TableRow className="text-xs border-t-2">
                      <TableCell className="pl-4 py-2 font-medium">Total</TableCell>
                      <TableCell className="text-right py-2 font-mono tabular-nums font-medium">
                        {h(data.total.horas.total)}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="h-2 rounded-full overflow-hidden bg-red-200 flex">
                          <div className={fondoDirecto(data.total.porcentajeDirecto)}
                            style={{ width: `${data.total.porcentajeDirecto ?? 0}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className={`text-right py-2 font-mono tabular-nums font-medium ${colorDirecto(data.total.porcentajeDirecto)}`}>
                        {data.total.porcentajeDirecto}%
                      </TableCell>
                      <TableCell className="text-right py-2 font-mono tabular-nums font-medium text-red-600">
                        {data.total.porcentajeIndirecto}%
                      </TableCell>
                      <TableCell className="text-right py-2 font-mono tabular-nums font-medium text-emerald-700">
                        {soles(data.total.costo.directo)}
                      </TableCell>
                      <TableCell className="text-right py-2 font-mono tabular-nums font-medium text-red-600">
                        {soles(data.total.costo.indirecto)}
                      </TableCell>
                      {data.total.porMes.map((m) => (
                        <TableCell key={m.mes} className="text-right py-2 font-mono tabular-nums font-medium">
                          {modo === 'porcentaje'
                            ? <span className={colorDirecto(m.porcentajeDirecto)}>{m.porcentajeDirecto ?? '—'}%</span>
                            : h(m.total)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {data.total.personasSinCosto > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  Falta cargar el sueldo de {data.total.personasSinCosto} persona
                  {data.total.personasSinCosto === 1 ? '' : 's'}
                </CardTitle>
                <p className="text-xs text-amber-900/80">
                  Sus {h(data.total.horasSinTarifa)} h cuentan en el reparto directo/indirecto,
                  pero no en los importes: el total en soles es un piso, no el gasto real. Se
                  corrige cargando el sueldo en el maestro de personal.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {data.total.sinCostoDetalle.map((s) => (
                    <span
                      key={s.nombre}
                      className={`inline-flex items-center gap-2 rounded border px-2 py-1 text-xs ${
                        s.activo === false
                          ? 'border-border bg-background text-muted-foreground'
                          : 'border-amber-300 bg-white text-amber-900'
                      }`}
                    >
                      <span className="font-medium">{s.nombre}</span>
                      {s.cargo && <span className="opacity-70">{s.cargo}</span>}
                      <span className="font-mono tabular-nums opacity-70">{h(s.horas)} h</span>
                      {s.activo === false && <span className="opacity-60">· cesado</span>}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-amber-900/70 mt-2">
                  Todas tienen ficha de empleado y cargo asignado: lo que falta es el sueldo. El
                  sistema no distingue hoy al personal externo, así que si alguna de estas
                  personas es subcontratada, no hay dónde registrarlo.
                </p>
              </CardContent>
            </Card>
          )}

          {data.total.horasSinCosto > 0 && (
            <p className="text-xs text-muted-foreground">
              {h(data.total.horasSinCosto)} h del periodo vienen de jornadas cerradas pero aún sin
              aprobar: cuentan en las horas, pero todavía no tienen costo por hora asignado, así
              que los importes en soles son un piso, no el total.
            </p>
          )}
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
