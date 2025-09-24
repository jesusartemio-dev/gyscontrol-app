// ===================================================
// 📁 Archivo: ProyectoFasesList.tsx
// 📌 Ubicación: src/components/proyectos/fases/ProyectoFasesList.tsx
// 🔧 Descripción: Componente para listar y gestionar fases de proyecto
// 🎯 Funcionalidades: Visualización, creación, edición y eliminación de fases
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  XCircle,
  PauseCircle
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProyectoFase } from '@/types/modelos'

interface ProyectoFasesListProps {
  proyectoId: string
  cronogramaId?: string
  onFaseSelect?: (fase: ProyectoFase) => void
  onFaseCreate?: () => void
  onFaseEdit?: (fase: ProyectoFase) => void
  onFaseDelete?: (faseId: string) => void
}

export function ProyectoFasesList({
  proyectoId,
  cronogramaId,
  onFaseSelect,
  onFaseCreate,
  onFaseEdit,
  onFaseDelete
}: ProyectoFasesListProps) {
  const [fases, setFases] = useState<ProyectoFase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFaseId, setSelectedFaseId] = useState<string | null>(null)

  useEffect(() => {
    loadFases()
  }, [proyectoId, cronogramaId])

  const loadFases = useCallback(async () => {
    try {
      setLoading(true)
      const url = cronogramaId
        ? `/api/proyectos/${proyectoId}/fases?cronogramaId=${cronogramaId}`
        : `/api/proyectos/${proyectoId}/fases`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Error al cargar fases')
      }

      const data = await response.json()
      if (data.success) {
        setFases(data.data)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error loading fases:', error)
      toast.error('Error al cargar las fases del proyecto')
    } finally {
      setLoading(false)
    }
  }, [proyectoId, cronogramaId])

  const handleFaseClick = useCallback((fase: ProyectoFase) => {
    setSelectedFaseId(fase.id)
    onFaseSelect?.(fase)
  }, [onFaseSelect])

  const handleDeleteFase = useCallback(async (faseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta fase?')) {
      return
    }

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/fases/${faseId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar fase')
      }

      toast.success('Fase eliminada exitosamente')
      loadFases()
      onFaseDelete?.(faseId)
    } catch (error) {
      console.error('Error deleting fase:', error)
      toast.error('Error al eliminar la fase')
    }
  }, [proyectoId, loadFases, onFaseDelete])

  const getStatusInfo = useCallback((estado: string) => {
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
      }
    }
    return statusMap[estado] || statusMap.planificado
  }, [])

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [])

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
                    <Skeleton className="h-6 w-16" />
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
          <h2 className="text-2xl font-bold text-gray-900">Fases del Proyecto</h2>
          <p className="text-gray-600 mt-1">
            Gestiona las fases y su progreso en el cronograma
          </p>
        </div>
        <Button onClick={onFaseCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Fase
        </Button>
      </div>

      {/* Fases Grid */}
      {fases.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay fases definidas
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Crea tu primera fase para organizar el trabajo del proyecto
            </p>
            <Button onClick={onFaseCreate} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Fase
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fases.map((fase) => {
            const statusInfo = getStatusInfo(fase.estado)
            const isSelected = selectedFaseId === fase.id

            return (
              <Card
                key={fase.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => handleFaseClick(fase)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold truncate">
                      {fase.nombre}
                    </CardTitle>
                    <Badge className={`${statusInfo.color} border-0`}>
                      {statusInfo.icon}
                      <span className="ml-1">{statusInfo.label}</span>
                    </Badge>
                  </div>
                  {fase.descripcion && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {fase.descripcion}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-medium">{fase.porcentajeAvance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fase.porcentajeAvance}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {fase.fechaInicioPlan ? formatDate(fase.fechaInicioPlan) : 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>
                        {fase.fechaFinPlan ? formatDate(fase.fechaFinPlan) : 'Sin fecha'}
                      </span>
                    </div>
                  </div>

                  {/* EDTs Count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">EDTs asociados</span>
                    <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {(fase as any)._count?.edts || 0}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onFaseEdit?.(fase)
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
                        handleDeleteFase(fase.id)
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}