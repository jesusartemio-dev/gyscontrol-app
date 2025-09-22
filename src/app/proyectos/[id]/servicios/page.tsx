// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/[id]/servicios/page.tsx
// 🔧 Descripción: Página de gestión de servicios del proyecto
// 🎨 Vista simplificada con navegación a gestión detallada
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

import { getProyectoById } from '@/lib/services/proyecto'
import type { Proyecto } from '@/types'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import {
  ChevronRight,
  Settings,
  AlertCircle,
  Home,
  ArrowLeft
} from 'lucide-react'

import ProyectoServicioAccordion from '@/components/proyectos/ProyectoServicioAccordion'

export default function ServiciosProyectoPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const router = useRouter()

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (proyectoId) {
      cargarDatos()
    }
  }, [proyectoId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      const proyectoData = await getProyectoById(proyectoId)
      setProyecto(proyectoData)
    } catch (err) {
      setError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !proyecto) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto p-6"
      >
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar los datos</h3>
            <p className="text-red-600 mb-4 text-center">{error}</p>
            <Button onClick={() => router.push(`/proyectos/${proyectoId}`)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Proyecto
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-6 space-y-6"
    >
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/proyectos')}>
          Proyectos
        </Button>
        <ChevronRight className="h-4 w-4" />
        <Button variant="ghost" size="sm" onClick={() => router.push(`/proyectos/${proyectoId}`)}>
          {proyecto.nombre}
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Servicios</span>
      </nav>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8 text-purple-600" />
            Servicios del Proyecto
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
              {proyecto.estado || 'Sin estado'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/proyectos/${proyectoId}`)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Proyecto
          </Button>
        </div>
      </motion.div>

      {/* Services Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Servicios Registrados
        </h2>

        {proyecto.servicios && proyecto.servicios.length > 0 ? (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {proyecto.servicios.map((servicio, index) => (
              <motion.div
                key={servicio.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                transition={{ delay: index * 0.1 }}
              >
                <ProyectoServicioAccordion
                  servicio={servicio}
                  onUpdatedItem={() => cargarDatos()}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay servicios registrados</h3>
              <p className="text-gray-600 mb-4 text-center">
                Los servicios del proyecto aparecerán aquí una vez que sean agregados.
              </p>
              <Button onClick={() => router.push(`/proyectos/${proyectoId}`)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Proyecto
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  )
}