'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  Package,
  Plus,
  FileText,
  AlertCircle,
  Loader2,
  Share2,
  Download,
  Wrench,
  Truck,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import PlantillaModal from '@/components/plantillas/PlantillaModal'
import PlantillaModalEquipos from '@/components/plantillas/PlantillaModalEquipos'
import PlantillaModalServicios from '@/components/plantillas/PlantillaModalServicios'
import PlantillaModalGastos from '@/components/plantillas/PlantillaModalGastos'
import PlantillasView from '@/components/plantillas/PlantillasView'
import { getPlantillas, getPlantillasEquipos, getPlantillasServicios, getPlantillasGastos } from '@/lib/services/plantilla'
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

type TemplateFilter = 'todas' | 'completas' | 'equipos' | 'servicios' | 'gastos'

export default function PlantillasPage() {
  const router = useRouter()
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [plantillasEquipos, setPlantillasEquipos] = useState<any[]>([])
  const [plantillasServicios, setPlantillasServicios] = useState<any[]>([])
  const [plantillasGastos, setPlantillasGastos] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<TemplateFilter>('todas')

  useEffect(() => {
    const loadAllTemplates = async () => {
      try {
        setLoading(true)
        const [general, equipos, servicios, gastos] = await Promise.all([
          getPlantillas(),
          getPlantillasEquipos(),
          getPlantillasServicios(),
          getPlantillasGastos()
        ])

        // Add tipo field to templates loaded from APIs
        const generalWithTipo = general.map((p: any) => ({ ...p, tipo: p.tipo || 'completa' }))
        const equiposWithTipo = equipos.map((p: any) => ({ ...p, tipo: 'equipos' }))
        const serviciosWithTipo = servicios.map((p: any) => ({ ...p, tipo: 'servicios' }))
        const gastosWithTipo = gastos.map((p: any) => ({ ...p, tipo: 'gastos' }))


        setPlantillas(generalWithTipo)
        setPlantillasEquipos(equiposWithTipo)
        setPlantillasServicios(serviciosWithTipo)
        setPlantillasGastos(gastosWithTipo)
      } catch (error) {
        console.error('Error loading templates:', error)
        setError('Error al cargar plantillas.')
      } finally {
        setLoading(false)
      }
    }

    loadAllTemplates()
  }, [])

  const handleCreated = (nueva: any, tipo?: 'equipos' | 'servicios' | 'gastos') => {
    // Add to the appropriate state based on template type
    // If tipo is specified, it's a specific template type
    if (tipo === 'equipos') {
      setPlantillasEquipos((prev) => [...prev, { ...nueva, tipo: 'equipos' }])
    } else if (tipo === 'servicios') {
      setPlantillasServicios((prev) => [...prev, { ...nueva, tipo: 'servicios' }])
    } else if (tipo === 'gastos') {
      setPlantillasGastos((prev) => [...prev, { ...nueva, tipo: 'gastos' }])
    } else {
      // Main template - only add to completas
      setPlantillas((prev) => [...prev, nueva])
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // Use the unified API that handles all template types
      const response = await fetch(`/api/plantilla/${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('Error al eliminar plantilla')
      }

      // Remove from all states to ensure it's deleted regardless of current filter
      setPlantillas((prev) => prev.filter((p) => p.id !== id))
      setPlantillasEquipos((prev) => prev.filter((p) => p.id !== id))
      setPlantillasServicios((prev) => prev.filter((p) => p.id !== id))
      setPlantillasGastos((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error deleting template:', error)
      // You might want to show a toast notification here
    }
  }

  const handleUpdated = (actualizada: any) => {
    // Update in all arrays to ensure the template is updated regardless of where it is
    setPlantillas((prev) =>
      prev.map((p) => p.id === actualizada.id ? actualizada : p)
    )
    setPlantillasEquipos((prev) =>
      prev.map((p) => p.id === actualizada.id ? actualizada : p)
    )
    setPlantillasServicios((prev) =>
      prev.map((p) => p.id === actualizada.id ? actualizada : p)
    )
    setPlantillasGastos((prev) =>
      prev.map((p) => p.id === actualizada.id ? actualizada : p)
    )
  }

  const handleEdit = (id: string, currentName: string) => {
    const newName = prompt('Editar nombre de plantilla:', currentName)
    if (newName && newName.trim() && newName.trim() !== currentName) {
      // Find the template and update it
      const template = getCurrentTemplates().find(p => p.id === id)
      if (template) {
        handleUpdated({ ...template, nombre: newName.trim() })
      }
    }
  }

  // Get current templates based on filter
  const getCurrentTemplates = () => {
    switch (activeFilter) {
      case 'completas':
        // Solo plantillas completas (tipo undefined o 'completa')
        return plantillas.filter(p => !p.tipo || p.tipo === 'completa')
      case 'equipos':
        // Solo plantillas específicas de equipos
        return plantillasEquipos.filter(p => p.tipo === 'equipos')
      case 'servicios':
        // Solo plantillas específicas de servicios
        return plantillasServicios.filter(p => p.tipo === 'servicios')
      case 'gastos':
        // Solo plantillas específicas de gastos
        return plantillasGastos.filter(p => p.tipo === 'gastos')
      default:
        // Para 'todas', combinar todas sin duplicados
        const completas = plantillas.filter(p => !p.tipo || p.tipo === 'completa')
        const equiposEspecificos = plantillasEquipos.filter(p => p.tipo === 'equipos')
        const serviciosEspecificos = plantillasServicios.filter(p => p.tipo === 'servicios')
        const gastosEspecificos = plantillasGastos.filter(p => p.tipo === 'gastos')

        const allTemplates = [...completas, ...equiposEspecificos, ...serviciosEspecificos, ...gastosEspecificos]
        const uniqueTemplates = allTemplates.filter((template, index, self) =>
          index === self.findIndex(t => t.id === template.id)
        )
        return uniqueTemplates
    }
  }

  // Calculate filtered counts for each type
  const completasCount = plantillas.filter(p => !p.tipo || p.tipo === 'completa').length
  const equiposCount = plantillasEquipos.filter(p => p.tipo === 'equipos').length
  const serviciosCount = plantillasServicios.filter(p => p.tipo === 'servicios').length
  const gastosCount = plantillasGastos.filter(p => p.tipo === 'gastos').length
  const todasCount = completasCount + equiposCount + serviciosCount + gastosCount

  // Calculate statistics based on current filter
  const currentTemplates = getCurrentTemplates()
  const totalPlantillas = currentTemplates.length
  const totalValorCliente = currentTemplates.reduce((sum, p) => sum + (p.totalCliente || p.grandTotal || 0), 0)
  const totalValorInterno = currentTemplates.reduce((sum, p) => sum + (p.totalInterno || 0), 0)
  const plantillasActivas = currentTemplates.filter(p => (p.totalCliente || p.grandTotal || 0) > 0).length

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

      {/* Quick Create Section */}
      <motion.div
        variants={itemVariants}
        className="space-y-4"
      >
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Crear Nueva Plantilla</h2>
          <p className="text-gray-600 text-sm">
            Elige el tipo de plantilla que deseas crear según tus necesidades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Plantilla Completa */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-300">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Plantilla Completa</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Equipos, servicios y gastos en una sola plantilla
              </p>
              <PlantillaModal
                onCreated={(nueva) => {
                  handleCreated(nueva);
                  router.push(`/comercial/plantillas/${nueva.id}`);
                }}
                trigger={
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear
                  </Button>
                }
              />
            </CardContent>
          </Card>

          {/* Plantilla de Equipos */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-orange-300">
            <CardContent className="p-6 text-center">
              <Wrench className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Plantilla de Equipos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Solo equipos y maquinaria especializada
              </p>
              <PlantillaModalEquipos
                onCreated={(nueva) => {
                  handleCreated(nueva, 'equipos');
                  // Redirect to equipment-specific page using Next.js router
                  router.push(`/comercial/plantillas/equipos/${nueva.id}`);
                }}
              />
            </CardContent>
          </Card>

          {/* Plantilla de Servicios */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-green-300">
            <CardContent className="p-6 text-center">
              <Truck className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Plantilla de Servicios</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Solo servicios profesionales y técnicos
              </p>
              <PlantillaModalServicios
                onCreated={(nueva) => {
                  handleCreated(nueva, 'servicios');
                  // Redirect to services-specific page using Next.js router
                  router.push(`/comercial/plantillas/servicios/${nueva.id}`);
                }}
              />
            </CardContent>
          </Card>

          {/* Plantilla de Gastos */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-purple-300">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Plantilla de Gastos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Solo gastos adicionales y costos operativos
              </p>
              <PlantillaModalGastos />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <Separator />

      {/* Filter Tabs - Below creation cards */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeFilter === 'todas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('todas')}
          className="flex items-center gap-2"
        >
          <Package className="h-4 w-4" />
          Todas ({todasCount})
        </Button>
        <Button
          variant={activeFilter === 'completas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('completas')}
          className="flex items-center gap-2"
        >
          <Package className="h-4 w-4" />
          Completas ({completasCount})
        </Button>
        <Button
          variant={activeFilter === 'equipos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('equipos')}
          className="flex items-center gap-2"
        >
          <Wrench className="h-4 w-4" />
          Equipos ({equiposCount})
        </Button>
        <Button
          variant={activeFilter === 'servicios' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('servicios')}
          className="flex items-center gap-2"
        >
          <Truck className="h-4 w-4" />
          Servicios ({serviciosCount})
        </Button>
        <Button
          variant={activeFilter === 'gastos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('gastos')}
          className="flex items-center gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Gastos ({gastosCount})
        </Button>
      </motion.div>

      <Separator />

      {/* Main Content */}
      <motion.div
        variants={itemVariants}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-green-600" />
              Plantillas Comerciales
            </h2>
            <p className="text-gray-600 mt-1">
              Administra y edita las plantillas comerciales disponibles
            </p>
          </div>
        </div>

        {/* List Section */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            {todasCount === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay plantillas disponibles
                </h3>
                <p className="text-gray-500 mb-4">
                  Comienza creando tu primera plantilla comercial
                </p>
                <PlantillaModal
                  onCreated={(nueva) => {
                    handleCreated(nueva);
                    router.push(`/comercial/plantillas/${nueva.id}`);
                  }}
                  trigger={
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Plantilla
                    </Button>
                  }
                />
              </div>
            ) : (
              <PlantillasView
                plantillas={currentTemplates}
                filterType={activeFilter}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
