import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Home,
  ChevronRight,
  BarChart3,
  Package,
  PieChart,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Reportes | GYS',
  description: 'Reportes operativos del sistema GYS',
}

export const dynamic = 'force-dynamic'

const reportes = [
  {
    titulo: 'Dashboard de Pedidos',
    descripcion: 'Métricas de trazabilidad, entregas y eficiencia de pedidos con filtros por proyecto, proveedor y estado.',
    icono: Package,
    href: '/gestion/reportes/pedidos',
    color: 'bg-blue-100 text-blue-600',
    roles: ['admin', 'gerente', 'comercial', 'proyectos', 'logistica', 'logistico', 'gestor'],
  },
  {
    titulo: 'Rentabilidad por Proyecto',
    descripcion: 'Análisis P&L (Ganancia/Pérdida): ingresos vs costos reales, margen bruto y comparativa presupuesto vs real por proyecto.',
    icono: TrendingUp,
    href: '/gestion/reportes/rentabilidad',
    color: 'bg-emerald-100 text-emerald-600',
    roles: ['admin', 'gerente', 'gestor'],
  },
  {
    titulo: 'Curva S',
    descripcion: 'Avance planificado vs real (EVM). Detecta desviaciones con SPI y Schedule Variance semanales.',
    icono: TrendingUp,
    href: '/gestion/reportes/curva-s',
    color: 'bg-orange-100 text-orange-600',
    roles: ['admin', 'gerente', 'gestor', 'coordinador'],
  },
  {
    titulo: 'KPIs de Gestión',
    descripcion: '12 indicadores clave organizados en 4 cuadrantes: Comercial, Proyectos, Logística y Financiero.',
    icono: PieChart,
    href: '/gestion',
    color: 'bg-cyan-100 text-cyan-600',
    roles: ['admin', 'gerente', 'gestor', 'comercial', 'proyectos', 'logistico', 'coordinador'],
  },
]

export default async function ReportesPage() {
  const session = await getServerSession(authOptions)
  if (!session) notFound()

  const userRole = (session.user?.role as string) || ''
  const allowedRoles = ['admin', 'gerente', 'gestor', 'comercial', 'proyectos', 'logistica', 'logistico', 'coordinador']
  if (!allowedRoles.includes(userRole)) notFound()

  const reportesVisibles = reportes.filter(r => r.roles.includes(userRole))

  return (
    <div className="p-4 space-y-3">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion" className="hover:text-foreground transition-colors">
          Gestión
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Reportes</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Reportes operativos y dashboards del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportesVisibles.map((reporte) => {
          const Icon = reporte.icono
          return (
            <Link key={reporte.href} href={reporte.href}>
              <Card className="transition-all duration-200 hover:shadow-md hover:border-blue-200 cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${reporte.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{reporte.titulo}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm mb-3">
                    {reporte.descripcion}
                  </CardDescription>
                  <Button size="sm" variant="outline" className="group text-xs">
                    Ver reporte
                    <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {reportesVisibles.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Tu rol ({userRole}) no tiene acceso a reportes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
