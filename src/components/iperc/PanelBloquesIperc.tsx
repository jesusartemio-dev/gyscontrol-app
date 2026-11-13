'use client'

// ===================================================
// 📁 PanelBloquesIperc
// 📌 Lista los bloques del IPERC y permite generarlos de a uno.
//
// Generar el proyecto entero en una sola llamada no cabe en los 5 min de
// Vercel: la corrida se cortaba a media máquina, perdía las tareas que
// faltaban y no avisaba. Cada bloque va en su propia petición, así que si uno
// falla se reintenta solo ese y lo demás queda intacto.
// ===================================================

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'
import { Loader2, Play, RefreshCw, CheckCircle2, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

export interface BloqueIperc {
  id: string
  numero: number
  nombre: string
  totalTareas: number
  totalActividades: number
  /** Filas que va a escribir, segun los peligros fijados en la estructura. */
  filasPrevistas: number | null
  /** Lineas del bloque que ya tienen filas. */
  lineasHechas: number | null
  estado: string
  filasGeneradas: number
  errorMensaje: string | null
  generadoEn: string | null
}

interface Props {
  bloques: BloqueIperc[]
  /** Bloque que se está generando en este momento. */
  generandoId: string | null
  statusMsg: string
  progreso: number | null
  onGenerar: (bloqueId: string) => void
  onGenerarPendientes: () => void
  onRedefinir: () => void
  /** Lineas que salen del catalogo y no pasan por la IA, asi que no van en bloques. */
  lineasFijas?: number
  disabled?: boolean
}

const ESTILO: Record<string, { label: string; clase: string; icono: typeof Clock }> = {
  pendiente: { label: 'pendiente', clase: 'bg-gray-100 text-gray-700', icono: Clock },
  generando: { label: 'generando', clase: 'bg-blue-100 text-blue-700', icono: Loader2 },
  listo: { label: 'listo', clase: 'bg-emerald-100 text-emerald-700', icono: CheckCircle2 },
  fallido: { label: 'incompleto', clase: 'bg-amber-100 text-amber-800', icono: AlertTriangle },
}

export function PanelBloquesIperc({
  bloques,
  generandoId,
  statusMsg,
  progreso,
  onGenerar,
  onGenerarPendientes,
  onRedefinir,
  lineasFijas = 0,
  disabled,
}: Props) {
  // Con todo generado el panel ya cumplio su funcion y lo unico que importa
  // es el IPERC: se contrae a una linea en vez de empujarlo hacia abajo.
  const todoListo = bloques.length > 0 && bloques.every(b => b.estado === 'listo')
  const [abiertoManual, setAbiertoManual] = useState<boolean | null>(null)
  const abierto = abiertoManual ?? !todoListo

  if (bloques.length === 0) return null

  const listos = bloques.filter(b => b.estado === 'listo').length
  const pendientes = bloques.filter(b => b.estado !== 'listo').length
  const totalTareas = bloques.reduce((s, b) => s + b.totalTareas, 0)
  const totalFilas = bloques.reduce((s, b) => s + b.filasGeneradas, 0)
  // Lo que falta escribir: solo de los bloques que todavia no se generaron.
  const previstasPendientes = bloques
    .filter(b => b.estado !== 'listo')
    .reduce((s, b) => s + (b.filasPrevistas ?? 0), 0)

  if (!abierto) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            <strong>{bloques.length} bloques generados</strong> · {totalTareas} tareas · {totalFilas} filas
          </span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-emerald-800 hover:bg-emerald-100"
          onClick={() => setAbiertoManual(true)}
        >
          <ChevronDown className="mr-1 h-3.5 w-3.5" /> Ver bloques
        </Button>
      </div>
    )
  }

  return (
    <Card className="mb-4">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">
              {bloques.length} bloques · {listos} listo{listos === 1 ? '' : 's'}
              {pendientes > 0 && ` · ${pendientes} por generar`}
            </p>
            <p className="text-xs text-muted-foreground">
              {totalTareas} tareas en total
              {totalFilas > 0 && ` · ${totalFilas} filas generadas`}
              {previstasPendientes > 0 && ` · ${previstasPendientes} filas por generar`}
              . Cada bloque se genera por separado; si uno falla, reintentas solo ese.
              {lineasFijas > 0 && (
                <> Las {lineasFijas} actividades fijas no van en bloques: salen del catálogo
                sin pasar por la IA.</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {todoListo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAbiertoManual(false)}
                disabled={!!generandoId}
              >
                <ChevronUp className="mr-1 h-3.5 w-3.5" /> Contraer
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onRedefinir} disabled={disabled || !!generandoId}>
              Cambiar EDTs
            </Button>
            {pendientes > 0 && (
              <Button size="sm" onClick={onGenerarPendientes} disabled={disabled || !!generandoId}>
                {generandoId ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                Generar {pendientes} pendiente{pendientes === 1 ? '' : 's'}
              </Button>
            )}
          </div>
        </div>

        <ul className="divide-y rounded-md border">
          {bloques.map(b => {
            const est = ESTILO[b.estado] ?? ESTILO.pendiente
            const Icono = est.icono
            const esteGenerando = generandoId === b.id
            return (
              <li key={b.id} className="flex items-start justify-between gap-3 p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] text-muted-foreground">#{b.numero}</span>
                    <span className="truncate text-sm font-medium">{b.nombre}</span>
                    <Badge variant="outline" className={`text-[10px] ${esteGenerando ? ESTILO.generando.clase : est.clase}`}>
                      <Icono className={`mr-0.5 h-3 w-3 ${esteGenerando ? 'animate-spin' : ''}`} />
                      {esteGenerando ? 'generando' : est.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {b.totalTareas} tarea{b.totalTareas === 1 ? '' : 's'}
                    {b.totalActividades > 0 && ` · ${b.totalActividades} actividad${b.totalActividades === 1 ? '' : 'es'}`}
                    {b.filasGeneradas > 0
                      ? ` · ${b.filasGeneradas} filas`
                      : b.filasPrevistas != null && ` · ${b.filasPrevistas} filas previstas`}
                  </p>
                  {esteGenerando && statusMsg && (
                    <p className="mt-0.5 text-[11px] text-blue-700">
                      {statusMsg}{progreso != null ? ` (${progreso}%)` : ''}
                    </p>
                  )}
                  {!esteGenerando && b.errorMensaje && (
                    <p className="mt-0.5 text-[11px] text-amber-700">{b.errorMensaje}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={b.estado === 'listo' ? 'ghost' : 'outline'}
                  className="shrink-0"
                  onClick={() => onGenerar(b.id)}
                  disabled={disabled || !!generandoId}
                >
                  {esteGenerando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : b.estado === 'listo' ? (
                    <><RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerar</>
                  ) : b.estado === 'fallido' ? (
                    <><RefreshCw className="mr-1 h-3.5 w-3.5" /> Reintentar</>
                  ) : (
                    <><Play className="mr-1 h-3.5 w-3.5" /> Generar</>
                  )}
                </Button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
