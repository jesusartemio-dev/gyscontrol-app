// ===================================================
// 📁 Archivo: page.tsx
// 📍 Ubicación: src/app/proyectos/[id]/equipos/listas-integradas/
// 🔧 Descripción: Página de gestión de listas técnicas de equipos - VISTA INTEGRADA
//
// 🎨 Vista Integrada:
// - Todas las listas con sus detalles en una sola página
// - Componentes expandibles para gestión completa
// - Ideal para proyectos pequeños/medianos
// - UX/UI optimizada para vista completa
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { getProyectoById } from '@/lib/services/proyecto'
import {
  getListaEquiposPorProyecto,
  createListaEquipo,
} from '@/lib/services/listaEquipo'
import type {
  Proyecto,
  ListaEquipo,
  ListaEquipoPayload,
} from '@/types'
import ListaEquipoMasterView from '@/components/proyectos/ListaEquipoMasterView'
import ModalAgregarItemDesdeEquipo from '@/components/equipos/ModalAgregarItemDesdeEquipo'
import ModalCrearListaEquipo from '@/components/equipos/ModalCrearListaEquipo'
import SessionDebug from '@/components/debug/SessionDebug'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ChevronRight, 
  ClipboardList, 
  Plus, 
  AlertCircle,
  FileText,
  Settings,
  BarChart3,
  Layers
} from 'lucide-react'
import { toast } from 'sonner'

// Helper functions for UI enhancements
const getStatusVariant = (estado: string): "default" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'activo': return 'default'
    case 'completado': return 'default'
    case 'pausado': return 'outline'
    case 'cancelado': return 'outline'
    default: return 'outline'
  }
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function ListaEquipoIntegradaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [modalListaId, setModalListaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getProyectoById(id)
        setProyecto(data)
        const le = await getListaEquiposPorProyecto(id)
        setListas(le)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Error al cargar los datos del proyecto')
        toast.error('Error al cargar los datos del proyecto')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleCreate = async (payload: ListaEquipoPayload) => {
    try {
      const nueva = await createListaEquipo(payload)
      if (nueva) {
        setListas((prev) => [...prev, nueva])
        toast.success('Lista creada exitosamente')
      }
    } catch (err) {
      toast.error('No se pudo crear la lista')
    }
  }

  const handleAgregarEquipos = (listaId: string) => {
    setModalListaId(listaId)
  }

  const handleRefreshListas = async () => {
    const nuevasListas = await getListaEquiposPorProyecto(id)
    setListas(nuevasListas)
  }

  // Loading State
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Intentar nuevamente
          </Button>
        </motion.div>
      </div>
    )
  }

  // Project not found
  if (!proyecto) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proyecto no encontrado</h2>
          <p className="text-gray-600 mb-6">No se pudo encontrar el proyecto solicitado</p>
          <Button onClick={() => router.push('/proyectos')}>
            Volver a Proyectos
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header Section */}
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/proyectos')}
              className="hover:text-foreground"
            >
              Proyectos
            </Button>
            <ChevronRight className="h-4 w-4" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/proyectos/${id}`)}
              className="hover:text-foreground"
            >
              {proyecto.nombre}
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">Listas Integradas</span>
          </nav>

          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Layers className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Listas de Equipos - Vista Integrada
                  </h1>
                  <p className="text-lg text-gray-600">{proyecto.nombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(proyecto.estado || '')}>
                  {proyecto.estado || 'Sin estado'}
                </Badge>
                {proyecto.fechaInicio && (
                  <span className="text-sm text-gray-500">
                    Inicio: {formatDate(proyecto.fechaInicio)}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats and Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Quick Stats */}
              <div className="flex gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Listas</p>
                      <p className="text-2xl font-bold text-gray-900">{listas.length}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Activas</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {listas.filter(l => l.estado === 'borrador' || l.estado === 'por_revisar').length}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* View Toggle Button */}
              <div className="flex items-center">
                <Button
                  onClick={() => router.push(`/proyectos/${id}/equipos/listas`)}
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                >
                  <ClipboardList className="h-4 w-4" />
                  Vista Master-Detail
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Content Section */}
        <div className="space-y-8">
          {/* Lists Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    Gestión de Listas - Vista Integrada
                  </CardTitle>
                  
                  {/* ✅ Modal button for creating new list */}
                  <ModalCrearListaEquipo
                    proyectoId={id}
                    onCreated={(formPayload: ListaEquipoPayload) => handleCreate(formPayload)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {listas.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No hay listas técnicas
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Crea tu primera lista técnica para comenzar a gestionar los equipos del proyecto.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Debug de sesión - Solo en desarrollo */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mb-6">
                        <SessionDebug />
                      </div>
                    )}
                    
                    <ListaEquipoMasterView
                      proyectoId={id}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Modal for adding equipment */}
        {modalListaId && (
          <ModalAgregarItemDesdeEquipo
            isOpen={!!modalListaId}
            proyectoId={id}
            listaId={modalListaId}
            onClose={() => setModalListaId(null)}
            onCreated={handleRefreshListas}
          />
        )}
      </motion.div>
    </div>
  )
}