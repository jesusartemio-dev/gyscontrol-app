'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MetricasCards from './MetricasCards'
import EmbudoChart from './EmbudoChart'
import ActividadesRecientes from './ActividadesRecientes'
import AlertasCrmWidget from './AlertasCrmWidget'

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
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadDashboardData} variant="outline" size="sm" className="mt-3">
          Reintentar
        </Button>
      </div>
    )
  }

  if (!dashboardData) return null

  return (
    <div className="p-4 space-y-4">
      {/* Header minimalista */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard CRM</h1>
          <p className="text-sm text-muted-foreground">Resumen comercial</p>
        </div>
        <Button
          onClick={loadDashboardData}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Métricas principales */}
      <MetricasCards resumen={dashboardData.resumen} />

      {/* Alertas CRM */}
      <AlertasCrmWidget />

      {/* Embudo y Actividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmbudoChart embudo={dashboardData.embudo} />
        <ActividadesRecientes actividades={dashboardData.actividadesRecientes} />
      </div>
    </div>
  )
}
