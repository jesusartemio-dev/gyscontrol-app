'use client'

/**
 * CerrarJornadaModal - Modal para cerrar una jornada de campo
 *
 * Permite registrar:
 * - Avance del día (requerido)
 * - Bloqueos encontrados (opcional, múltiples)
 * - Plan para el día siguiente (opcional)
 */

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Clock,
  Users,
  ListTodo,
  AlertTriangle,
  Calendar,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  Send
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Bloqueo {
  descripcion: string
  impacto: string
  accion: string
}

interface TareaResumen {
  id: string
  nombre: string
  miembros: number
  horas: number
}

interface CerrarJornadaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jornadaId: string
  proyecto: { codigo: string; nombre: string }
  fechaTrabajo: string
  objetivosDia?: string | null
  tareasResumen: TareaResumen[]
  totalHoras: number
  totalMiembros: number
  onSuccess: () => void
}

export function CerrarJornadaModal({
  open,
  onOpenChange,
  jornadaId,
  proyecto,
  fechaTrabajo,
  objetivosDia,
  tareasResumen,
  totalHoras,
  totalMiembros,
  onSuccess
}: CerrarJornadaModalProps) {
  const { toast } = useToast()

  // Estado
  const [submitting, setSubmitting] = useState(false)
  const [avanceDia, setAvanceDia] = useState('')
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [planSiguiente, setPlanSiguiente] = useState('')

  // Reset al abrir
  React.useEffect(() => {
    if (open) {
      setAvanceDia('')
      setBloqueos([])
      setPlanSiguiente('')
    }
  }, [open])

  const agregarBloqueo = () => {
    setBloqueos(prev => [...prev, { descripcion: '', impacto: '', accion: '' }])
  }

  const actualizarBloqueo = (index: number, campo: keyof Bloqueo, valor: string) => {
    setBloqueos(prev => prev.map((b, i) => i === index ? { ...b, [campo]: valor } : b))
  }

  const eliminarBloqueo = (index: number) => {
    setBloqueos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    // Validaciones
    if (!avanceDia.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El avance del día es requerido' })
      return
    }

    // Filtrar bloqueos vacíos y validar los que tienen contenido
    const bloqueosValidos = bloqueos.filter(b => b.descripcion.trim())
    for (const bloqueo of bloqueosValidos) {
      if (!bloqueo.descripcion.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cada bloqueo debe tener una descripción' })
        return
      }
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}/cerrar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avanceDia: avanceDia.trim(),
          bloqueos: bloqueosValidos.length > 0 ? bloqueosValidos.map(b => ({
            descripcion: b.descripcion.trim(),
            impacto: b.impacto.trim() || undefined,
            accion: b.accion.trim() || undefined
          })) : undefined,
          planSiguiente: planSiguiente.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error cerrando jornada')
      }

      toast({
        title: 'Jornada cerrada',
        description: 'La jornada ha sido enviada para aprobación'
      })

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error cerrando jornada'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-orange-600" />
            Cerrar Jornada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Resumen de la jornada */}
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{proyecto.codigo}</span>
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatFecha(fechaTrabajo)}
                  </Badge>
                </div>

                <div className="text-sm text-gray-600">
                  <strong>Objetivos:</strong> {objetivosDia}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <ListTodo className="h-4 w-4 text-blue-600" />
                    <span>{tareasResumen.length} tareas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>{totalMiembros} personas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span>{totalHoras}h total</span>
                  </div>
                </div>

                {/* Lista de tareas */}
                {tareasResumen.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs font-medium text-gray-500 mb-2">Tareas registradas:</div>
                    <div className="space-y-1">
                      {tareasResumen.map(tarea => (
                        <div key={tarea.id} className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1">{tarea.nombre}</span>
                          <span className="text-gray-500 ml-2">
                            {tarea.miembros}p · {tarea.horas}h
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Avance del día */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Avance del día *
            </Label>
            <Textarea
              placeholder="Describe el avance logrado hoy, qué se completó, el estado actual de las tareas..."
              value={avanceDia}
              onChange={e => setAvanceDia(e.target.value)}
              rows={4}
            />
          </div>

          {/* Bloqueos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Bloqueos (opcional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={agregarBloqueo}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {bloqueos.length === 0 ? (
              <div className="text-sm text-gray-500 italic">
                No hay bloqueos registrados. Haz clic en "Agregar" si encontraste algún impedimento.
              </div>
            ) : (
              <div className="space-y-3">
                {bloqueos.map((bloqueo, index) => (
                  <Card key={index} className="border-amber-200 bg-amber-50/50">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <Label className="text-sm">Bloqueo {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarBloqueo(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Descripción del bloqueo *"
                          value={bloqueo.descripcion}
                          onChange={e => actualizarBloqueo(index, 'descripcion', e.target.value)}
                        />
                        <Input
                          placeholder="Impacto (opcional)"
                          value={bloqueo.impacto}
                          onChange={e => actualizarBloqueo(index, 'impacto', e.target.value)}
                        />
                        <Input
                          placeholder="Acción tomada (opcional)"
                          value={bloqueo.accion}
                          onChange={e => actualizarBloqueo(index, 'accion', e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Plan siguiente */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Plan para mañana (opcional)
            </Label>
            <Textarea
              placeholder="Describe brevemente qué se planea hacer el próximo día de trabajo..."
              value={planSiguiente}
              onChange={e => setPlanSiguiente(e.target.value)}
              rows={2}
            />
          </div>

          {/* Aviso */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Nota:</strong> Al cerrar la jornada, será enviada para aprobación.
            Las horas no aparecerán en los timesheets individuales hasta que un gestor o gerente apruebe la jornada.
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !avanceDia.trim() || tareasResumen.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cerrando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Cerrar y Enviar a Aprobación
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
