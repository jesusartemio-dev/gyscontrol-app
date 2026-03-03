'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Wrench, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getRecursos } from '@/lib/services/recurso'

interface AsignarRecursoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'edt' | 'tarea'
  elementoId: string
  elementoNombre: string
  recursoActual?: { id: string; nombre: string; tipo: string } | null
  onAsignacionExitosa: () => void
}

interface RecursoOption {
  id: string
  nombre: string
  tipo: string
}

export function AsignarRecurso({
  open,
  onOpenChange,
  tipo,
  elementoId,
  elementoNombre,
  recursoActual,
  onAsignacionExitosa
}: AsignarRecursoProps) {
  const [recursosDisponibles, setRecursosDisponibles] = useState<RecursoOption[]>([])
  const [recursoSeleccionado, setRecursoSeleccionado] = useState<string>('')
  const [cascadeToTasks, setCascadeToTasks] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingRecursos, setLoadingRecursos] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadRecursosDisponibles()
      setRecursoSeleccionado(recursoActual?.id || '')
    }
  }, [open, recursoActual])

  const loadRecursosDisponibles = async () => {
    try {
      setLoadingRecursos(true)
      const recursos = await getRecursos(true)
      setRecursosDisponibles(
        recursos.map((r: any) => ({ id: r.id, nombre: r.nombre, tipo: r.tipo }))
      )
    } catch (error) {
      console.error('Error cargando recursos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los recursos disponibles',
        variant: 'destructive'
      })
    } finally {
      setLoadingRecursos(false)
    }
  }

  const handleAsignar = async () => {
    if (!recursoSeleccionado) return

    try {
      setLoading(true)

      const recursoId = recursoSeleccionado === 'null' ? null : recursoSeleccionado

      const payload: Record<string, any> = {
        tipo,
        id: elementoId,
        recursoId
      }
      if (tipo === 'edt') {
        payload.cascadeToTasks = cascadeToTasks
      }

      const response = await fetch('/api/proyectos/cronograma/asignar-recurso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Error al asignar recurso')

      const data = await response.json()

      toast({
        title: data.message,
        description: data.tareasActualizadas != null
          ? `${data.tareasActualizadas} tarea(s) actualizadas.`
          : undefined
      })

      onAsignacionExitosa()
      onOpenChange(false)
    } catch (error) {
      console.error('Error asignando recurso:', error)
      toast({
        title: 'Error',
        description: 'No se pudo asignar el recurso',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTipoElemento = (t: string) => t === 'edt' ? 'EDT' : 'Tarea'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Asignar Recurso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del elemento */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{formatTipoElemento(tipo)}</Badge>
            </div>
            <p className="font-medium text-sm">{elementoNombre}</p>
          </div>

          {/* Recurso actual */}
          {recursoActual && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Recurso actual:</span>
              </div>
              <p className="text-sm text-green-700">
                {recursoActual.nombre}
                {recursoActual.tipo === 'cuadrilla' && (
                  <span className="text-xs text-green-600 ml-1">(Cuadrilla)</span>
                )}
              </p>
            </div>
          )}

          {/* Selección de recurso */}
          <div className="space-y-2">
            <Label>Seleccionar recurso</Label>
            {loadingRecursos ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Cargando recursos...</span>
              </div>
            ) : (
              <Select
                value={recursoSeleccionado}
                onValueChange={setRecursoSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar recurso..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">
                    <span className="text-gray-500">Sin asignar</span>
                  </SelectItem>
                  {recursosDisponibles.map((recurso) => (
                    <SelectItem key={recurso.id} value={recurso.id}>
                      <span>
                        {recurso.nombre}
                        {recurso.tipo === 'cuadrilla' && (
                          <span className="text-xs text-muted-foreground ml-1">(Cuadrilla)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Opción de cascada para EDT */}
          {tipo === 'edt' && recursoSeleccionado && recursoSeleccionado !== 'null' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cascadeToTasks}
                  onChange={(e) => setCascadeToTasks(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-green-300 text-green-600 focus:ring-green-500"
                />
                <div className="text-sm">
                  <p className="font-medium text-green-800">Asignar también a todas las tareas</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Se asignará el mismo recurso a todas las tareas de este EDT
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Información:</p>
                <ul className="text-xs space-y-1">
                  <li>• El recurso define el costo/hora para el cálculo del costo planificado</li>
                  <li>• Para cuadrillas, las personas estimadas se calculan automáticamente</li>
                  <li>• Puede cambiar la asignación en cualquier momento</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAsignar}
              disabled={loading || loadingRecursos || !recursoSeleccionado}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              {recursoSeleccionado === 'null' ? 'Remover' : 'Asignar'} Recurso
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AsignarRecurso
