'use client'

// ===================================================
// 📁 ActividadesSimilaresPanel
// 📌 Muestra las actividades que son el mismo trabajo sobre equipos distintos
//    y deja unificarlas o fusionarlas, siempre con previa antes de escribir.
//
// Nace de un caso real: los tres filtros de CJM52 tienen las mismas tareas,
// pero se generaron en bloques distintos y quedaron evaluados diferente — a
// uno le faltaba el peligro de trabajo en altura.
// ===================================================

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Copy, Merge, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

interface DiferenciaTarea {
  tarea: string
  faltan: string[]
  sobran: string[]
  distintos: string[]
}
interface ActividadDelGrupo {
  actividad: string
  filas: number
  tareas: number
  diferencias: DiferenciaTarea[]
}
export interface GrupoSimilar {
  clave: string
  proceso: string
  tareasComunes: string[]
  referenciaSugerida: string
  actividades: ActividadDelGrupo[]
  identicas: boolean
  filasQueSobran: number
}
interface FilaEjemplo {
  tarea: string
  factorRiesgo: string
  peligro: string
  riesgo: string
  severidad: number
  probabilidad: string
  severidadResidual: number
  probabilidadResidual: string
}
interface Previa {
  accion: 'unificar' | 'fusionar'
  referencia: string
  totalAntes: number
  totalDespues: number
  filasAntes: number
  filasDespues: number
  ejemplo: { actividad: string; tarea: string; antes: FilaEjemplo[]; despues: FilaEjemplo[] } | null
  afectadas: Array<{
    actividad: string
    filasAntes: number
    filasDespues: number
    peligrosQueSeAgregan: string[]
    peligrosQueSeCorrigen: string[]
    peligrosQueSeQuitan: string[]
  }>
}

interface Props {
  proyectoId: string
  /** Se llama tras aplicar, para recargar las filas del IPERC. */
  onAplicado: () => Promise<void> | void
  /** Cambia cuando el IPERC cambia, para volver a detectar. */
  refreshKey?: number
}

