'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, TrendingUp, Users, Activity, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MetricasCards from './MetricasCards'
import EmbudoChart from './EmbudoChart'
import ActividadesRecientes from './ActividadesRecientes'
import { formatCurrency } from '@/lib/utils/plantilla-utils'

interface DashboardData {
  resumen: {
    totalOportunidades: number
    oportunidadesActivas: number
    oportunidadesGanadas: number
    oportunidadesPerdidas: number
    valorTotalEmbudo: number
    valorEmbudoActivo: number
    tasaConversion: number
  }
  embudo: Array<{
    estado: string
    cantidad: number
    valor: number
  }>
  actividadesRecientes: Array<{
    id: string
    tipo: string
    descripcion: string
    fecha: string
    resultado?: string
    oportunidad: {
      nombre: string
      cliente?: { nombre: string }
    }
    usuario: { name?: string }
  }>
  metricasUsuario?: any
  fechaActualizacion: string
}

interface CrmDashboardProps {
  userId?: string
  userRole?: string
}

export default function CrmDashboard({ userId, userRole = 'comercial' }: CrmDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [userId, userRole])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (userRole) params.append('role', userRole)

      const response = await fetch(`/api/crm/dashboard?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar datos del dashboard')
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Error al cargar los datos del dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando dashboard CRM...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={loadDashboardData} variant="outline">
            Intentar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  if (!dashboardData) return null

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
            <Target className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard CRM</h1>
            <p className="text-gray-600 mt-1">Gestión integral de relaciones comerciales</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Última actualización: {new Date(dashboardData.fechaActualizacion).toLocaleTimeString('es-ES')}
          </Badge>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas Principales */}
      <MetricasCards resumen={dashboardData.resumen} />

      {/* Embudo y Actividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmbudoChart embudo={dashboardData.embudo} />
        <ActividadesRecientes actividades={dashboardData.actividadesRecientes} />
      </div>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Acciones Rápidas
          </CardTitle>
          <CardDescription>
            Accede rápidamente a las funciones más utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex flex-col items-center gap-2" variant="outline">
              <Users className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">Nueva Oportunidad</span>
            </Button>
            <Button className="h-20 flex flex-col items-center gap-2" variant="outline">
              <Activity className="h-6 w-6 text-green-600" />
              <span className="text-sm font-medium">Registrar Actividad</span>
            </Button>
            <Button className="h-20 flex flex-col items-center gap-2" variant="outline">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">Ver Reportes</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}