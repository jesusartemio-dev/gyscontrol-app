'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  FileText,
  PieChart,
  Activity,
  Target,
  Calendar,
  Download,
  Eye,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ReportType {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  available: boolean
  route?: string
}

const reportTypes: ReportType[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Ejecutivo',
    description: 'Vista general del estado del CRM con métricas principales',
    icon: BarChart3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    available: true,
    route: '/crm'
  },
  {
    id: 'embudo',
    title: 'Reporte del Embudo',
    description: 'Análisis detallado del embudo de ventas por etapas',
    icon: Target,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    available: true,
    route: '/crm/reportes/embudo'
  },
  {
    id: 'rendimiento',
    title: 'Reporte de Rendimiento',
    description: 'Métricas de rendimiento por comercial y tendencias',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    available: true,
    route: '/crm/reportes/rendimiento'
  },
  {
    id: 'clientes',
    title: 'Reporte de Clientes',
    description: 'Análisis de clientes, historial y satisfacción',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    available: true,
    route: '/crm/reportes/clientes'
  },
  {
    id: 'actividades',
    title: 'Reporte de Actividades',
    description: 'Historial completo de actividades comerciales',
    icon: Activity,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    available: true,
    route: '/crm/actividades'
  },
  {
    id: 'metricas',
    title: 'Métricas Detalladas',
    description: 'KPIs y métricas comerciales avanzadas',
    icon: PieChart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    available: true,
    route: '/crm/reportes/metricas'
  }
]

export default function CrmReportesPage() {
  const router = useRouter()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)

  const handleReportClick = (report: ReportType) => {
    if (report.available && report.route) {
      router.push(report.route)
    } else {
      setSelectedReport(report.id)
    }
  }

  const availableReports = reportTypes.filter(r => r.available)
  const upcomingReports = reportTypes.filter(r => !r.available)

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes CRM</h1>
            <p className="text-gray-600 mt-1">Análisis y métricas del sistema CRM</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes Disponibles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableReports.length}</div>
            <p className="text-xs text-muted-foreground">Listos para usar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Desarrollo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{upcomingReports.length}</div>
            <p className="text-xs text-muted-foreground">Próximamente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Hoy</div>
            <p className="text-xs text-muted-foreground">Datos en tiempo real</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exportaciones</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">PDF/Excel</div>
            <p className="text-xs text-muted-foreground">Formatos disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <Tabs defaultValue="disponibles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="disponibles">Reportes Disponibles</TabsTrigger>
          <TabsTrigger value="proximos">Próximamente</TabsTrigger>
        </TabsList>

        <TabsContent value="disponibles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableReports.map((report) => {
              const IconComponent = report.icon
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                      selectedReport === report.id ? 'border-blue-500 shadow-lg' : 'border-transparent'
                    }`}
                    onClick={() => handleReportClick(report)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${report.bgColor}`}>
                          <IconComponent className={`h-6 w-6 ${report.color}`} />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Disponible
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {report.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReportClick(report)
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver Reporte
                        </Button>
                        <ArrowRight className={`h-4 w-4 ${report.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="proximos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingReports.map((report) => {
              const IconComponent = report.icon
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="opacity-75 border-dashed">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${report.bgColor} opacity-50`}>
                          <IconComponent className={`h-6 w-6 ${report.color} opacity-50`} />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          En Desarrollo
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {report.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          Próximamente disponible
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Information Section */}
      <motion.div
        className="mt-8 p-6 bg-muted/50 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Información sobre Reportes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium mb-2">Reportes Disponibles</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Embudo:</strong> Análisis del embudo de ventas</li>
              <li>• <strong>Rendimiento:</strong> Métricas por comercial</li>
              <li>• <strong>Actividades:</strong> Historial de interacciones</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Próximas Funcionalidades</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Dashboard ejecutivo con gráficos</li>
              <li>• Reporte detallado de clientes</li>
              <li>• Métricas avanzadas y KPIs</li>
              <li>• Exportación automática</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}