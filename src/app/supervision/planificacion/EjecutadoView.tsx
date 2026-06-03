'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { abreviarNombre } from '@/lib/planificacion/format'

interface ProyectoDia {
  codigo: string
  nombre: string
  color: string
  horasAprobadas: number
  horasPendientes: number
}

interface DiaDato {
  asistio: boolean
  planificado: { codigo: string; nombre: string; color: string } | null
  proyectos: ProyectoDia[]
}

interface PersonaEjecutada {
  userId: string
  nombre: string
  departamento: string
  dias: Record<string, DiaDato | null>
}

interface Props {
  semanaInicio: string
  numSemanas: number
  departamentosSeleccionados: string[]
  busqueda: string
}

// Mismo set de colores y anchos que la vista Planificado, para que ambos tabs
// compartan el mismo lenguaje visual (franja vertical de departamento, grid
// compacto continuo y columna de total a la derecha).
const DEPT_STYLES = [
  { stripe: '#3b82f6', rowEven: 'bg-blue-50/20', rowOdd: 'bg-blue-50/50' },
  { stripe: '#10b981', rowEven: 'bg-emerald-50/20', rowOdd: 'bg-emerald-50/50' },
  { stripe: '#f59e0b', rowEven: 'bg-amber-50/20', rowOdd: 'bg-amber-50/50' },
  { stripe: '#8b5cf6', rowEven: 'bg-violet-50/20', rowOdd: 'bg-violet-50/50' },
  { stripe: '#ef4444', rowEven: 'bg-rose-50/20', rowOdd: 'bg-rose-50/50' },
]

// Algo más anchas que en Planificado porque la celda muestra horas ("8h30m").
function colWidthPx(n: number): number {
  if (n <= 1) return 56
  if (n <= 2) return 48
  if (n <= 4) return 40
  return 34
}

function gridTemplate(numDias: number, n: number): string {
  return `12px 220px repeat(${numDias}, minmax(${colWidthPx(n)}px, 1fr)) 64px`
}

function fmtH(h: number) {
  if (h === 0) return ''
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm === 0 ? `${hh}h` : `${hh}h${mm}m`
}

function formatDiaHeader(dateStr: string): { linea1: string; linea2: string; isWeekend: boolean; isSaturday: boolean; isSunday: boolean } {
  const d = new Date(dateStr + 'T12:00:00Z')
  const dow = d.getUTCDay()
  const dias = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']
  return {
    linea1: dias[dow],
    linea2: String(d.getUTCDate()).padStart(2, '0'),
    isWeekend: dow === 0 || dow === 6,
    isSaturday: dow === 6,
    isSunday: dow === 0,
  }
}

