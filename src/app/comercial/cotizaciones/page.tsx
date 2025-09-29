'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ChevronRight, 
  FileText, 
  Plus, 
  Download, 
  Share2, 
  DollarSign,
  Calendar,
  TrendingUp,
  Loader2,
  Activity,
  Package,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import CotizacionModal from '@/components/cotizaciones/CotizacionModal'
import CotizacionList from '@/components/cotizaciones/CotizacionList'
import { getCotizaciones } from '@/lib/services/cotizacion'
import type { Cotizacion } from '@/types'

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getStatusVariant = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'aprobada': return 'default'
    case 'enviada': return 'secondary'
    case 'borrador': return 'outline'
    case 'rechazada': return 'destructive'
    default: return 'outline'
  }
}

export default function CotizacionesPage() {
  const router = useRouter()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCotizaciones()
      .then((data) => {
        // No recalculamos los totales aquí porque la API ya los devuelve correctos
        // Solo usamos calcularTotal cuando tenemos los arrays completos de items
        setCotizaciones(data)
      })
      .catch(() => setError('Error al cargar cotizaciones.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (nueva: Cotizacion) => {
    setCotizaciones(prev => [...prev, nueva])
  }

  const handleDelete = (id: string) => {
    setCotizaciones(prev => prev.filter(c => c.id !== id))
  }

  const handleUpdated = (actualizada: Cotizacion) => {
    setCotizaciones(prev =>
      prev.map(c => c.id === actualizada.id ? actualizada : c)
    )
  }

  // Calculate statistics
  const totalCotizaciones = cotizaciones.length
  const cotizacionesAprobadas = cotizaciones.filter(c => c.estado?.toLowerCase() === 'aprobada').length
  const cotizacionesEnviadas = cotizaciones.filter(c => c.estado?.toLowerCase() === 'enviada').length
  const cotizacionesBorrador = cotizaciones.filter(c => c.estado?.toLowerCase() === 'borrador').length
  const montoTotal = cotizaciones.reduce((sum, c) => sum + (c.grandTotal || 0), 0)
  const promedioMonto = totalCotizaciones > 0 ? montoTotal / totalCotizaciones : 0
  
  // 📊 Métricas de trazabilidad
  const tasaAprobacion = totalCotizaciones > 0 ? (cotizacionesAprobadas / totalCotizaciones) * 100 : 0
  const cotizacionesActivas = cotizacionesEnviadas + cotizacionesBorrador

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-6 bg-gray-200 rounded w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        
        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header with Breadcrumb */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/comercial')}
            className="h-auto p-0 font-normal"
          >
            Comercial
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Cotizaciones</span>
        </nav>

        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Gestión de Cotizaciones
            </h1>
            <p className="text-muted-foreground">
              Administra y gestiona todas las cotizaciones del sistema
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/gestion/reportes/cotizaciones')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Reportes
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </motion.div>

      <Separator />

      {/* Statistics Cards */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Primera fila de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cotizaciones</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCotizaciones}</div>
              <p className="text-xs text-muted-foreground">
                Cotizaciones registradas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{cotizacionesAprobadas}</div>
              <p className="text-xs text-muted-foreground">
                {totalCotizaciones > 0 ? `${Math.round((cotizacionesAprobadas / totalCotizaciones) * 100)}%` : '0%'} del total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(montoTotal)}</div>
              <p className="text-xs text-muted-foreground">
                Valor total de cotizaciones
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa Aprobación</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{tasaAprobacion.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Porcentaje de aprobación
              </p>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-6"
      >
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Cotizaciones
            </h2>
            <p className="text-gray-600 mt-1">
              Gestiona y administra todas las cotizaciones del sistema
            </p>
          </div>
          <CotizacionModal onCreated={handleCreated} />
        </div>

        {/* List Section */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            {error ? (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">Error al cargar</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reintentar
                </Button>
              </motion.div>
            ) : cotizaciones.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay cotizaciones disponibles
                </h3>
                <p className="text-gray-500 mb-4">
                  Comienza creando tu primera cotización
                </p>
                <CotizacionModal
                  onCreated={handleCreated}
                  trigger={
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Cotización
                    </Button>
                  }
                />
              </div>
            ) : (
              <CotizacionList
                cotizaciones={cotizaciones}
                onDelete={handleDelete}
                onUpdated={handleUpdated}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
