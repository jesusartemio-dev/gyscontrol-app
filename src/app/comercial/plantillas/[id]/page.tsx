'use client'

// ===================================================
// 📁 Archivo: [id]/page.tsx
// 📌 Vista de detalle de una plantilla con edición y creación de cotización
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-17 - Mejoras UX/UI aplicadas
// ===================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, Variants } from 'framer-motion'
import {
  getPlantillaById,
  updatePlantillaTotales
} from '@/lib/services/plantilla'
import { deletePlantillaServicio } from '@/lib/services/plantillaServicio'
import { deletePlantillaEquipo } from '@/lib/services/plantillaEquipo'
import { deletePlantillaGasto } from '@/lib/services/plantillaGasto'
import { deletePlantillaGastoItem } from '@/lib/services/plantillaGastoItem'
import PlantillaEquipoModal from '@/components/plantillas/PlantillaEquipoModal'
import PlantillaServicioModal from '@/components/plantillas/PlantillaServicioModal'
import PlantillaGastoForm from '@/components/plantillas/PlantillaGastoForm'
import PlantillaEquipoAccordion from '@/components/plantillas/equipos/PlantillaEquipoAccordion'
import PlantillaServicioAccordion from '@/components/plantillas/PlantillaServicioAccordion'
import PlantillaGastoAccordion from '@/components/plantillas/PlantillaGastoAccordion'
import ResumenTotalesPlantilla from '@/components/plantillas/ResumenTotalesPlantilla'
import CrearCotizacionModal from '@/components/cotizaciones/CrearCotizacionModal'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// Icons
import { 
  Plus, 
  ChevronRight, 
  Share2, 
  Download, 
  Edit, 
  FileText,
  Package,
  Settings,
  AlertCircle,
  Loader2
} from 'lucide-react'

import { calcularSubtotal, calcularTotal } from '@/lib/utils/costos'

import type {
  Plantilla,
  PlantillaEquipoItem,
  PlantillaServicioItem,
  PlantillaGastoItem
} from '@/types'

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
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

