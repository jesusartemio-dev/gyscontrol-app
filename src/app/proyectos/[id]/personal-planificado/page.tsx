'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface PersonaProyecto {
  userId: string
  nombre: string
  dias: Record<string, 'presente'>
}

interface ProyectoResponse {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    lider: { id: string; name: string } | null
  }
  rango: { inicio: string; fin: string }
  personas: PersonaProyecto[]
}

function currentMondayUTC(): string {
  const now = new Date()
  const day = now.getUTCDay() || 7
  const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (day - 1) * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00.000Z')
  return new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10)
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00.000Z')
  const day = d.toLocaleDateString('es', { weekday: 'short', timeZone: 'UTC' })
  return `${day} ${d.getUTCDate()}`
}

export default function PersonalPlanificadoPage() {
  const params = useParams()
  const proyectoId = params.id as string

  const [inicio, setInicio] = useState<string>(currentMondayUTC)
  const [fin, setFin] = useState<string>(() => addDaysStr(currentMondayUTC(), 6))
  const [data, setData] = useState<ProyectoResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!proyectoId || !inicio || !fin) return
    setLoading(true)
    fetch(`/api/planificacion/proyecto?proyectoId=${proyectoId}&inicio=${inicio}&fin=${fin}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Error al cargar planificación del proyecto'))
      .finally(() => setLoading(false))
  }, [proyectoId, inicio, fin])

  const dias = useMemo(() => {
    const result: string[] = []
    let cur = new Date(inicio + 'T00:00:00.000Z')
    const finD = new Date(fin + 'T00:00:00.000Z')
    while (cur <= finD) {
      result.push(cur.toISOString().slice(0, 10))
      cur = new Date(cur.getTime() + 86400000)
    }
    return result
  }, [inicio, fin])

  const handleInicioChange = (val: string) => {
    setInicio(val)
    if (val && fin < val) {
      setFin(addDaysStr(val, 6))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Personal planificado</h2>
        {data?.proyecto && (
          <p className="text-sm text-muted-foreground">
            [{data.proyecto.codigo}] {data.proyecto.nombre}
            {data.proyecto.lider && ` · Líder: ${data.proyecto.lider.name}`}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Desde</label>
          <input
            type="date"
            value={inicio}
            onChange={(e) => handleInicioChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Hasta</label>
          <input
            type="date"
            value={fin}
            min={inicio}
            onChange={(e) => setFin(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Cargando...
        </div>
      ) : !data || data.personas.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No hay personal planificado en este rango
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-fit">
            <div
              className="grid text-xs font-medium text-muted-foreground border-b pb-1"
              style={{ gridTemplateColumns: `200px repeat(${dias.length}, minmax(36px, 1fr))` }}
            >
              <div className="px-3">Persona</div>
              {dias.map((d) => {
                const isWeekend = new Date(d + 'T00:00:00.000Z').getUTCDay() % 6 === 0
                return (
                  <div key={d} className={cn('text-center', isWeekend && 'text-muted-foreground/50')}>
                    {formatDay(d)}
                  </div>
                )
              })}
            </div>

            {data.personas.map((persona) => (
              <div
                key={persona.userId}
                className="grid h-10 border-b items-center hover:bg-muted/20"
                style={{ gridTemplateColumns: `200px repeat(${dias.length}, minmax(36px, 1fr))` }}
              >
                <div className="px-3 text-sm font-medium truncate">{persona.nombre}</div>
                {dias.map((d) => {
                  const presente = persona.dias[d] === 'presente'
                  const isWeekend = new Date(d + 'T00:00:00.000Z').getUTCDay() % 6 === 0
                  return (
                    <div
                      key={d}
                      className={cn('flex items-center justify-center h-full', isWeekend && 'bg-muted/30')}
                    >
                      {presente ? (
                        <span className="text-green-600 font-bold text-sm">✓</span>
                      ) : (
                        <span className="text-muted-foreground/30 text-sm">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
