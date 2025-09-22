'use client'

/**
 * 📋 CotizacionTareaList - Lista de tareas de un EDT comercial
 *
 * Componente simple que muestra las tareas de un EDT comercial.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
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
import { Plus, Calendar, User, MoreHorizontal, Edit, Trash2, Package, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CotizacionTareaForm } from './CotizacionTareaForm'
import { BulkImportServicioItemsModal } from './BulkImportServicioItemsModal'
import { QuickImportModal } from './QuickImportModal'
import { ImportOptionsModal } from './ImportOptionsModal'

interface CotizacionTarea {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  horasEstimadas?: number
  estado: string
  prioridad: string
  responsable?: {
    id: string
    name: string | null
  }
}

interface CotizacionTareaListProps {
  cotizacionId: string
  edtId: string
  edt?: any // EDT data for defaults
  onRefresh: () => void
}

export function CotizacionTareaList({
  cotizacionId,
  edtId,
  edt,
  onRefresh
}: CotizacionTareaListProps) {
  const [tareas, setTareas] = useState<CotizacionTarea[]>([])
  const [loading, setLoading] = useState(true)
  const [showTareaForm, setShowTareaForm] = useState(false)
  const [editingTarea, setEditingTarea] = useState<CotizacionTarea | null>(null)
  const [deletingTarea, setDeletingTarea] = useState<CotizacionTarea | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [showQuickImportModal, setShowQuickImportModal] = useState(false)
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false)
  const { toast } = useToast()

  // Cargar tareas
  useEffect(() => {
    loadTareas()
  }, [edtId])

  const loadTareas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/cotizacion/${cotizacionId}/cronograma/${edtId}/tareas`)

      if (!response.ok) {
        throw new Error('Error al cargar tareas')
      }

      const data = await response.json()
      setTareas(data.data || [])
    } catch (error) {
      console.error('Error loading tareas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Función para crear nueva tarea
  const handleCreateTarea = () => {
    setShowTareaForm(true)
  }

  // Función después de crear/editar tarea
  const handleTareaSaved = () => {
    setShowTareaForm(false)
    setEditingTarea(null)
    loadTareas() // Recargar la lista de tareas
    onRefresh() // Notificar al componente padre
    toast({
      title: editingTarea ? 'Tarea actualizada' : 'Tarea creada',
      description: `La tarea ha sido ${editingTarea ? 'actualizada' : 'creada'} exitosamente.`
    })
  }

  // Función para editar tarea
  const handleEditTarea = (tarea: CotizacionTarea) => {
    setEditingTarea(tarea)
    setShowTareaForm(true)
  }

  // Función para manejar selección de método de importación
  const handleImportOptionSelect = (option: 'quick' | 'advanced' | 'manual') => {
    setShowImportOptionsModal(false)

    switch (option) {
      case 'quick':
        setShowQuickImportModal(true)
        break
      case 'advanced':
        setShowBulkImportModal(true)
        break
      case 'manual':
        handleCreateTarea()
        break
    }
  }

  // Función para eliminar tarea
  const handleDeleteTarea = async () => {
    if (!deletingTarea) return

    try {
      const response = await fetch(
        `/api/cotizacion/${cotizacionId}/cronograma/${edtId}/tareas/${deletingTarea.id}`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        throw new Error('Error al eliminar tarea')
      }

      toast({
        title: 'Tarea eliminada',
        description: 'La tarea ha sido eliminada exitosamente.'
      })

      // Forzar blur de cualquier elemento enfocado antes de cerrar
      if (document.activeElement) {
        (document.activeElement as HTMLElement).blur()
      }

      // Cerrar dialog inmediatamente y limpiar estados
      setShowDeleteDialog(false)
      setDeletingTarea(null)

      // Recargar datos
      loadTareas()
      onRefresh()

    } catch (error) {
      console.error('Error deleting tarea:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la tarea.',
        variant: 'destructive'
      })
      // Cerrar dialog en caso de error
      setShowDeleteDialog(false)
      setDeletingTarea(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="task-list-container">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Tareas del EDT</h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowImportOptionsModal(true)}
            data-testid="import-options-button"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Package className="h-4 w-4 mr-2" />
            Agregar Tareas
          </Button>
        </div>
      </div>

      {tareas.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No hay tareas definidas para este EDT
        </div>
      ) : (
        <div className="space-y-2">
          {tareas.map((tarea) => (
            <div
              key={tarea.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1">
                  <p className="font-medium text-sm">{tarea.nombre}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(tarea.fechaInicio).toLocaleDateString('es-ES')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {tarea.responsable?.name || 'No asignado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {tarea.estado.replace('_', ' ')}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {tarea.prioridad}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      // Forzar cierre del dropdown antes de abrir el modal
                      setTimeout(() => handleEditTarea(tarea), 0)
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar tarea
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // Forzar cierre del dropdown antes de abrir el dialog
                        setTimeout(() => {
                          setDeletingTarea(tarea)
                          setShowDeleteDialog(true)
                        }, 0)
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar tarea
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de creación/edición de tarea */}
      {showTareaForm && (
        <CotizacionTareaForm
          cotizacionId={cotizacionId}
          edtId={edtId}
          edt={edt}
          tarea={editingTarea}
          onSuccess={handleTareaSaved}
          onCancel={() => {
            setShowTareaForm(false)
            setEditingTarea(null)
          }}
        />
      )}

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) {
          setDeletingTarea(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar tarea?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará la tarea "{deletingTarea?.nombre}".
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteTarea}
              variant="destructive"
            >
              Eliminar tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de selección de opciones de importación */}
      <ImportOptionsModal
        isOpen={showImportOptionsModal}
        onClose={() => setShowImportOptionsModal(false)}
        onSelectOption={handleImportOptionSelect}
      />

      {/* Modal de importación rápida */}
      <QuickImportModal
        cotizacionId={cotizacionId}
        edtId={edtId}
        edt={edt}
        isOpen={showQuickImportModal}
        onClose={() => setShowQuickImportModal(false)}
        onSuccess={() => {
          setShowQuickImportModal(false)
          loadTareas()
          onRefresh()
        }}
      />

      {/* Modal de importación masiva */}
      <BulkImportServicioItemsModal
        cotizacionId={cotizacionId}
        edtId={edtId}
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          setShowBulkImportModal(false)
          loadTareas()
          onRefresh()
        }}
      />
    </div>
  )
}