const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'activo': 
    case 'active':
      return { variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200' }
    case 'inactivo':
    case 'inactive':
      return { variant: 'secondary' as const, className: 'bg-red-100 text-red-800 border-red-200' }
    case 'borrador':
    case 'draft':
      return { variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    case 'pendiente':
    case 'pending':
      return { variant: 'outline' as const, className: 'bg-blue-100 text-blue-800 border-blue-200' }
    case 'archivado':
    case 'archived':
      return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800 border-gray-200' }
    default: 
      return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
}

export default function PlantillaDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState({ servicio: false, gasto: false })

  useEffect(() => {
    if (typeof id === 'string') {
      getPlantillaById(id)
        .then(setPlantilla)
        .catch(() => setError('❌ Error al cargar la plantilla.'))
    }
  }, [id])

  const actualizarTotalesParciales = (equipos: any[], servicios: any[], gastos: any[]) => {
    const subtotalesEquipos = calcularTotal({ equipos, servicios: [], gastos: [] })
    const subtotalesServicios = calcularTotal({ equipos: [], servicios, gastos: [] })
    const subtotalesGastos = calcularTotal({ equipos: [], servicios: [], gastos })

    const totalInterno = subtotalesEquipos.totalInterno + subtotalesServicios.totalInterno + subtotalesGastos.totalInterno
    const totalCliente = subtotalesEquipos.totalCliente + subtotalesServicios.totalCliente + subtotalesGastos.totalCliente

    return {
      totalEquiposInterno: subtotalesEquipos.totalInterno,
      totalEquiposCliente: subtotalesEquipos.totalCliente,
      totalServiciosInterno: subtotalesServicios.totalInterno,
      totalServiciosCliente: subtotalesServicios.totalCliente,
      totalGastosInterno: subtotalesGastos.totalInterno,
      totalGastosCliente: subtotalesGastos.totalCliente,
      totalInterno,
      totalCliente,
      descuento: plantilla?.descuento ?? 0,
      grandTotal: totalCliente - (plantilla?.descuento ?? 0),
    }
  }

  const actualizarEquipo = (equipoId: string, callback: (items: PlantillaEquipoItem[]) => PlantillaEquipoItem[]) => {
    if (!plantilla) return
    const equiposActualizados = plantilla.equipos.map(e =>
      e.id === equipoId ? { ...e, items: callback(e.items), ...calcularSubtotal(callback(e.items)) } : e
    )
    const nuevosTotales = actualizarTotalesParciales(equiposActualizados, plantilla.servicios, plantilla.gastos)
    setPlantilla({ ...plantilla, equipos: equiposActualizados, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const actualizarServicio = (servicioId: string, callback: (items: PlantillaServicioItem[]) => PlantillaServicioItem[]) => {
    if (!plantilla) return
    const serviciosActualizados = plantilla.servicios.map(s =>
      s.id === servicioId ? { ...s, items: callback(s.items), ...calcularSubtotal(callback(s.items)) } : s
    )
    const nuevosTotales = actualizarTotalesParciales(plantilla.equipos, serviciosActualizados, plantilla.gastos)
    setPlantilla({ ...plantilla, servicios: serviciosActualizados, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const actualizarGasto = (gastoId: string, callback: (items: PlantillaGastoItem[]) => PlantillaGastoItem[]) => {
    if (!plantilla) return
    const gastosActualizados = plantilla.gastos?.map(g =>
      g.id === gastoId ? { ...g, items: callback(g.items), ...calcularSubtotal(callback(g.items)) } : g
    ) || []
    const nuevosTotales = actualizarTotalesParciales(plantilla.equipos, plantilla.servicios, gastosActualizados)
    setPlantilla({ ...plantilla, gastos: gastosActualizados, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }



  const handleEliminarGrupoEquipo = async (id: string) => {
    if (!plantilla) return
    await deletePlantillaEquipo(id)
    const equipos = plantilla.equipos.filter(e => e.id !== id)
    const nuevosTotales = actualizarTotalesParciales(equipos, plantilla.servicios, plantilla.gastos || [])
    setPlantilla({ ...plantilla, equipos, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const handleEliminarGrupoServicio = async (id: string) => {
    if (!plantilla) return
    await deletePlantillaServicio(id)
    const servicios = plantilla.servicios.filter(s => s.id !== id)
    const nuevosTotales = actualizarTotalesParciales(plantilla.equipos, servicios, plantilla.gastos || [])
    setPlantilla({ ...plantilla, servicios, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const handleEliminarGrupoGasto = async (id: string) => {
    if (!plantilla) return
    await deletePlantillaGasto(id)
    const gastos = (plantilla.gastos || []).filter(g => g.id !== id)
    const nuevosTotales = actualizarTotalesParciales(plantilla.equipos, plantilla.servicios, gastos)
    setPlantilla({ ...plantilla, gastos, ...nuevosTotales })
    updatePlantillaTotales(plantilla.id, nuevosTotales)
  }

  const handleEliminarItemGasto = async (gastoId: string, itemId: string) => {
    await deletePlantillaGastoItem(itemId)
    actualizarGasto(gastoId, items => items.filter(i => i.id !== itemId))
  }

  // Loading State
  if (!plantilla && !error) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p className="font-semibold">{error}</p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Additional null check
  if (!plantilla) {
    return null
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gray-50/50"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with Breadcrumb */}
        <motion.div variants={itemVariants}>
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/comercial/plantillas')}
              className="hover:bg-gray-100"
            >
              Plantillas
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{plantilla?.nombre || 'Cargando...'}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{plantilla?.nombre || 'Cargando...'}</h1>
                <Badge 
                  variant={getStatusVariant(plantilla?.estado || 'borrador').variant}
                  className={getStatusVariant(plantilla?.estado || 'borrador').className}
                >
                  {plantilla?.estado || 'Borrador'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Plantilla Comercial
                </span>
                <span>Creada: {formatDate(plantilla?.createdAt || '')}</span>
                <span>Total: {formatCurrency(plantilla?.grandTotal || 0)}</span>
              </div>
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
              <Button size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Financial Summary */}
        <motion.div variants={itemVariants}>
          {plantilla && <ResumenTotalesPlantilla plantilla={plantilla} />}
        </motion.div>

        <Separator />

        {/* Crear Cotización - Simple button at top */}
        <motion.div variants={itemVariants}>
          <div className="flex justify-end mb-6">
            {plantilla && (
              <CrearCotizacionModal 
                plantillaId={plantilla.id}
                onSuccess={(cotizacionId) => router.push(`/comercial/cotizaciones/${cotizacionId}`)}
              />
            )}
          </div>
        </motion.div>

        {/* Equipos Section */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-red-600" />
                    Secciones de Equipos
                  </CardTitle>
                  <CardDescription>
                    Gestiona los grupos de equipos de la plantilla ({plantilla?.equipos?.length || 0} secciones)
                  </CardDescription>
                </div>
                {plantilla && (
                  <PlantillaEquipoModal 
                    plantillaId={plantilla.id}
                    onCreated={nuevo => setPlantilla(p => p ? { ...p, equipos: [...p.equipos, { ...nuevo, items: [] }] } : p)}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>

              
              {(plantilla?.equipos?.length || 0) === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay secciones de equipos
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comienza agregando tu primera sección de equipos
                  </p>
                  {plantilla && (
                    <PlantillaEquipoModal 
                      plantillaId={plantilla.id}
                      onCreated={nuevo => setPlantilla(p => p ? { ...p, equipos: [...p.equipos, { ...nuevo, items: [] }] } : p)}
                      trigger={
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Primera Sección
                        </Button>
                      }
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {(plantilla?.equipos || []).map((e, index) => (
                    <motion.div
                      key={e.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PlantillaEquipoAccordion 
                        key={e.id} 
                        equipo={e} 
                        onItemChange={(items) => actualizarEquipo(e.id, () => items)} 
                        onUpdatedNombre={nuevo => setPlantilla(p => p ? { ...p, equipos: p.equipos.map(eq => eq.id === e.id ? { ...eq, nombre: nuevo } : eq) } : p)} 
                        onDeletedGrupo={() => handleEliminarGrupoEquipo(e.id)} 
                        onChange={(changes) => setPlantilla(p => p ? { ...p, equipos: p.equipos.map(eq => eq.id === e.id ? { ...eq, ...changes } : eq) } : p)} 
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Servicios Section */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    Secciones de Servicios
                  </CardTitle>
                  <CardDescription>
                    Gestiona los grupos de servicios de la plantilla ({plantilla?.servicios?.length || 0} secciones)
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(prev => ({ ...prev, servicio: !prev.servicio }))}
                >
                  <Plus className="mr-2 h-4 w-4" /> 
                  Nuevo Servicio
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plantilla && (
                <PlantillaServicioModal
                  plantillaId={plantilla.id}
                  isOpen={showForm.servicio}
                  onClose={() => setShowForm(prev => ({ ...prev, servicio: false }))}
                  onCreated={nuevo => setPlantilla(p => p ? { ...p, servicios: [...p.servicios, { ...nuevo, items: [] }] } : p)}
                />
              )}
              
              {(plantilla?.servicios?.length || 0) === 0 ? (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay secciones de servicios
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comienza agregando tu primera sección de servicios
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setShowForm(prev => ({ ...prev, servicio: true }))}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Sección
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(plantilla?.servicios || []).map((s, index) => (
                    <motion.div
                      key={s.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PlantillaServicioAccordion 
                        key={s.id} 
                        servicio={s} 
                        onCreated={i => actualizarServicio(s.id, items => [...items, i])} 
                        onDeleted={id => actualizarServicio(s.id, items => items.filter(i => i.id !== id))} 
                        onUpdated={item => actualizarServicio(s.id, items => items.map(i => i.id === item.id ? item : i))} 
                        onDeletedGrupo={() => handleEliminarGrupoServicio(s.id)} 
                        onUpdatedNombre={nuevo => setPlantilla(p => p ? { ...p, servicios: p.servicios.map(se => se.id === s.id ? { ...se, nombre: nuevo } : se) } : p)} 
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Gastos Section */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    Secciones de Gastos
                  </CardTitle>
                  <CardDescription>
                    Gestiona los grupos de gastos de la plantilla ({plantilla?.gastos?.length || 0} secciones)
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(prev => ({ ...prev, gasto: !prev.gasto }))}
                >
                  <Plus className="mr-2 h-4 w-4" /> 
                  Nuevo Gasto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showForm.gasto && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  {plantilla && (
                    <PlantillaGastoForm 
                      plantillaId={plantilla.id} 
                      onCreated={nuevo => setPlantilla(p => p ? { ...p, gastos: [...(p.gastos || []), { ...nuevo, items: [] }] } : p)} 
                    />
                  )}
                </motion.div>
              )}
              
              {(!plantilla?.gastos || (plantilla?.gastos?.length || 0) === 0) ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay secciones de gastos
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comienza agregando tu primera sección de gastos
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setShowForm(prev => ({ ...prev, gasto: true }))}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Sección
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(plantilla?.gastos || []).map((g, index) => (
                    <motion.div
                      key={g.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PlantillaGastoAccordion 
                        key={g.id} 
                        gasto={g} 
                        onCreated={i => actualizarGasto(g.id, items => [...items, i])} 
                        onUpdated={(id, changes) => actualizarGasto(g.id, items => items.map(i => i.id === id ? { ...i, ...changes } : i))} 
                        onDeleted={id => handleEliminarItemGasto(g.id, id)} 
                        onDeletedGrupo={() => handleEliminarGrupoGasto(g.id)} 
                        onUpdatedNombre={nuevo => setPlantilla(p => p ? { ...p, gastos: p.gastos.map(ga => ga.id === g.id ? { ...ga, nombre: nuevo } : ga) } : p)} 
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
       </div>
     </motion.div>
   )
 }
