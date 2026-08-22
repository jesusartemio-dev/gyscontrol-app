import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Clock,
  DollarSign,
  Home,
  LayoutGrid,
  Package,
  PieChart,
  TrendingUp,
  Users,
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
    roles: ['admin', 'gerente', 'comercial', 'proyectos', 'logistica', 'logistico', 'coordinador_logistico', 'gestor'],
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
    titulo: 'Productividad del personal',
    descripcion: 'En qué se va el tiempo de cada persona: proyectos de cliente (costo directo) contra centros de costo internos (costo indirecto), mes a mes y en soles.',
    icono: Users,
    href: '/gestion/reportes/productividad',
    color: 'bg-teal-100 text-teal-600',
    roles: ['admin', 'gerente', 'gestor', 'coordinador'],
  },
  {
    titulo: 'Avance de la cartera',
    descripcion: 'Todos los proyectos en una tabla: avance real, horas consumidas, trabajo fuera del plan, eficiencia y qué le falta a cada uno para que su curva sea fiable.',
    icono: LayoutGrid,
    href: '/gestion/reportes/cartera',
    color: 'bg-indigo-100 text-indigo-600',
    roles: ['admin', 'gerente', 'gestor', 'coordinador'],
  },
  {
    titulo: 'Curva S Avance',
    descripcion: 'Avance físico planificado (línea base) vs real (snapshots semanales). % por semana e índice de avance.',
    icono: TrendingUp,
    href: '/gestion/reportes/curva-s-avance',
    color: 'bg-green-100 text-green-600',
    roles: ['admin', 'gerente', 'gestor', 'coordinador'],
  },
  {
    titulo: 'Puntualidad del registro',
    descripcion: 'Con qué rapidez llega el dato que alimenta la curva de avance: cobertura de timesheets, días en cerrar jornadas y jornadas pendientes.',
    icono: Clock,
    href: '/gestion/reportes/puntualidad-registro',
    color: 'bg-sky-100 text-sky-600',
    roles: ['admin', 'gerente', 'gestor', 'coordinador'],
  },
  {
    titulo: 'Aging de CxC',
    descripcion: 'Tabla de antigüedad de cuentas por cobrar. Saldos pendientes agrupados por cliente y tramos de vencimiento: vigente, 1-30, 31-60, 61-90 y +90 días.',
    icono: Clock,
    href: '/gestion/reportes/aging-cxc',
    color: 'bg-red-100 text-red-600',
    roles: ['admin', 'gerente', 'administracion'],
  },
  {
    titulo: 'Margen Real',
    descripcion: 'Dashboard de rentabilidad real por proyecto. Cruza ingresos valorizados vs costos reales (equipos, servicios HH y gastos operativos).',
    icono: BarChart3,
    href: '/gestion/reportes/margen-real',
    color: 'bg-emerald-100 text-emerald-600',
    roles: ['admin', 'gerente'],
  },
  {
    titulo: 'Costos Reales',
    descripcion: 'Desglose de costos ejecutados por proyecto: equipos (OC), servicios (HH por usuario) y gastos operativos. Expandible para ver detalle por persona.',
    icono: DollarSign,
    href: '/gestion/reportes/costos-reales',
    color: 'bg-red-100 text-red-600',
    roles: ['admin', 'gerente', 'gestor'],
  },
  {
    titulo: 'KPIs de Gestión',
    descripcion: '12 indicadores clave organizados en 4 cuadrantes: Comercial, Proyectos, Logística y Financiero.',
    icono: PieChart,
    href: '/gestion',
    color: 'bg-cyan-100 text-cyan-600',
    roles: ['admin', 'gerente', 'gestor', 'comercial', 'proyectos', 'logistico', 'coordinador_logistico', 'coordinador'],
  },
]

export default async function ReportesPage() {
  const session = await getServerSession(authOptions)
  if (!session) notFound()

  const userRole = (session.user?.role as string) || ''
  const allowedRoles = ['admin', 'gerente', 'gestor', 'comercial', 'proyectos', 'logistica', 'logistico', 'coordinador_logistico', 'coordinador', 'administracion']
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
