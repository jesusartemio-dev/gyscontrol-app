'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { normalizeStr } from '@/lib/utils'

interface ProyectoEjecutado {
  proyectoId: string
  codigo: string
  nombre: string
  color: string
  diasPlanificados: number
  horasAprobadas: number
  horasPendientes: number
}

interface PersonaEjecutada {
  userId: string
  nombre: string
  departamento: string
  diasConAsistencia: number
  proyectos: ProyectoEjecutado[]
}

interface Props {
  semanaInicio: string
  numSemanas: number
  departamentosSeleccionados: string[]
  busqueda: string
}

function fmtHoras(h: number) {
  if (h === 0) return '—'
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`
}

export function EjecutadoView({ semanaInicio, numSemanas, departamentosSeleccionados, busqueda }: Props) {
  const [personas, setPersonas] = useState<PersonaEjecutada[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        inicio: semanaInicio,
        semanas: String(numSemanas),
      })
      if (departamentosSeleccionados.length > 0) {
        params.set('departamentos', departamentosSeleccionados.join(','))
      }
      const res = await fetch(`/api/planificacion/ejecutado?${params}`)
      if (!res.ok) throw new Error('Error al cargar')
      const json = await res.json()
      setPersonas(json.personas ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [semanaInicio, numSemanas, departamentosSeleccionados])

  useEffect(() => {
    cargar()
  }, [cargar])

  const personasFiltradas = busqueda.trim()
    ? personas.filter(p => normalizeStr(p.nombre).includes(normalizeStr(busqueda)))
    : personas

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
    return (
      <div className="flex items-center justify-center h-32 text-red-600 text-sm">
        {error}
      </div>
    )
  }

  if (personasFiltradas.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Sin registros de jornada de campo en este período.
      </div>
    )
  }

  // Totales globales
  const totalHorasAprobadas = personasFiltradas.reduce(
    (s, p) => s + p.proyectos.reduce((ps, pr) => ps + pr.horasAprobadas, 0), 0,
  )
  const totalHorasPendientes = personasFiltradas.reduce(
    (s, p) => s + p.proyectos.reduce((ps, pr) => ps + pr.horasPendientes, 0), 0,
  )

  return (
    <div className="space-y-4">
      {/* Resumen global */}
      <div className="flex flex-wrap gap-3">
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Personas c/ejecución</p>
            <p className="text-2xl font-bold">{personasFiltradas.length}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Horas aprobadas</p>
            <p className="text-2xl font-bold text-emerald-700">{fmtHoras(totalHorasAprobadas)}</p>
          </CardContent>
        </Card>
        {totalHorasPendientes > 0 && (
          <Card className="flex-1 min-w-[140px]">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Horas pendientes</p>
              <p className="text-2xl font-bold text-amber-700">{fmtHoras(totalHorasPendientes)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabla por departamento */}
      {Array.from(grupos.entries()).map(([dept, gPersonas]) => (
        <div key={dept}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            {dept} ({gPersonas.length})
          </p>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead className="text-center">Días plan.</TableHead>
                    <TableHead className="text-center">Días asistidos</TableHead>
                    <TableHead className="text-right">H. aprobadas</TableHead>
                    <TableHead className="text-right">H. pendientes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gPersonas.map(persona => (
                    persona.proyectos.map((proy, pi) => (
                      <TableRow key={`${persona.userId}-${proy.proyectoId}`}>
                        {pi === 0 && (
                          <TableCell rowSpan={persona.proyectos.length} className="align-top font-medium border-r">
                            <div>{persona.nombre}</div>
                            {persona.diasConAsistencia > 0 && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {persona.diasConAsistencia} día{persona.diasConAsistencia !== 1 ? 's' : ''} con ingreso
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: proy.color }}
                            />
                            <span className="font-mono text-xs text-muted-foreground">{proy.codigo}</span>
                            <span className="text-sm truncate max-w-[200px]">{proy.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {proy.diasPlanificados > 0 ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {proy.diasPlanificados}d
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {pi === 0 ? (
                            persona.diasConAsistencia > 0 ? (
                              <Badge
                                variant="outline"
                                className={`font-mono text-xs ${
                                  persona.diasConAsistencia >= (persona.proyectos[0]?.diasPlanificados ?? 0)
                                    ? 'border-emerald-400 text-emerald-700'
                                    : 'border-amber-400 text-amber-700'
                                }`}
                              >
                                {persona.diasConAsistencia}d
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {proy.horasAprobadas > 0 ? (
                            <span className="text-emerald-700 font-semibold">
                              {fmtHoras(proy.horasAprobadas)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {proy.horasPendientes > 0 ? (
                            <span className="text-amber-700">
                              {fmtHoras(proy.horasPendientes)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
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

      <p className="text-xs text-muted-foreground text-center">
        Horas aprobadas: de jornadas de campo aprobadas · Pendientes: jornadas iniciadas o en revisión
      </p>
    </div>
  )
}
