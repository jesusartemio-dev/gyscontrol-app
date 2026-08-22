'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Home, ChevronRight, Loader2, AlertTriangle, Clock, CalendarClock, CheckCircle2, Timer,
} from 'lucide-react'

interface SemanaFila {
  semanaIso: string
  desde: string
  hasta: string
  enCurso: boolean
  personasConHoras: number
  timesheetsCerrados: number
  cobertura: number | null
  jornadas: number
  jornadasAbiertas: number
  diasCierreMediana: number | null
}
interface JornadaAbierta { id: string; proyecto: string; fechaTrabajo: string; diasAbierta: number }
interface Respuesta {
  semanas: SemanaFila[]
  resumen: {
    coberturaTimesheet: number | null
    personasConHoras: number
    timesheetsCerrados: number
    diasCierreJornadaMediana: number | null
    jornadasAbiertas: number
  }
  jornadasAbiertas: JornadaAbierta[]
}

// dd/mm a partir de "YYYY-MM-DD", sin construir Date (evita corrimientos de zona).
function ddmm(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function colorCobertura(c: number | null): string {
  if (c == null) return 'text-muted-foreground'
  if (c >= 90) return 'text-emerald-600'
  if (c >= 60) return 'text-amber-600'
  return 'text-red-600'
}

export default function PuntualidadRegistroPage() {
  const [data, setData] = useState<Respuesta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [semanas, setSemanas] = useState('16')

  useEffect(() => {
    setLoading(true); setError('')
    fetch(`/api/gestion/puntualidad-registro?semanas=${semanas}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`)
        return r.json()
      })
      .then((d: Respuesta) => setData(d))
      .catch((e: Error) => setError(e.message || 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [semanas])

  const maxPersonas = Math.max(1, ...(data?.semanas ?? []).map((s) => s.personasConHoras))

  return (
    <div className="p-4 space-y-4">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors"><Home className="h-3.5 w-3.5" /></Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion" className="hover:text-foreground transition-colors">Gestión</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion/reportes" className="hover:text-foreground transition-colors">Reportes</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Puntualidad del registro</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Puntualidad del registro</h1>
          <p className="text-sm text-muted-foreground">
            Con qué rapidez llega el dato que alimenta la curva de avance. No mide cuánto se
            avanzó, sino si el registro se está cerrando a tiempo.
          </p>
        </div>
        <Select value={semanas} onValueChange={setSemanas}>
          <SelectTrigger className="w-[180px] text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="8" className="text-xs">Últimas 8 semanas</SelectItem>
            <SelectItem value="16" className="text-xs">Últimas 16 semanas</SelectItem>
            <SelectItem value="26" className="text-xs">Últimas 26 semanas</SelectItem>
            <SelectItem value="52" className="text-xs">Último año</SelectItem>
          </SelectContent>
        </Select>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className={
              data.resumen.coberturaTimesheet == null ? ''
              : data.resumen.coberturaTimesheet >= 90 ? 'bg-emerald-50'
              : data.resumen.coberturaTimesheet >= 60 ? 'bg-amber-50' : 'bg-red-50'
            }>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className={`h-4 w-4 ${colorCobertura(data.resumen.coberturaTimesheet)}`} />
                  <span className="text-xs text-muted-foreground">Timesheets cerrados (8 sem.)</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${colorCobertura(data.resumen.coberturaTimesheet)}`}>
                  {data.resumen.coberturaTimesheet == null ? '—' : `${data.resumen.coberturaTimesheet}%`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.resumen.timesheetsCerrados} de {data.resumen.personasConHoras} personas-semana
                  con horas registradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Cierre de jornada (mediana)</span>
                </div>
                <p className="text-2xl font-bold font-mono">
                  {data.resumen.diasCierreJornadaMediana == null
                    ? '—'
                    : `${data.resumen.diasCierreJornadaMediana} d`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Días entre el trabajo y su cierre. Objetivo: ≤ 2 días.
                </p>
              </CardContent>
            </Card>

            <Card className={data.resumen.jornadasAbiertas > 0 ? 'bg-orange-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className={`h-4 w-4 ${data.resumen.jornadasAbiertas > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                  <span className="text-xs text-muted-foreground">Jornadas sin cerrar</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${data.resumen.jornadasAbiertas > 0 ? 'text-orange-700' : ''}`}>
                  {data.resumen.jornadasAbiertas}
                </p>
                <p className="text-xs text-muted-foreground">
                  Su avance todavía no existe en la curva.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Semana a semana
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Una semana sin cerrar no deja registro de aprobación, así que &ldquo;sin cerrar&rdquo;
                significa que las horas se registraron pero nadie completó el ciclo.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[32rem]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs pl-4 w-44">Semana</TableHead>
                      <TableHead className="text-xs text-right w-28">Con horas</TableHead>
                      <TableHead className="text-xs text-right w-28">Cerrados</TableHead>
                      <TableHead className="text-xs w-52">Cobertura</TableHead>
                      <TableHead className="text-xs text-right w-24">Jornadas</TableHead>
                      <TableHead className="text-xs text-right w-28">Sin cerrar</TableHead>
                      <TableHead className="text-xs text-right w-32">Días de cierre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.semanas.map((s) => (
                      <TableRow key={s.semanaIso} className={`text-xs ${s.enCurso ? 'opacity-60' : ''}`}>
                        <TableCell className="pl-4 py-1.5">
                          <span className="font-medium">{ddmm(s.desde)} – {ddmm(s.hasta)}</span>
                          <span className="block text-muted-foreground font-mono text-[10px]">
                            {s.semanaIso}{s.enCurso ? ' · en curso' : ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono py-1.5 tabular-nums">{s.personasConHoras}</TableCell>
                        <TableCell className="text-right font-mono py-1.5 tabular-nums">{s.timesheetsCerrados}</TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden min-w-16">
                              <div
                                className={`h-2 rounded-full ${
                                  s.cobertura == null ? 'bg-gray-300'
                                  : s.cobertura >= 90 ? 'bg-emerald-500'
                                  : s.cobertura >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${s.cobertura ?? 0}%` }}
                              />
                            </div>
                            <span className={`font-mono tabular-nums w-10 text-right ${colorCobertura(s.cobertura)}`}>
                              {s.cobertura == null ? '—' : `${s.cobertura}%`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono py-1.5 tabular-nums text-muted-foreground">
                          {s.jornadas || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono py-1.5 tabular-nums">
                          {s.jornadasAbiertas > 0
                            ? <span className="text-orange-600 font-medium">{s.jornadasAbiertas}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono py-1.5 tabular-nums">
                          {s.diasCierreMediana == null
                            ? <span className="text-muted-foreground">—</span>
                            : <span className={s.diasCierreMediana > 2 ? 'text-amber-600' : ''}>
                                {s.diasCierreMediana} d
                              </span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {data.jornadasAbiertas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-orange-600" />
                  Jornadas sin cerrar
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Al cerrarlas, su avance entrará en la semana de la fecha de trabajo y corregirá
                  esa parte de la curva — no la semana en que se cierren.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs pl-4">Proyecto</TableHead>
                        <TableHead className="text-xs">Fecha de trabajo</TableHead>
                        <TableHead className="text-xs text-right w-32">Días abierta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.jornadasAbiertas.map((j) => (
                        <TableRow key={j.id} className="text-xs">
                          <TableCell className="pl-4 py-1.5 font-medium">{j.proyecto}</TableCell>
                          <TableCell className="py-1.5 font-mono">{j.fechaTrabajo}</TableCell>
                          <TableCell className="text-right py-1.5 font-mono tabular-nums">
                            <span className={
                              j.diasAbierta > 14 ? 'text-red-600 font-medium'
                              : j.diasAbierta > 3 ? 'text-amber-600' : 'text-muted-foreground'
                            }>
                              {j.diasAbierta}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Referencia: {maxPersonas} personas es el máximo de gente con horas registradas en una
            semana del periodo mostrado.
          </p>
        </>
      )}
    </div>
  )
}
