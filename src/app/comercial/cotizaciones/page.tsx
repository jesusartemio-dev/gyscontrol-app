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
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import CotizacionForm from '@/components/cotizaciones/CotizacionForm'
import CotizacionList from '@/components/cotizaciones/CotizacionList'
import { getCotizaciones } from '@/lib/services/cotizacion'
import { calcularTotal } from '@/lib/utils/costos'
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
        const actualizadas = data.map(c => ({
          ...c,
          ...calcularTotal(c)
        }))
        setCotizaciones(actualizadas)
      })
      .catch(() => setError('Error al cargar cotizaciones.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (nueva: Cotizacion) => {
    setCotizaciones(prev => [...prev, { ...nueva, ...calcularTotal(nueva) }])
  }

  const handleDelete = (id: string) => {
    setCotizaciones(prev => prev.filter(c => c.id !== id))
  }

  const handleUpdated = (actualizada: Cotizacion) => {
    setCotizaciones(prev =>
      prev.map(c => c.id === actualizada.id ? { ...actualizada, ...calcularTotal(actualizada) } : c)
    )
  }

  // Calculate statistics
  const totalCotizaciones = cotizaciones.length
  const cotizacionesAprobadas = cotizaciones.filter(c => c.estado?.toLowerCase() === 'aprobada').length
  const montoTotal = cotizaciones.reduce((sum, c) => sum + (c.grandTotal || 0), 0)
  const promedioMonto = totalCotizaciones > 0 ? montoTotal / totalCotizaciones : 0

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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
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
              <CardTitle className="text-sm font-medium">Promedio</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(promedioMonto)}</div>
              <p className="text-xs text-muted-foreground">
                Monto promedio por cotización
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nueva Cotización
              </CardTitle>
              <CardDescription>
                Completa el formulario para crear una nueva cotización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CotizacionForm onCreated={handleCreated} />
            </CardContent>
          </Card>
        </motion.div>

        {/* List Section */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Lista de Cotizaciones</CardTitle>
              <CardDescription>
                Gestiona y revisa todas las cotizaciones existentes
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No hay cotizaciones</h3>
                  <p className="text-muted-foreground mb-6">
                    Comienza creando tu primera cotización usando el formulario de la izquierda.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      💡 Tip: Completa todos los campos requeridos
                    </Badge>
                  </div>
                </motion.div>
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
      </div>
    </motion.div>
  )
}