// ── Celda de un día ────────────────────────────────────────────────────────
function DiaCelda({ dato }: { dato: DiaDato | null }) {
  if (!dato) {
    return <span className="text-muted-foreground/30 text-xs">—</span>
  }

  const tieneEjecucion = dato.proyectos.length > 0

  if (tieneEjecucion) {
    return (
      <div className="flex h-full w-full flex-col gap-0.5">
        {dato.proyectos.map((proy) => {
          const horas = proy.horasAprobadas > 0 ? proy.horasAprobadas : proy.horasPendientes
          const soloPendiente = proy.horasAprobadas === 0 && proy.horasPendientes > 0
          const tieneAmbas = proy.horasAprobadas > 0 && proy.horasPendientes > 0
          return (
            <div
              key={proy.codigo}
              title={`${proy.codigo} · ${proy.nombre}\n${fmtH(proy.horasAprobadas)} aprobadas${
                proy.horasPendientes > 0 ? ` · ${fmtH(proy.horasPendientes)} pendientes` : ''
              }`}
              className={cn(
                'relative flex min-h-[20px] flex-1 flex-col items-center justify-center rounded px-0.5 leading-none text-white shadow-sm',
                (soloPendiente || tieneAmbas) && 'ring-1 ring-amber-400 ring-offset-0',
              )}
              style={{ backgroundColor: proy.color, opacity: soloPendiente ? 0.7 : 1 }}
            >
              <span className="max-w-full truncate text-[8px] font-semibold opacity-90">{proy.codigo}</span>
              <span className="text-[11px] font-bold drop-shadow-sm">{fmtH(horas)}</span>
              {proy.horasPendientes > 0 && (
                <span
                  className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-0.5 text-[7px] font-bold text-amber-900"
                  title={`${fmtH(proy.horasPendientes)} pendientes de aprobación`}
                >
                  ⏳
                </span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Planificado pero sin horas registradas → bloque atenuado con solo el código.
  if (dato.planificado) {
    return (
      <div
        title={`Planificado: ${dato.planificado.codigo} · ${dato.planificado.nombre}\nSin horas registradas`}
        className="flex h-full w-full flex-col items-center justify-center rounded px-0.5 leading-none text-white opacity-40"
        style={{ backgroundColor: dato.planificado.color }}
      >
        <span className="max-w-full truncate text-[9px] font-semibold">{dato.planificado.codigo}</span>
      </div>
    )
  }

  // Asistió pero sin jornada de campo registrada.
  if (dato.asistio) {
    return (
      <span
        title="Asistió pero sin jornada de campo registrada"
        className="inline-block h-2 w-2 rounded-full bg-blue-400/60"
      />
    )
  }

  return <span className="text-muted-foreground/30 text-xs">—</span>
}

export function EjecutadoView({ semanaInicio, numSemanas, departamentosSeleccionados, busqueda }: Props) {
  const [dias, setDias] = useState<string[]>([])
  const [personas, setPersonas] = useState<PersonaEjecutada[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ inicio: semanaInicio, semanas: String(numSemanas) })
      if (departamentosSeleccionados.length > 0) params.set('departamentos', departamentosSeleccionados.join(','))
      const res = await fetch(`/api/planificacion/ejecutado?${params}`)
      if (!res.ok) throw new Error('Error al cargar')
      const json = await res.json()
      setDias(json.dias ?? [])
      setPersonas(json.personas ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [semanaInicio, numSemanas, departamentosSeleccionados])

  useEffect(() => { cargar() }, [cargar])

  const hoyKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const gridCols = useMemo(() => gridTemplate(dias.length, numSemanas), [dias.length, numSemanas])
  const minWidth = 12 + 220 + dias.length * colWidthPx(numSemanas) + 64

  const q = busqueda.trim().toLowerCase()
  const personasFiltradas = q ? personas.filter((p) => p.nombre.toLowerCase().includes(q)) : personas

  // Agrupar por departamento conservando el orden de aparición.
  const grupos = useMemo(() => {
    const map = new Map<string, PersonaEjecutada[]>()
    for (const p of personasFiltradas) {
      const dept = p.departamento || 'Sin área'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(p)
    }
    return Array.from(map.entries())
  }, [personasFiltradas])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos ejecutados...
      </div>
    )
  }
  if (error) {
    return <div className="flex items-center justify-center h-32 text-red-600 text-sm">{error}</div>
  }
  if (personasFiltradas.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Sin registros de jornada de campo en este período.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${minWidth}px` }}>
        {/* Sub-cabecera de semanas (solo multi-semana) */}
        {numSemanas > 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols }} className="text-[10px] font-semibold text-muted-foreground border-b bg-muted/20">
            <div />
            <div />
            {Array.from({ length: numSemanas }, (_, wi) => {
              const monday = new Date(semanaInicio + 'T00:00:00.000Z')
              monday.setUTCDate(monday.getUTCDate() + wi * 7)
              const sunday = new Date(monday.getTime() + 6 * 86400000)
              const label = `${monday.getUTCDate()} – ${sunday.getUTCDate()} ${sunday.toLocaleDateString('es', { month: 'short', timeZone: 'UTC' })}`
              return (
                <div key={wi} className="col-span-7 text-center py-0.5 border-r last:border-r-0 leading-tight">
                  {label}
                </div>
              )
            })}
            <div />
          </div>
        )}

        {/* Cabecera de días */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols }} className="text-xs font-medium text-muted-foreground border-b mb-0.5 pb-1">
          <div />
          <div className="px-3">Persona</div>
          {dias.map((dStr) => {
            const { linea1, linea2, isHoy, isSaturday, isSunday } = {
              ...formatDiaHeader(dStr),
              isHoy: dStr === hoyKey,
            }
            return (
              <div
                key={dStr}
                className={cn(
                  'text-center px-0.5 rounded truncate font-semibold leading-tight',
                  isSaturday && 'text-orange-500 bg-orange-50/60',
                  isSunday && 'text-red-500 bg-red-50/60',
                  isHoy && 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500',
                )}
              >
                <div>{linea1}</div>
                <div className="font-mono">{linea2}</div>
              </div>
            )
          })}
          <div className="text-center">Total</div>
        </div>

        {/* Grupos por departamento */}
        {grupos.map(([dept, gPersonas], grupoIdx) => {
          const deptStyle = DEPT_STYLES[grupoIdx % DEPT_STYLES.length]
          return (
            <div key={dept} className="relative">
              {/* Etiqueta vertical de departamento (rotada) */}
              <div
                className="absolute left-0 top-0 bottom-0 flex items-center justify-center overflow-hidden pointer-events-none z-10"
                style={{ width: 12, backgroundColor: deptStyle.stripe, writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
              >
                <span className="text-[7px] font-bold uppercase tracking-widest text-white select-none whitespace-nowrap px-0.5">
                  {dept}
                </span>
              </div>

              {gPersonas.map((persona, personaIdx) => {
                // Total de horas de la persona en el período.
                let totalAprob = 0
                let totalPend = 0
                for (const dStr of dias) {
                  const dd = persona.dias[dStr]
                  if (dd) {
                    for (const p of dd.proyectos) {
                      totalAprob += p.horasAprobadas
                      totalPend += p.horasPendientes
                    }
                  }
                }
                return (
                  <div
                    key={persona.userId}
                    style={{ display: 'grid', gridTemplateColumns: gridCols }}
                    className={cn(
                      'min-h-[30px] border-b items-stretch hover:brightness-95',
                      personaIdx % 2 === 0 ? deptStyle.rowEven : deptStyle.rowOdd,
                    )}
                  >
                    {/* Franja de color del departamento */}
                    <div className="self-stretch" style={{ backgroundColor: deptStyle.stripe, opacity: 0.15 }} />

                    {/* Nombre */}
                    <div className="flex items-center px-2 overflow-hidden">
                      <p className="text-xs font-medium truncate leading-none" title={persona.nombre}>
                        {abreviarNombre(persona.nombre)}
                      </p>
                    </div>

                    {/* Celdas por día */}
                    {dias.map((dStr) => {
                      const { isSaturday, isSunday } = formatDiaHeader(dStr)
                      const isHoy = dStr === hoyKey
                      return (
                        <div
                          key={dStr}
                          className={cn(
                            'relative flex items-center justify-center px-0.5 py-0.5',
                            isSaturday && 'bg-orange-100/30',
                            isSunday && 'bg-red-100/30',
                            isHoy && 'border-l-2 border-blue-500',
                          )}
                        >
                          <DiaCelda dato={persona.dias[dStr]} />
                        </div>
                      )
                    })}

                    {/* Total de horas */}
                    <div className="flex flex-col items-center justify-center leading-none">
                      {totalAprob > 0 ? (
                        <span className="text-xs font-bold text-emerald-700">{fmtH(totalAprob)}</span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">—</span>
                      )}
                      {totalPend > 0 && (
                        <span className="text-[10px] font-medium text-amber-700">{fmtH(totalPend)}⏳</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-3">
          <span className="flex items-center gap-1.5">
            <span className="rounded px-1 text-[10px] font-bold text-white" style={{ backgroundColor: '#10b981' }}>8h</span> Horas aprobadas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded px-1 text-[10px] font-bold text-white ring-1 ring-amber-400" style={{ backgroundColor: '#10b981' }}>8h⏳</span> Con horas pendientes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-400/60" /> Asistió sin jornada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="opacity-40 rounded px-1 text-[10px] font-semibold text-white bg-gray-400">CÓD</span> Planificado sin registro
          </span>
        </div>
      </div>
    </div>
  )
}
