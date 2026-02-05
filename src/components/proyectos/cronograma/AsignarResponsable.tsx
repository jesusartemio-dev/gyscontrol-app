'use client'

/**
 * AsignarResponsable - Interfaz para asignar responsables a elementos del cronograma
 * 
 * Componente modal que permite asignar/remover responsables a EDTs y Tareas
 * Integra con la API de asignación de responsables existente
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { User, UserCheck, UserX, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AsignarResponsableProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'edt' | 'tarea'
  elementoId: string
  elementoNombre: string
  responsableActual?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  onAsignacionExitosa: () => void
}

interface Usuario {
  id: string
  name: string
  email: string
  role: string
}

export function AsignarResponsable({
  open,
  onOpenChange,
  tipo,
  elementoId,
  elementoNombre,
  responsableActual,
  onAsignacionExitosa
}: AsignarResponsableProps) {
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Usuario[]>([])
  const [responsableSeleccionado, setResponsableSeleccionado] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const { toast } = useToast()

  // Cargar usuarios disponibles cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadUsuariosDisponibles()
      setResponsableSeleccionado(responsableActual?.id || '')
    }
  }, [open, responsableActual])

  const loadUsuariosDisponibles = async () => {
    try {
      setLoadingUsuarios(true)
      const response = await fetch(
        `/api/proyectos/cronograma/asignar-responsable?tipo=${tipo}&id=${elementoId}`
      )
      
      if (!response.ok) throw new Error('Error al cargar usuarios')
      
      const data = await response.json()
      setUsuariosDisponibles(data.data.usuariosDisponibles)
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios disponibles',
        variant: 'destructive'
      })
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const handleAsignar = async () => {
    if (!responsableSeleccionado) return

    try {
      setLoading(true)
      
      const responsableId = responsableSeleccionado === 'null' ? null : responsableSeleccionado
      
      const response = await fetch('/api/proyectos/cronograma/asignar-responsable', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          id: elementoId,
          responsableId
        })
      })

      if (!response.ok) throw new Error('Error al asignar responsable')

      const data = await response.json()
      
      toast({
        title: data.message,
        description: `Se ${responsableId ? 'asignó' : 'removió'} el responsable correctamente`
      })

      onAsignacionExitosa()
      onOpenChange(false)
    } catch (error) {
      console.error('Error asignando responsable:', error)
      toast({
        title: 'Error',
        description: 'No se pudo asignar el responsable',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getNombreUsuario = (usuario: Usuario) => {
    return `${usuario.name} (${usuario.role})`
  }

  const formatTipoElemento = (tipo: string) => {
    switch (tipo) {
      case 'edt':
        return 'EDT'
      case 'tarea':
        return 'Tarea'
      default:
        return tipo.toUpperCase()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Asignar Responsable
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

          {/* Responsable actual */}
          {responsableActual && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Responsable actual:</span>
              </div>
              <p className="text-sm text-blue-700">{getNombreUsuario(responsableActual)}</p>
              <p className="text-xs text-blue-600">{responsableActual.email}</p>
            </div>
          )}

          {/* Selección de responsable */}
          <div className="space-y-2">
            <Label>Asignar responsable</Label>
            {loadingUsuarios ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Cargando usuarios...</span>
              </div>
            ) : (
              <Select
                value={responsableSeleccionado}
                onValueChange={setResponsableSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {/* Opción para remover asignación */}
                  <SelectItem value="null">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Sin asignar</span>
                    </div>
                  </SelectItem>
                  
                  {/* Usuarios disponibles */}
                  {usuariosDisponibles.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{getNombreUsuario(usuario)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Información sobre la asignación */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Información:</p>
                <ul className="text-xs space-y-1">
                  <li>• Cualquier personal del proyecto puede ser asignado como responsable</li>
                  <li>• Se notificará automáticamente al nuevo responsable</li>
                  <li>• Puede cambiar la asignación en cualquier momento</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
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
              disabled={loading || loadingUsuarios || !responsableSeleccionado}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              {responsableSeleccionado === 'null' ? 'Remover' : 'Asignar'} Responsable
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AsignarResponsable