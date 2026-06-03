'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { abreviarNombre } from '@/lib/planificacion/format'
import { MatrizDiaCompacta, type GrupoMatriz } from '@/components/planificacion/MatrizDiaCompacta'

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

// Algo más anchas que en Planificado porque la celda muestra horas ("8h30m").
function colWidthPx(n: number): number {
  if (n <= 1) return 56
  if (n <= 2) return 48
  if (n <= 4) return 40
  return 34
}

function fmtH(h: number) {
  if (h === 0) return ''
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm === 0 ? `${hh}h` : `${hh}h${mm}m`
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

  const q = busqueda.trim().toLowerCase()
  const personasFiltradas = q ? personas.filter((p) => p.nombre.toLowerCase().includes(q)) : personas

  // Agrupar por departamento conservando el orden de aparición.
  const grupos = useMemo<GrupoMatriz<PersonaEjecutada>[]>(() => {
    const map = new Map<string, PersonaEjecutada[]>()
    for (const p of personasFiltradas) {
      const dept = p.departamento || 'Sin área'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(p)
    }
    return Array.from(map.entries()).map(([dept, ps]) => ({ dept, personas: ps }))
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
    <div className="space-y-3">
      <MatrizDiaCompacta<PersonaEjecutada>
        dias={dias}
        grupos={grupos}
        getKey={(p) => p.userId}
        colWidthPx={colWidthPx(numSemanas)}
        weekSubHeader={{ semanaInicio, numSemanas }}
        totalHeader="Total"
        renderNombre={(p) => (
          <p className="text-xs font-medium truncate leading-none" title={p.nombre}>
            {abreviarNombre(p.nombre)}
          </p>
        )}
        renderCelda={(p, dStr) => <DiaCelda dato={p.dias[dStr]} />}
        renderTotal={(p) => {
          let aprob = 0
          let pend = 0
          for (const dStr of dias) {
            const dd = p.dias[dStr]
            if (dd) {
              for (const pr of dd.proyectos) {
                aprob += pr.horasAprobadas
                pend += pr.horasPendientes
              }
            }
          }
          return (
            <>
              {aprob > 0 ? (
                <span className="text-xs font-bold text-emerald-700">{fmtH(aprob)}</span>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">—</span>
              )}
              {pend > 0 && <span className="text-[10px] font-medium text-amber-700">{fmtH(pend)}⏳</span>}
            </>
          )
        }}
      />

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
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
  )
}
