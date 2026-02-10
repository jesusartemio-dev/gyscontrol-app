'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Target, TrendingUp, Users, Activity, PieChart, ChevronRight, BarChart3, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const reportes = [
  {
    id: 'embudo',
    title: 'Embudo de Ventas',
    description: 'Análisis por etapas del pipeline',
    icon: Target,
    color: 'text-green-600',
    route: '/crm/reportes/embudo'
  },
  {
    id: 'rendimiento',
    title: 'Rendimiento',
    description: 'Métricas por comercial',
    icon: TrendingUp,
    color: 'text-purple-600',
    route: '/crm/reportes/rendimiento'
  },
  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Análisis e historial de clientes',
    icon: Users,
    color: 'text-orange-600',
    route: '/crm/reportes/clientes'
  },
  {
    id: 'actividades',
    title: 'Actividades',
    description: 'Historial de actividades comerciales',
    icon: Activity,
    color: 'text-blue-600',
    route: '/crm/actividades'
  },
  {
    id: 'metricas',
    title: 'Métricas',
    description: 'KPIs y métricas avanzadas',
    icon: PieChart,
    color: 'text-red-600',
    route: '/crm/reportes/metricas'
  },
  {
    id: 'forecast',
    title: 'Forecast Ponderado',
    description: 'Proyección de ingresos por probabilidad',
    icon: BarChart3,
    color: 'text-cyan-600',
    route: '/crm/reportes/forecast'
  },
  {
    id: 'win-loss',
    title: 'Win/Loss Analysis',
    description: 'Análisis de oportunidades ganadas vs perdidas',
    icon: Trophy,
    color: 'text-amber-600',
    route: '/crm/reportes/win-loss'
  }
]

export default function CrmReportesPage() {
  const router = useRouter()
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-muted-foreground">Análisis y métricas CRM</p>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {reportes.map((reporte) => {
            const Icon = reporte.icon
            return (
              <div
                key={reporte.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => router.push(reporte.route)}
              >
                <Icon className={`h-5 w-5 ${reporte.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{reporte.title}</p>
                  <p className="text-sm text-muted-foreground">{reporte.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