export function ActividadesSimilaresPanel({ proyectoId, onAplicado, refreshKey }: Props) {
  const [grupos, setGrupos] = useState<GrupoSimilar[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)

  const [dialogo, setDialogo] = useState<{
    grupo: GrupoSimilar
    accion: 'unificar' | 'fusionar'
    referencia: string
  } | null>(null)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [cargandoPrevia, setCargandoPrevia] = useState(false)
  const [aplicando, setAplicando] = useState(false)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    fetch(`/api/proyectos/${proyectoId}/iperc/actividades-similares`)
      .then(r => (r.ok ? r.json() : { grupos: [] }))
      .then(d => { if (vivo) setGrupos(d.grupos ?? []) })
      .catch(() => { if (vivo) setGrupos([]) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [proyectoId, refreshKey])

  // Pedir la previa al abrir el diálogo o al cambiar la referencia.
  useEffect(() => {
    if (!dialogo) { setPrevia(null); return }
    let vivo = true
    setCargandoPrevia(true)
    fetch(`/api/proyectos/${proyectoId}/iperc/actividades-similares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: dialogo.accion,
        referencia: dialogo.referencia,
        actividades: dialogo.grupo.actividades.map(a => a.actividad),
      }),
    })
      .then(r => r.json())
      .then(d => { if (vivo) setPrevia(d.previa ?? null) })
      .catch(() => { if (vivo) toast.error('No se pudo calcular la previa') })
      .finally(() => { if (vivo) setCargandoPrevia(false) })
    return () => { vivo = false }
  }, [dialogo, proyectoId])

  const confirmar = async () => {
    if (!dialogo) return
    setAplicando(true)
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/iperc/actividades-similares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: dialogo.accion,
          referencia: dialogo.referencia,
          actividades: dialogo.grupo.actividades.map(a => a.actividad),
          confirmar: true,
        }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo aplicar'); return }
      toast.success(
        dialogo.accion === 'unificar'
          ? 'Evaluaciones unificadas'
          : `Actividades fusionadas · el IPERC quedó con ${d.filasFinales} filas`,
      )
      setDialogo(null)
      await onAplicado()
    } finally {
      setAplicando(false)
    }
  }

  if (cargando || grupos.length === 0) return null

  const conDiferencias = grupos.filter(g => !g.identicas).length

  return (
    <>
      <Card className="mb-4 border-amber-200 bg-amber-50/50">
        <CardContent className="py-3">
          <button
            type="button"
            onClick={() => setAbierto(v => !v)}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div className="flex items-start gap-2">
              <Copy className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {grupos.length} grupo{grupos.length === 1 ? '' : 's'} de actividades repetidas
                  {conDiferencias > 0 && ` · ${conDiferencias} con evaluaciones distintas`}
                </p>
                <p className="text-xs text-amber-800">
                  Es el mismo trabajo sobre equipos distintos.
                  {conDiferencias > 0
                    ? ' Algunas quedaron evaluadas diferente entre sí: conviene revisarlas.'
                    : ' Evalúan igual; puedes fusionarlas si quieres menos filas.'}
                </p>
              </div>
            </div>
            {abierto ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </button>

          {abierto && (
            <ul className="mt-3 space-y-2">
              {grupos.map(g => (
                <li key={g.clave} className="rounded-md border bg-white p-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {g.actividades.map(a => (
                          <Badge key={a.actividad} variant="outline" className="text-[11px]">
                            {a.actividad}
                            <span className="ml-1 text-muted-foreground">{a.filas}f</span>
                          </Badge>
                        ))}
                        {g.identicas ? (
                          <Badge className="bg-emerald-100 text-[10px] text-emerald-700" variant="outline">
                            <CheckCircle2 className="mr-0.5 h-3 w-3" /> evalúan igual
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-[10px] text-amber-800" variant="outline">
                            <AlertTriangle className="mr-0.5 h-3 w-3" /> evalúan distinto
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        className="mt-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        onClick={() => setExpandido(expandido === g.clave ? null : g.clave)}
                      >
                        {expandido === g.clave ? 'Ocultar detalle' : `Ver las ${g.tareasComunes.length} tareas y las diferencias`}
                      </button>

                      {expandido === g.clave && (
                        <div className="mt-2 space-y-2 rounded bg-slate-50 p-2 text-[11px]">
                          <div>
                            <p className="font-medium">Tareas que comparten</p>
                            <ul className="ml-4 list-disc text-muted-foreground">
                              {g.tareasComunes.map(t => <li key={t}>{t.toLowerCase()}</li>)}
                            </ul>
                          </div>
                          {g.actividades.filter(a => a.diferencias.length > 0).map(a => (
                            <div key={a.actividad}>
                              <p className="font-medium">
                                {a.actividad} — diferencias contra {g.referenciaSugerida}
                              </p>
                              {a.diferencias.map(d => (
                                <div key={d.tarea} className="ml-3 mt-1">
                                  <p className="text-muted-foreground">{d.tarea}</p>
                                  {d.faltan.map(x => (
                                    <p key={x} className="ml-3 text-red-700">falta: {x}</p>
                                  ))}
                                  {d.sobran.map(x => (
                                    <p key={x} className="ml-3 text-blue-700">solo aquí: {x}</p>
                                  ))}
                                  {d.distintos.map(x => (
                                    <p key={x} className="ml-3 text-amber-700">distinto: {x}</p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialogo({ grupo: g, accion: 'unificar', referencia: g.referenciaSugerida })}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" /> Unificar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialogo({ grupo: g, accion: 'fusionar', referencia: g.referenciaSugerida })}
                      >
                        <Merge className="mr-1 h-3.5 w-3.5" /> Fusionar
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dialogo} onOpenChange={v => { if (!v) setDialogo(null) }}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-3">
          <DialogHeader>
            <DialogTitle>
              {dialogo?.accion === 'unificar' ? 'Unificar evaluaciones' : 'Fusionar actividades'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {dialogo?.accion === 'unificar' ? (
                <>
                  Las actividades <strong>siguen existiendo por separado</strong>, cada una con sus
                  tareas y su equipo. Lo único que cambia es la evaluación: todas pasan a tener los
                  mismos peligros, valoraciones y controles que la actividad de referencia. Sirve
                  cuando el mismo trabajo quedó evaluado distinto entre un equipo y otro.
                </>
              ) : (
                <>
                  Se <strong>conservan solo las filas de la actividad de referencia</strong> y se
                  borran las de las demás. El IPERC queda más corto, pero deja de listar cada
                  equipo por separado. Si luego regeneras el bloque, las filas borradas vuelven.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {dialogo && (
            // El cuerpo scrollea y el pie queda fijo: con el ejemplo y la
            // lista de cambios, el modal crecia mas que la pantalla y los
            // botones de aceptar quedaban fuera de alcance.
            <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <div>
                <p className="mb-1 text-xs font-medium">Actividad de referencia</p>
                <div className="flex flex-wrap gap-1.5">
                  {dialogo.grupo.actividades.map(a => (
                    <Button
                      key={a.actividad}
                      size="sm"
                      variant={dialogo.referencia === a.actividad ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => setDialogo({ ...dialogo, referencia: a.actividad })}
                    >
                      {a.actividad}
                    </Button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {dialogo.accion === 'unificar'
                    ? 'Su evaluación es la que se copia a las demás. Elige la que esté mejor evaluada.'
                    : 'Es la única que sobrevive. Elige la que mejor represente el trabajo.'}
                </p>
              </div>

              <div className="rounded-md border p-2.5">
                <p className="mb-1.5 text-xs font-semibold">Qué va a pasar</p>
                {cargandoPrevia ? (
                  <p className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando…
                  </p>
                ) : !previa ? (
                  <p className="py-3 text-xs text-muted-foreground">Sin datos.</p>
                ) : (
                  <div className="space-y-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded bg-slate-100 px-2 py-1.5">
                      <span>
                        <span className="text-muted-foreground">IPERC completo:</span>{' '}
                        <strong>{previa.totalAntes}</strong> → <strong>{previa.totalDespues}</strong> filas
                        {previa.totalDespues < previa.totalAntes ? (
                          <span className="ml-1 font-semibold text-emerald-700">
                            −{previa.totalAntes - previa.totalDespues}
                          </span>
                        ) : previa.totalDespues > previa.totalAntes ? (
                          <span className="ml-1 font-semibold text-amber-700">
                            +{previa.totalDespues - previa.totalAntes}
                          </span>
                        ) : (
                          <span className="ml-1 text-muted-foreground">sin cambio de cantidad</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        En estas actividades: {previa.filasAntes} → {previa.filasDespues}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {previa.afectadas.map(a => (
                        <li key={a.actividad} className="rounded bg-slate-50 p-2">
                          <p className="font-medium">
                            {a.actividad}: {a.filasAntes} → {a.filasDespues} filas
                          </p>
                          {a.peligrosQueSeAgregan.map(x => (
                            <p key={x} className="ml-2 text-emerald-700">+ se agrega — {x}</p>
                          ))}
                          {a.peligrosQueSeCorrigen.map(x => (
                            <p key={x} className="ml-2 text-amber-700">~ se corrige — {x}</p>
                          ))}
                          {a.peligrosQueSeQuitan.map(x => (
                            <p key={x} className="ml-2 text-red-700">− se quita — {x}</p>
                          ))}
                          {a.peligrosQueSeAgregan.length === 0 &&
                            a.peligrosQueSeCorrigen.length === 0 &&
                            a.peligrosQueSeQuitan.length === 0 && (
                              <p className="ml-2 text-muted-foreground">
                                {previa.accion === 'fusionar' ? 'se eliminan sus filas' : 'sin cambios'}
                              </p>
                            )}
                        </li>
                      ))}
                    </ul>
                    {previa.ejemplo && (
                      <div className="rounded border">
                        <p className="border-b bg-slate-50 px-2 py-1 font-medium">
                          Ejemplo · {previa.ejemplo.actividad} › {previa.ejemplo.tarea}
                        </p>
                        <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
                          <div className="bg-white p-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Ahora</p>
                            <TablaEjemplo filas={previa.ejemplo.antes} />
                          </div>
                          <div className="bg-white p-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                              {previa.accion === 'fusionar' ? 'Después (se eliminan)' : 'Después'}
                            </p>
                            {previa.ejemplo.despues.length === 0 ? (
                              <p className="py-2 text-muted-foreground">
                                Estas filas desaparecen; queda solo {previa.referencia}.
                              </p>
                            ) : (
                              <TablaEjemplo filas={previa.ejemplo.despues} />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {previa.accion === 'unificar' &&
                      previa.afectadas.some(a => a.peligrosQueSeQuitan.length > 0) && (
                        <p className="rounded bg-red-50 p-2 text-red-800">
                          Ojo: hay peligros que solo existen en las otras actividades y se van a
                          perder. Si son válidos, agrégalos antes a la referencia.
                        </p>
                      )}
                  </div>
                )}
              </div>

            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setDialogo(null)} disabled={aplicando}>
                Cancelar
              </Button>
              <Button onClick={confirmar} disabled={aplicando || cargandoPrevia || !previa}>
                {aplicando && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                {dialogo.accion === 'unificar' ? 'Unificar' : 'Fusionar'}
              </Button>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Las filas tal como se verian en la tabla del IPERC, resumidas. */
function TablaEjemplo({ filas }: { filas: FilaEjemplo[] }) {
  if (filas.length === 0) return <p className="py-2 text-muted-foreground">Sin filas.</p>
  return (
    <ul className="space-y-1">
      {filas.map((f, i) => (
        <li key={i} className="rounded bg-slate-50 px-1.5 py-1">
          <p className="font-medium">
            <span className="mr-1 rounded bg-slate-200 px-1 text-[9px] font-semibold text-slate-600">
              {f.factorRiesgo}
            </span>
            {f.peligro}
          </p>
          <p className="text-muted-foreground">{f.riesgo}</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            S{f.severidad} {f.probabilidad} → S{f.severidadResidual} {f.probabilidadResidual}
          </p>
        </li>
      ))}
    </ul>
  )
}
