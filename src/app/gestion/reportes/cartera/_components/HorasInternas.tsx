'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, AlertTriangle, Wallet, Users, Clock, TrendingUp } from 'lucide-react'

interface ProyectoInterno {
  id: string; codigo: string; nombre: string; estado: string
  horas: number; personas: number; porMes: number[]
}
interface CentroCosto {
  nombre: string; tipo: string; horas: number; personas: number
  porMes: number[]; proyectos: ProyectoInterno[]
}
interface Respuesta {
  meses: string[]
  centrosCosto: CentroCosto[]
  total: { horas: number; personas: number; porMes: number[] } | null
}

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function etiquetaMes(iso: string): string {
  const [a, m] = iso.split('-').map(Number)
  return `${MES_CORTO[m - 1]} ${String(a).slice(2)}`
}
const horas = (n: number) => (n === 0 ? '' : n.toLocaleString('es-PE', { maximumFractionDigits: 0 }))

/**
 * Vista de los proyectos internos: no tienen alcance, así que en vez de avance y eficiencia
 * se muestran las horas que se les imputan, agrupadas por centro de costo y mes.
 */
export function HorasInternas() {
  const [data, setData] = useState<Respuesta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meses, setMeses] = useState('6')

  useEffect(() => {
    setLoading(true); setError('')
    fetch(`/api/gestion/horas-internas?meses=${meses}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`)
        return r.json()
      })
      .then((d: Respuesta) => setData(d))
      .catch((e: Error) => setError(e.message || 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [meses])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (error) {
    return (
      <Card><CardContent className="p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600">{error}</p>
      </CardContent></Card>
    )
  }
  if (!data || !data.total) return null

  // El pico del periodo marca la escala de las barras del sparkline.
  const pico = Math.max(1, ...data.total.porMes)
  const ultimo = data.total.porMes[data.total.porMes.length - 1]
  const previo = data.total.porMes[data.total.porMes.length - 2] ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Estos proyectos no tienen alcance que medir: son contenedores de horas de cada centro
          de costo. Lo que dice algo es cuántas horas se les van, de quién y en qué mes.
        </p>
        <Select value={meses} onValueChange={setMeses}>
          <SelectTrigger className="w-[160px] text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3" className="text-xs">Últimos 3 meses</SelectItem>
            <SelectItem value="6" className="text-xs">Últimos 6 meses</SelectItem>
            <SelectItem value="12" className="text-xs">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Mini icon={Clock} color="text-blue-500" valor={`${horas(data.total.horas) || 0} h`}
          label="horas imputadas" detalle={`en ${data.meses.length} meses`} />
        <Mini icon={Wallet} color="text-violet-500" valor={String(data.centrosCosto.length)}
          label="centros de costo" detalle="con horas en el periodo" />
        <Mini icon={Users} color="text-emerald-500" valor={String(data.total.personas)}
          label="personas" detalle="imputaron a algún interno" />
        <Mini icon={TrendingUp} color={ultimo > previo ? 'text-amber-500' : 'text-muted-foreground'}
          valor={`${horas(ultimo) || 0} h`} label="mes en curso"
          detalle={previo > 0 ? `${ultimo >= previo ? '+' : ''}${Math.round(((ultimo - previo) / previo) * 100)}% vs mes anterior` : 'sin comparativo'} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Horas por centro de costo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs pl-4">Centro de costo</TableHead>
                  <TableHead className="text-xs text-right w-20">Total</TableHead>
                  <TableHead className="text-xs text-right w-20">Personas</TableHead>
                  {data.meses.map((m) => (
                    <TableHead key={m} className="text-xs text-right w-16">{etiquetaMes(m)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.centrosCosto.map((cc) => [
                  <TableRow key={cc.nombre} className="text-xs bg-muted/40">
                    <TableCell className="pl-4 py-2 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-violet-500" />
                        {cc.nombre}
                      </span>
                      <span className="block text-[10px] text-muted-foreground ml-5">{cc.tipo}</span>
                    </TableCell>
                    <TableCell className="text-right py-2 font-mono tabular-nums font-medium">
                      {horas(cc.horas) || '—'}
                    </TableCell>
                    <TableCell className="text-right py-2 font-mono tabular-nums text-muted-foreground">
                      {cc.personas || '—'}
                    </TableCell>
                    {cc.porMes.map((h, i) => (
                      <TableCell key={i} className="text-right py-2 font-mono tabular-nums">
                        <Barra valor={h} pico={pico} />
                      </TableCell>
                    ))}
                  </TableRow>,
                  // Solo se desglosa si el centro agrupa más de un proyecto; si no, sería
                  // repetir la misma fila.
                  ...(cc.proyectos.length > 1
                    ? cc.proyectos.map((p) => (
                        <TableRow key={p.id} className="text-xs">
                          <TableCell className="py-1.5 pl-10">
                            <span className="font-mono">{p.codigo}</span>
                            <span className="block text-[10px] text-muted-foreground truncate max-w-[14rem]">
                              {p.nombre}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-1.5 font-mono tabular-nums">{horas(p.horas) || '—'}</TableCell>
                          <TableCell className="text-right py-1.5 font-mono tabular-nums text-muted-foreground">
                            {p.personas || '—'}
                          </TableCell>
                          {p.porMes.map((h, i) => (
                            <TableCell key={i} className="text-right py-1.5 font-mono tabular-nums text-muted-foreground">
                              {horas(h) || <span className="opacity-30">·</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : []),
                ])}
                <TableRow className="text-xs border-t-2">
                  <TableCell className="pl-4 py-2 font-medium">Total</TableCell>
                  <TableCell className="text-right py-2 font-mono tabular-nums font-medium">
                    {horas(data.total.horas)}
                  </TableCell>
                  <TableCell className="text-right py-2 font-mono tabular-nums text-muted-foreground">
                    {data.total.personas}
                  </TableCell>
                  {data.total.porMes.map((h, i) => (
                    <TableCell key={i} className="text-right py-2 font-mono tabular-nums font-medium">
                      {horas(h) || '—'}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Número con una barra de fondo proporcional al pico del periodo. */
function Barra({ valor, pico }: { valor: number; pico: number }) {
  if (valor === 0) return <span className="opacity-30">·</span>
  return (
    <span className="relative inline-block w-full">
      <span
        className="absolute inset-y-0 right-0 bg-violet-200/60 rounded-sm"
        style={{ width: `${Math.max(6, (valor / pico) * 100)}%` }}
        aria-hidden="true"
      />
      <span className="relative">{horas(valor)}</span>
    </span>
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
