'use client'

/**
 * 📋 CotizacionFasesList - Lista de fases de una cotización
 *
 * Componente que muestra la lista de fases comerciales de una cotización
 * con opciones de gestión y visualización de EDTs por fase.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  FolderOpen,
  Calendar,
  BarChart3,
  Users,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { CotizacionFasesForm } from './CotizacionFasesForm'

interface CotizacionFase {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  estado: string
  porcentajeAvance: number
  createdAt: string
  edts: {
    id: string
    nombre: string
    categoriaServicio: {
      nombre: string
    }
    estado: string
    zonas: {
      actividades: {
        tareas: any[]
      }[]
    }[]
  }[]
}

interface CotizacionFasesListProps {
  cotizacionId: string
  refreshKey: number
  onRefresh: () => void
}

export function CotizacionFasesList({
  cotizacionId,
  refreshKey,
  onRefresh
}: CotizacionFasesListProps) {
  const [fases, setFases] = useState<CotizacionFase[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedFase, setExpandedFase] = useState<string | null>(null)
  const [editingFase, setEditingFase] = useState<CotizacionFase | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    faseId: string
    faseNombre: string
  }>({ open: false, faseId: '', faseNombre: '' })
  const [deletingFase, setDeletingFase] = useState<string | null>(null)
  const { toast } = useToast()

  // Cargar fases
  useEffect(() => {
    loadFases()
  }, [cotizacionId, refreshKey])

  const loadFases = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/cotizacion/${cotizacionId}/fases`)

      if (!response.ok) {
        throw new Error('Error al cargar fases')
      }

      const data = await response.json()
      setFases(data.data || [])
    } catch (error) {
      console.error('Error loading fases:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las fases comerciales.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'planificado': return 'secondary'
      case 'en_progreso': return 'default'
      case 'completado': return 'default'
      case 'pausado': return 'destructive'
      case 'cancelado': return 'destructive'
      default: return 'secondary'
    }
  }

  // Obtener icono del estado
  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'planificado': return <Calendar className="h-4 w-4" />
      case 'en_progreso': return <PlayCircle className="h-4 w-4" />
      case 'completado': return <CheckCircle className="h-4 w-4" />
      case 'pausado':
      case 'cancelado': return <AlertCircle className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  // Función para eliminar fase
  const handleDeleteFase = (faseId: string, faseNombre: string) => {
    // Pequeño delay para asegurar que el dropdown se cierre antes de abrir el modal
    setTimeout(() => {
      setDeleteDialog({ open: true, faseId, faseNombre })
    }, 100)
  }

  const confirmDeleteFase = async () => {
    const faseId = deleteDialog.faseId
    const faseNombre = deleteDialog.faseNombre

    try {
      // Establecer estado de carga y cerrar diálogo
      setDeletingFase(faseId)
      setDeleteDialog({ open: false, faseId: '', faseNombre: '' })

      const response = await fetch(`/api/cotizacion/${cotizacionId}/fases/${faseId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar la fase')
      }

      toast({
        title: 'Fase eliminada',
        description: `La fase "${faseNombre}" ha sido eliminada exitosamente.`
      })

      // Recargar fases
      await loadFases()
      onRefresh()

    } catch (error: any) {
      console.error('Error deleting fase:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la fase.',
        variant: 'destructive'
      })
    } finally {
      setDeletingFase(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {fases.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay fases comerciales</h3>
              <p className="text-muted-foreground mb-4">
                Usa el botón "Crear Fases por Defecto" para crear las fases estándar del proyecto.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        fases.map((fase) => (
          <Card key={fase.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getEstadoIcon(fase.estado)}
                    <CardTitle className="text-lg">
                      {fase.nombre}
                    </CardTitle>
                  </div>
                  <Badge variant={getEstadoColor(fase.estado)}>
                    {fase.estado.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">
                    Orden: {fase.orden}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setExpandedFase(
                      expandedFase === fase.id ? null : fase.id
                    )}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {expandedFase === fase.id ? 'Ocultar' : 'Ver'} EDTs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingFase(fase)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Fase
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteFase(fase.id, fase.nombre)}
                      disabled={deletingFase === fase.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingFase === fase.id ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Fase
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Información de la fase */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Fechas planificadas</p>
                    <p className="text-muted-foreground">
                      {fase.fechaInicioPlan
                        ? new Date(fase.fechaInicioPlan).toLocaleDateString('es-ES')
                        : 'No definida'
                      }
                      {' - '}
                      {fase.fechaFinPlan
                        ? new Date(fase.fechaFinPlan).toLocaleDateString('es-ES')
                        : 'No definida'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Progreso</p>
                    <p className="text-muted-foreground">
                      {fase.porcentajeAvance}% completado
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">EDTs en esta fase</p>
                    <p className="text-muted-foreground">
                      {fase.edts?.length || 0} EDTs
                    </p>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              {fase.descripcion && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {fase.descripcion}
                  </p>
                </div>
              )}

              {/* EDTs de la fase (expandible) */}
              {expandedFase === fase.id && fase.edts && fase.edts.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">EDTs en esta fase:</h4>
                  <div className="space-y-2">
                    {fase.edts.map((edt) => (
                      <div key={edt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {edt.categoriaServicio.nombre}
                          </Badge>
                          <span className="text-sm font-medium">{edt.nombre}</span>
                          <Badge variant={getEstadoColor(edt.estado)} className="text-xs">
                            {edt.estado.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {edt.zonas?.reduce((total, zona) =>
                            total + zona.actividades?.reduce((actTotal, actividad) =>
                              actTotal + (actividad.tareas?.length || 0), 0
                            ) || 0, 0
                          ) || 0} tareas
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Modal de edición */}
      {editingFase && (
        <CotizacionFasesForm
          cotizacionId={cotizacionId}
          fase={editingFase}
          onSuccess={() => {
            setEditingFase(null)
            loadFases()
            onRefresh()
          }}
          onCancel={() => setEditingFase(null)}
        />
      )}

      {/* Diálogo de confirmación para eliminar fase */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        // Solo permitir cerrar si no estamos en medio de una operación
        if (!open) {
          setDeleteDialog({ open: false, faseId: '', faseNombre: '' })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar fase?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar la fase "{deleteDialog.faseNombre}"?
              Esta acción no se puede deshacer y eliminará todos los EDTs asociados a esta fase.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, faseId: '', faseNombre: '' })}
              disabled={deletingFase !== null}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDeleteFase}
              disabled={deletingFase !== null}
              variant="destructive"
            >
              {deletingFase !== null ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}