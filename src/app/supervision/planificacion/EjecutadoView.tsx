'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function fmtH(h: number) {
  if (h === 0) return ''
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm === 0 ? `${hh}h` : `${hh}h${mm}m`
}

function formatDiaHeader(dateStr: string): { linea1: string; linea2: string; isWeekend: boolean } {
  const d = new Date(dateStr + 'T12:00:00Z')
  const dow = d.getUTCDay()
  const dias = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']
  return {
    linea1: dias[dow],
    linea2: String(d.getUTCDate()).padStart(2, '0'),
    isWeekend: dow === 0 || dow === 6,
  }
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

  const q = busqueda.trim().toLowerCase()
  const personasFiltradas = q ? personas.filter(p => p.nombre.toLowerCase().includes(q)) : personas

  // Agrupar por departamento
  const grupos = new Map<string, PersonaEjecutada[]>()
  for (const p of personasFiltradas) {
    const dept = p.departamento || 'Sin área'
    if (!grupos.has(dept)) grupos.set(dept, [])
    grupos.get(dept)!.push(p)
  }

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
    <div className="space-y-6">
      {Array.from(grupos.entries()).map(([dept, gPersonas]) => (
        <div key={dept}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            {dept} ({gPersonas.length})
          </p>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <table className="w-full border-collapse text-sm" style={{ minWidth: `${220 + dias.length * 88}px` }}>
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="sticky left-0 z-10 bg-muted/30 text-left px-3 py-2 font-medium text-xs text-muted-foreground min-w-[220px]">
                    Persona
                  </th>
                  {dias.map(d => {
                    const { linea1, linea2, isWeekend } = formatDiaHeader(d)
                    return (
                      <th
                        key={d}
                        className={cn(
                          'text-center px-1 py-1.5 font-medium text-xs w-[88px]',
                          isWeekend ? 'text-muted-foreground/50' : 'text-muted-foreground',
                        )}
                      >
                        <div>{linea1}</div>
                        <div className="font-mono">{linea2}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {gPersonas.map((persona, pi) => (
                  <tr
                    key={persona.userId}
                    className={cn(
                      'border-b last:border-b-0',
                      pi % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                    )}
                  >
                    {/* Nombre */}
                    <td className={cn(
                      'sticky left-0 z-10 px-3 py-2 font-medium border-r',
                      pi % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                    )}>
                      {persona.nombre}
                    </td>

                    {/* Celdas por día */}
                    {dias.map(dStr => {
                      const dato = persona.dias[dStr]
                      const { isWeekend } = formatDiaHeader(dStr)

                      if (!dato) {
                        return (
                          <td
                            key={dStr}
                            className={cn('text-center px-1 py-2', isWeekend && 'bg-muted/20')}
                          >
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          </td>
                        )
                      }

                      const totalAprobadas = dato.proyectos.reduce((s, p) => s + p.horasAprobadas, 0)
                      const totalPendientes = dato.proyectos.reduce((s, p) => s + p.horasPendientes, 0)
                      const tieneEjecucion = dato.proyectos.length > 0

                      return (
                        <td
                          key={dStr}
                          className={cn(
                            'px-1 py-1.5 text-center align-top',
                            isWeekend && 'bg-muted/20',
                          )}
                        >
                          <div className="flex flex-col items-center gap-0.5 min-h-[40px] justify-center">
                            {/* Proyectos con horas */}
                            {tieneEjecucion ? (
                              dato.proyectos.map(proy => (
                                <div key={proy.codigo} className="flex flex-col items-center gap-0.5">
                                  <span
                                    className="text-[10px] font-semibold text-white rounded px-1.5 leading-tight whitespace-nowrap"
                                    style={{ backgroundColor: proy.color }}
                                  >
                                    {proy.codigo}
                                  </span>
                                  {proy.horasAprobadas > 0 && (
                                    <span className="text-[11px] font-semibold text-emerald-700 leading-none">
                                      {fmtH(proy.horasAprobadas)}
                                    </span>
                                  )}
                                  {proy.horasPendientes > 0 && (
                                    <span className="text-[11px] font-medium text-amber-700 leading-none">
                                      {fmtH(proy.horasPendientes)}⏳
                                    </span>
                                  )}
                                </div>
                              ))
                            ) : dato.planificado ? (
                              // Planificado pero sin horas registradas
                              <div className="flex flex-col items-center gap-0.5 opacity-40">
                                <span
                                  className="text-[10px] font-semibold text-white rounded px-1.5 leading-tight"
                                  style={{ backgroundColor: dato.planificado.color }}
                                >
                                  {dato.planificado.codigo}
                                </span>
                              </div>
                            ) : null}

                            {/* Indicador asistencia sin horas */}
                            {!tieneEjecucion && dato.asistio && (
                              <span
                                title="Asistió pero sin jornada registrada"
                                className="inline-block h-2 w-2 rounded-full bg-blue-400/60"
                              />
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
        </div>
      ))}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-emerald-700">8h</span> Horas aprobadas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-amber-700">8h⏳</span> Pendientes de aprobación
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400/60" /> Asistió sin jornada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="opacity-40 rounded px-1 text-[10px] font-semibold text-white bg-gray-400">CÓD</span> Planificado sin registro
        </span>
      </div>
    </div>
  )
}
