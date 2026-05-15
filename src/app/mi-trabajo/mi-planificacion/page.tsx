'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CeldaPlanificacionCompacta,
  type CeldaCompacta,
} from '@/components/planificacion/CeldaPlanificacionCompacta'
import {
  CeldaDetalleModal,
  type CeldaDetalleData,
} from '@/components/planificacion/CeldaDetalleModal'

function currentMondayUTC(): string {
  const now = new Date()
  const dow = now.getUTCDay() || 7
  const ms =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (dow - 1) * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

function todayUTC(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00.000Z')
  return new Date(d.getTime() + n * 7 * 86400000).toISOString().slice(0, 10)
}

function formatWeekLabel(inicioStr: string): string {
  const d1 = new Date(inicioStr + 'T00:00:00.000Z')
  const d2 = new Date(d1.getTime() + 6 * 86400000)
  if (d1.getUTCMonth() === d2.getUTCMonth()) {
    return `${format(d1, 'd', { locale: es })} – ${format(d2, "d 'de' MMMM yyyy", { locale: es })}`
  }
  return `${format(d1, "d MMM", { locale: es })} – ${format(d2, "d MMM yyyy", { locale: es })}`
}

interface PersonaResponse {
  usuario: { id: string; name: string | null }
  rango: { inicio: string; fin: string }
  dias: Record<string, CeldaCompacta[]>
}

interface DiaCard {
  fecha: string
  d: Date
  label: string
  dayOfWeek: number
  isHoy: boolean
  isWeekend: boolean
  celdas: CeldaCompacta[]
}

export default function MiPlanificacionPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [semanaInicio, setSemanaInicio] = useState<string>(currentMondayUTC)
  const [planData, setPlanData] = useState<PersonaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalDetalle, setModalDetalle] = useState<CeldaDetalleData | null>(null)

  const hoyKey = useMemo(() => todayUTC(), [])
  const hoy = useMemo(() => currentMondayUTC(), [])

  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(semanaInicio + 'T00:00:00.000Z')
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [semanaInicio])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    const fin = diasSemana[6]
    fetch(`/api/planificacion/persona?userId=${userId}&inicio=${semanaInicio}&fin=${fin}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setPlanData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, semanaInicio, diasSemana])

  const diasCards = useMemo((): DiaCard[] => {
    return diasSemana.map((fecha) => {
      const d = new Date(fecha + 'T00:00:00.000Z')
      const dow = d.getUTCDay()
      const label = format(d, "EEEE d 'de' MMMM", { locale: es })
      return {
        fecha,
        d,
        label,
        dayOfWeek: dow,
        isHoy: fecha === hoyKey,
        isWeekend: dow === 0 || dow === 6,
        celdas: planData?.dias[fecha] ?? [],
      }
    })
  }, [diasSemana, hoyKey, planData])

  // Utilización de la semana
  const { asignados, laborables } = useMemo(() => {
    const labs = diasCards.filter((d) => !d.isWeekend)
    const asig = labs.filter((d) => d.celdas.some((c) => c.tipo === 'proyecto'))
    return { asignados: asig.length, laborables: labs.length }
  }, [diasCards])

  return (
    <div className="container max-w-lg mx-auto p-4 pb-16">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Mi planificación</h1>
        </div>
        <p className="text-sm text-muted-foreground">{formatWeekLabel(semanaInicio)}</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSemanaInicio(addWeeks(semanaInicio, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSemanaInicio(hoy)}
          disabled={semanaInicio === hoy}
        >
          Esta semana
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSemanaInicio(addWeeks(semanaInicio, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Utilización badge */}
        {!loading && (
          <div className="ml-auto">
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                asignados === laborables && 'border-green-500 text-green-600',
                asignados < laborables && asignados > 0 && 'border-amber-500 text-amber-600',
                asignados === 0 && 'text-muted-foreground',
              )}
            >
              {asignados}/{laborables} días
            </Badge>
          </div>
        )}
      </div>

      {/* Day cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-16 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {diasCards.map((dia) => {
            const sinNada = dia.celdas.length === 0
            const esDiaLibre = dia.isWeekend && sinNada

            if (esDiaLibre) {
              return (
                <div
                  key={dia.fecha}
                  className="rounded-lg border border-dashed px-4 py-3 flex items-center gap-3 opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm capitalize text-muted-foreground">{dia.label}</p>
                    <p className="text-xs text-muted-foreground">Día libre</p>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={dia.fecha}
                className={cn(
                  'rounded-lg border px-4 py-3 transition-colors',
                  dia.isHoy && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
                  !dia.isHoy && 'border-border bg-card',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <p
                    className={cn(
                      'text-sm font-medium capitalize',
                      dia.isWeekend && 'text-muted-foreground',
                    )}
                  >
                    {dia.label}
                  </p>
                  {dia.isHoy && (
                    <span className="text-[10px] bg-blue-500 text-white rounded px-1.5 py-0.5 leading-none font-medium">
                      Hoy
                    </span>
                  )}
                </div>

                {sinNada ? (
                  <p className="text-sm text-muted-foreground">Sin asignación</p>
                ) : (
                  <div className="space-y-1">
                    {dia.celdas.map((celda) => (
                      <CeldaPlanificacionCompacta
                        key={celda.id}
                        celda={celda}
                        mostrarNotas
                        onTap={() =>
                          setModalDetalle({
                            fecha: dia.fecha,
                            celda,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CeldaDetalleModal
        open={!!modalDetalle}
        onClose={() => setModalDetalle(null)}
        data={modalDetalle}
      />
    </div>
  )
}
