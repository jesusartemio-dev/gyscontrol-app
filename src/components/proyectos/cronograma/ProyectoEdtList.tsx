// ===================================================
// 📁 Archivo: ProyectoEdtList.tsx
// 📌 Ubicación: src/components/proyectos/cronograma/ProyectoEdtList.tsx
// 🔧 Descripción: Componente para listar y gestionar EDTs de proyecto
// 🎯 Funcionalidades: Visualización, creación, edición y eliminación de EDTs
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  XCircle,
  PauseCircle,
  Target,
  Calendar,
  User,
  BarChart3,
  GripVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { ProyectoEdtForm } from './ProyectoEdtForm'
import { SortableList } from '@/components/ui/sortable-list'
import { useSortableList } from '@/hooks/useSortableList'
import type { ProyectoEdt } from '@/types/modelos'

interface ProyectoEdtListProps {
  proyectoId: string
  faseId?: string
  cronogramaId?: string
  onEdtSelect?: (edt: ProyectoEdt) => void
  onEdtCreate?: () => void
  onEdtEdit?: (edt: ProyectoEdt) => void
  onEdtDelete?: (edtId: string) => void
}

export function ProyectoEdtList({
  proyectoId,
  faseId,
  cronogramaId,
  onEdtSelect,
  onEdtCreate,
  onEdtEdit,
  onEdtDelete
}: ProyectoEdtListProps) {
  const [edts, setEdts] = useState<ProyectoEdt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEdtId, setSelectedEdtId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEdt, setEditingEdt] = useState<ProyectoEdt | null>(null)

  // Hook para manejar reordenamiento
  const { reorderItems, isReordering } = useSortableList({
    proyectoId,
    tipo: 'edt',
    parentId: faseId,
    cronogramaId
  })

  useEffect(() => {
    loadEdts()
  }, [proyectoId, faseId, cronogramaId])

  const loadEdts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/edt?faseId=${faseId || ''}&cronogramaId=${cronogramaId || ''}`)

      if (!response.ok) {
        // If API doesn't exist or returns error, show empty state
        console.warn('EDTs API not available or error:', response.status)
        setEdts([])
        return
      }

      const data = await response.json()
      if (data.success) {
        // Ordenar por el campo orden
        const sortedEdts = data.data.sort((a: ProyectoEdt, b: ProyectoEdt) => a.orden - b.orden)
        setEdts(sortedEdts)
      } else {
        console.warn('API returned error:', data.error)
        setEdts([])
      }
    } catch (error) {
      console.error('Error loading EDTs:', error)
      // Don't show error toast, just show empty state
      setEdts([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdtClick = (edt: ProyectoEdt) => {
    setSelectedEdtId(edt.id)
    onEdtSelect?.(edt)
  }

  const handleDeleteEdt = async (edtId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este EDT? Se eliminarán también todas las tareas asociadas.')) {
      return
    }

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/edt?ids=${edtId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar EDT')
      }

      toast.success('EDT eliminado exitosamente')
      loadEdts()
      onEdtDelete?.(edtId)
    } catch (error) {
      console.error('Error deleting EDT:', error)
      toast.error('Error al eliminar el EDT')
    }
  }

  const handleCreateEdt = () => {
    setShowCreateModal(true)
  }

  const handleEditEdt = (edt: ProyectoEdt) => {
    setEditingEdt(edt)
    setShowEditModal(true)
  }

  const handleEdtSuccess = (edt: ProyectoEdt) => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setEditingEdt(null)
    loadEdts()
    onEdtCreate?.()
  }

  const handleEdtCancel = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setEditingEdt(null)
  }

  const getStatusInfo = (estado: string) => {
    const statusMap: Record<string, any> = {
      'planificado': {
        icon: <Clock className="h-4 w-4" />,
        color: 'bg-blue-100 text-blue-800',
        label: 'Planificado'
      },
      'en_progreso': {
        icon: <PlayCircle className="h-4 w-4" />,
        color: 'bg-green-100 text-green-800',
        label: 'En Progreso'
      },
      'completado': {
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-emerald-100 text-emerald-800',
        label: 'Completado'
      },
      'pausado': {
        icon: <PauseCircle className="h-4 w-4" />,
        color: 'bg-orange-100 text-orange-800',
        label: 'Pausado'
      },
      'cancelado': {
        icon: <XCircle className="h-4 w-4" />,
        color: 'bg-red-100 text-red-800',
        label: 'Cancelado'
      },
      'detenido': {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Detenido'
      }
    }
    return statusMap[estado] || statusMap.planificado
  }

  const getPrioridadInfo = (prioridad: string) => {
    const prioridadMap: Record<string, any> = {
      'baja': { color: 'bg-gray-100 text-gray-800', label: 'Baja' },
      'media': { color: 'bg-blue-100 text-blue-800', label: 'Media' },
      'alta': { color: 'bg-orange-100 text-orange-800', label: 'Alta' },
      'critica': { color: 'bg-red-100 text-red-800', label: 'Crítica' }
    }
    return prioridadMap[prioridad] || prioridadMap.media
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatHours = (hours: number | string) => {
    const numHours = typeof hours === 'string' ? parseFloat(hours) : hours
    return `${numHours.toFixed(1)}h`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">EDTs del Proyecto</h2>
          <p className="text-gray-600 mt-1">
            Estructura de Desglose de Trabajo y planificación detallada
          </p>
        </div>
        <Button onClick={handleCreateEdt} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo EDT
        </Button>
      </div>

      {/* EDTs Grid */}
      {edts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay EDTs definidos
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Crea tu primera Estructura de Desglose de Trabajo para organizar las tareas del proyecto
            </p>
            <Button onClick={handleCreateEdt} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer EDT
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SortableList
          items={edts}
          onReorder={reorderItems}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          renderItem={(edt) => {
            const statusInfo = getStatusInfo(edt.estado)
            const prioridadInfo = getPrioridadInfo(edt.prioridad)
            const isSelected = selectedEdtId === edt.id

            return (
              <Card
                key={edt.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => handleEdtClick(edt)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold truncate">
                      {edt.nombre}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge className={`${prioridadInfo.color} border-0`}>
                        {prioridadInfo.label}
                      </Badge>
                      <Badge className={`${statusInfo.color} border-0`}>
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.label}</span>
                      </Badge>
                    </div>
                  </div>
                  {edt.descripcion && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {edt.descripcion}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-medium">{edt.porcentajeAvance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${edt.porcentajeAvance}%` }}
                      />
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-gray-600">Plan</p>
                        <p className="font-medium">{formatHours(edt.horasPlan)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-gray-600">Real</p>
                        <p className="font-medium">{formatHours(edt.horasReales)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {edt.fechaInicio ? formatDate(edt.fechaInicio) : 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>
                        {edt.fechaFin ? formatDate(edt.fechaFin) : 'Sin fecha'}
                      </span>
                    </div>
                  </div>

                  {/* Responsible */}
                  {edt.responsable && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{edt.responsable.name || 'Sin asignar'}</span>
                    </div>
                  )}

                  {/* Category */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Categoría</span>
                    <span className="font-medium bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                      {edt.edt?.nombre || 'Sin categoría'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditEdt(edt)
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteEdt(edt.id)
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          }}
        />
      )}

      {/* Modal Crear EDT */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ProyectoEdtForm
            proyectoId={proyectoId}
            cronogramaId={cronogramaId}
            onSuccess={handleEdtSuccess}
            onCancel={handleEdtCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Modal Editar EDT */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editingEdt && (
            <ProyectoEdtForm
              proyectoId={proyectoId}
              cronogramaId={cronogramaId}
              edt={editingEdt}
              onSuccess={handleEdtSuccess}
              onCancel={handleEdtCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}