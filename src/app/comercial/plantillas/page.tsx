'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ChevronRight, 
  Package, 
  Plus, 
  FileText, 
  TrendingUp,
  AlertCircle,
  Loader2,
  Share2,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import PlantillaForm from '@/components/plantillas/PlantillaForm'
import PlantillaList from '@/components/plantillas/PlantillaList'
import { getPlantillas } from '@/lib/services/plantilla'
import type { Plantilla } from '@/types'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// Format currency helper
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function PlantillasPage() {
  const router = useRouter()
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlantillas()
      .then((data) => {
        setPlantillas(data)
      })
      .catch(() => setError('Error al cargar plantillas.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (nueva: Plantilla) => {
    setPlantillas((prev) => [
      ...prev,
      nueva
    ])
  }

  const handleDelete = (id: string) => {
    setPlantillas((prev) => prev.filter((p) => p.id !== id))
  }

  const handleUpdated = (actualizada: Plantilla) => {
    setPlantillas((prev) =>
      prev.map((p) =>
        p.id === actualizada.id ? actualizada : p
      )
    )
  }

  // Calculate statistics
  const totalPlantillas = plantillas.length
  const totalValorCliente = plantillas.reduce((sum, p) => sum + (p.totalCliente || 0), 0)
  const totalValorInterno = plantillas.reduce((sum, p) => sum + (p.totalInterno || 0), 0)
  const plantillasActivas = plantillas.filter(p => (p.totalCliente || 0) > 0).length

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded w-32" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2 animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/comercial')}
            className="p-0 h-auto font-normal"
          >
            Comercial
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Plantillas</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold tracking-tight">Gestión de Plantillas</h1>
            </div>
            <p className="text-muted-foreground">
              Administra y organiza las plantillas comerciales del sistema
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

      {/* Statistics Cards */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Plantillas
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlantillas}</div>
            <Badge variant="secondary" className="mt-1">
              {plantillasActivas} activas
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Cliente
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalValorCliente)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor total para clientes
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Interno
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalValorInterno)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Costo interno total
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margen Promedio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalValorInterno > 0 
                ? `${(((totalValorCliente - totalValorInterno) / totalValorInterno) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rentabilidad promedio
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* Error State */}
      {error && (
        <motion.div variants={itemVariants}>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Form Section */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Nueva Plantilla
            </CardTitle>
            <CardDescription>
              Crea una nueva plantilla comercial para el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlantillaForm onCreated={handleCreated} />
          </CardContent>
        </Card>

        {/* List Section */}
        <Card className="lg:col-span-2 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Plantillas Existentes
            </CardTitle>
            <CardDescription>
              Administra y edita las plantillas comerciales disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {plantillas.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay plantillas disponibles
                </h3>
                <p className="text-gray-500 mb-4">
                  Comienza creando tu primera plantilla comercial
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Plantilla
                </Button>
              </div>
            ) : (
              <PlantillaList
                plantillas={plantillas}
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
