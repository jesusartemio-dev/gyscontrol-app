'use client'

/**
 * 📋 CotizacionEdtList - Lista de EDTs comerciales
 *
 * Componente que muestra la lista de EDTs comerciales de una cotización
 * con opciones de edición, eliminación y gestión de tareas.
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CotizacionTareaList } from './CotizacionTareaList'
import { CotizacionEdtForm } from './CotizacionEdtForm'

interface CotizacionEdt {
  id: string
  nombre: string
  zona?: string
  fechaInicioComercial?: string
  fechaFinComercial?: string
  horasEstimadas?: number
  estado: string
  responsableId?: string
  descripcion?: string
  prioridad: string
  createdAt: string
  edt: {
    id: string
    nombre: string
  }
  responsable?: {
    id: string
    name: string | null
    email: string
  }
  cotizacionFase?: {
    id: string
    nombre: string
  }
  tareas?: any[]
}

interface CotizacionEdtListProps {
  cotizacionId: string
  refreshKey: number
  onRefresh: () => void
}

export function CotizacionEdtList({
  cotizacionId,
  refreshKey,
  onRefresh
}: CotizacionEdtListProps) {
  const [edts, setEdts] = useState<CotizacionEdt[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEdt, setEditingEdt] = useState<CotizacionEdt | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    edtId: string
    edtNombre: string
  }>({ open: false, edtId: '', edtNombre: '' })
  const [deletingEdt, setDeletingEdt] = useState<string | null>(null)
  const [expandedEdt, setExpandedEdt] = useState<string | null>(null)
  const { toast } = useToast()

  // Cargar EDTs
  useEffect(() => {
    loadEdts()
  }, [cotizacionId, refreshKey])

  const loadEdts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma`)

      if (!response.ok) {
        throw new Error('Error al cargar EDTs')
      }

      const data = await response.json()
      setEdts(data.data || [])
    } catch (error) {
      console.error('Error loading EDTs:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los EDTs comerciales.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Eliminar EDT
  const handleDeleteEdt = async () => {
    const edtId = deleteDialog.edtId
    const edtNombre = deleteDialog.edtNombre

    try {
      // Set loading state and close dialog
      setDeletingEdt(edtId)
      setDeleteDialog({ open: false, edtId: '', edtNombre: '' })

      const response = await fetch(
        `/api/cotizacion/${cotizacionId}/cronograma/${edtId}`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        throw new Error('Error al eliminar EDT')
      }

      toast({
        title: 'EDT eliminado',
        description: 'El EDT comercial ha sido eliminado exitosamente.'
      })

      onRefresh()
      setDeletingEdt(null)
    } catch (error) {
      console.error('Error deleting EDT:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el EDT.',
        variant: 'destructive'
      })
      setDeletingEdt(null)
    }
  }

  // Obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'planificado': return 'secondary'
      case 'en_progreso': return 'default'
      case 'completado': return 'default'
      case 'detenido': return 'destructive'
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
      case 'detenido':
      case 'cancelado': return <AlertCircle className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
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
      {edts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay EDTs comerciales</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer EDT comercial para comenzar a planificar el cronograma.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        edts.map((edt) => (
          <Card key={edt.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getEstadoIcon(edt.estado)}
                    <div>
                      <CardTitle className="text-lg">
                        {edt.nombre}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {edt.edt.nombre}
                        {edt.zona && ` - ${edt.zona}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getEstadoColor(edt.estado)}>
                      {edt.estado.replace('_', ' ')}
                    </Badge>
                    {edt.cotizacionFase && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        📁 {edt.cotizacionFase.nombre}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedEdt(
                      expandedEdt === edt.id ? null : edt.id
                    )}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {expandedEdt === edt.id ? 'Ocultar' : 'Ver'} Tareas
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingEdt(edt)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar EDT
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          // Small delay to ensure dropdown closes before dialog opens
                          setTimeout(() => {
                            setDeleteDialog({ open: true, edtId: edt.id, edtNombre: edt.nombre })
                          }, 100)
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar EDT
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Información del EDT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Fechas</p>
                    <p className="text-muted-foreground">
                      {edt.fechaInicioComercial
                        ? new Date(edt.fechaInicioComercial).toLocaleDateString('es-ES')
                        : 'No definida'
                      }
                      {' - '}
                      {edt.fechaFinComercial
                        ? new Date(edt.fechaFinComercial).toLocaleDateString('es-ES')
                        : 'No definida'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Horas estimadas</p>
                    <p className="text-muted-foreground">
                      {edt.horasEstimadas || 0} horas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Responsable</p>
                    <p className="text-muted-foreground">
                      {edt.responsable?.name || 'No asignado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              {edt.descripcion && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {edt.descripcion}
                  </p>
                </div>
              )}

              {/* Lista de tareas (expandible) */}
              {expandedEdt === edt.id && (
                <div className="border-t pt-4">
                  <CotizacionTareaList
                    cotizacionId={cotizacionId}
                    refreshKey={refreshKey}
                    onRefresh={onRefresh}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Modal de edición */}
      {editingEdt && (
        <CotizacionEdtForm
          cotizacionId={cotizacionId}
          edt={editingEdt}
          onSuccess={() => {
            setEditingEdt(null)
            onRefresh()
          }}
          onCancel={() => setEditingEdt(null)}
        />
      )}

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        // Solo permitir cerrar si no estamos en medio de una operación
        if (!open) {
          setDeleteDialog({ open: false, edtId: '', edtNombre: '' })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar EDT comercial?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el EDT "{deleteDialog.edtNombre}"
              y todas sus tareas asociadas.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, edtId: '', edtNombre: '' })}
              disabled={deletingEdt !== null}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteEdt}
              disabled={deletingEdt !== null}
              variant="destructive"
            >
              {deletingEdt !== null ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                'Eliminar EDT'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}