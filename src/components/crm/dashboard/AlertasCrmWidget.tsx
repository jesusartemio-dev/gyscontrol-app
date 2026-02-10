'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  AlertTriangle,
  Calendar,
  Flame,
  Eye,
  ChevronRight,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Alerta {
  tipo: string
  oportunidad: {
    id: string
    nombre: string
    estado: string
    valorEstimado: number | null
    prioridad: string
    fechaUltimoContacto: string | null
    fechaCierreEstimada: string | null
    updatedAt: string
    createdAt: string
    cliente: {
      nombre: string
      codigo: string | null
    }
    comercial: {
      name: string | null
    } | null
  }
}

interface Resumen {
  sinContacto: number
  estancadas: number
  cierreProximo: number
  altaPrioridad: number
  total: number
}

interface AlertasData {
  alertas: Alerta[]
  resumen: Resumen
}

const ALERT_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; color: string; badgeClass: string }
> = {
  sin_contacto: {
    label: 'Sin Contacto',
    icon: Clock,
    color: 'text-amber-600',
    badgeClass:
      'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200',
  },
  estancada: {
    label: 'Estancada',
    icon: AlertTriangle,
    color: 'text-orange-600',
    badgeClass:
      'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200',
  },
  cierre_proximo: {
    label: 'Cierre Proximo',
    icon: Calendar,
    color: 'text-blue-600',
    badgeClass:
      'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
  },
  alta_prioridad_inactiva: {
    label: 'Alta Prioridad',
    icon: Flame,
    color: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
  },
}

const MAX_VISIBLE_ALERTS = 8

export default function AlertasCrmWidget() {
  const router = useRouter()
  const [data, setData] = useState<AlertasData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/crm/alertas')
        if (!response.ok) {
          throw new Error('Error al cargar alertas')
        }
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching alertas CRM:', error)
        setData({ alertas: [], resumen: { sinContacto: 0, estancadas: 0, cierreProximo: 0, altaPrioridad: 0, total: 0 } })
      } finally {
        setLoading(false)
      }
    }

    fetchAlertas()
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-ES')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Skeleton badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          {/* Skeleton list items */}
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.resumen.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-sm">Sin alertas activas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const summaryItems = [
    {
      key: 'sin_contacto',
      label: 'Sin Contacto',
      count: data.resumen.sinContacto,
      icon: Clock,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-500',
    },
    {
      key: 'estancada',
      label: 'Estancadas',
      count: data.resumen.estancadas,
      icon: AlertTriangle,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      iconColor: 'text-orange-500',
    },
    {
      key: 'cierre_proximo',
      label: 'Cierre Proximo',
      count: data.resumen.cierreProximo,
      icon: Calendar,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-500',
    },
    {
      key: 'alta_prioridad_inactiva',
      label: 'Alta Prioridad',
      count: data.resumen.altaPrioridad,
      icon: Flame,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      iconColor: 'text-red-500',
    },
  ]

  const visibleAlertas = data.alertas.slice(0, MAX_VISIBLE_ALERTS)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Alertas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {summaryItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className={`flex flex-col items-center justify-center rounded-lg p-3 ${item.bgColor}`}
              >
                <Icon className={`h-5 w-5 mb-1 ${item.iconColor}`} />
                <span className={`text-xl font-bold ${item.textColor}`}>
                  {item.count}
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Alert list */}
        <div className="space-y-2">
          {visibleAlertas.map((alerta) => {
            const config = ALERT_CONFIG[alerta.tipo]
            if (!config) return null

            return (
              <div
                key={alerta.oportunidad.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 leading-4 shrink-0 ${config.badgeClass}`}
                    >
                      {config.label}
                    </Badge>
                    {alerta.oportunidad.fechaCierreEstimada && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDate(alerta.oportunidad.fechaCierreEstimada)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {alerta.oportunidad.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {alerta.oportunidad.cliente.nombre}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 w-8 p-0"
                  onClick={() =>
                    router.push(
                      `/crm/oportunidades/${alerta.oportunidad.id}`
                    )
                  }
                >
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )
          })}
        </div>

        {/* Show more button */}
        {data.alertas.length > MAX_VISIBLE_ALERTS && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => router.push('/crm/oportunidades?soloActivas=true')}
          >
            Ver todas ({data.resumen.total})
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
