// ===================================================
// 📁 Archivo: PedidoEquipoEditModal.tsx
// 📍 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para editar pedidos de equipos existentes
//
// 🎨 Mejoras UX/UI aplicadas:
// - Diseño moderno con modal
// - Validación en tiempo real
// - Estados de carga mejorados
// - Feedback visual
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { PedidoEquipo, EstadoPedido } from '@/types/modelos'
import { Loader2, FileText, Calendar, MessageSquare } from 'lucide-react'
import { formatDateForInput } from '@/lib/utils/date'

interface Props {
  pedido: PedidoEquipo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (pedido: PedidoEquipo) => void
  fields?: ('fechaNecesaria' | 'fechaEntregaEstimada' | 'estado' | 'observacion')[]
}

export default function PedidoEquipoEditModal({ pedido, open, onOpenChange, onUpdated, fields }: Props) {
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('')
  const [estado, setEstado] = useState<EstadoPedido>('borrador')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ fechaNecesaria?: string; fechaEntregaEstimada?: string }>({})

  // Default fields to show if none specified
  const defaultFields: ('fechaNecesaria' | 'fechaEntregaEstimada' | 'estado' | 'observacion')[] =
    ['fechaNecesaria', 'fechaEntregaEstimada', 'estado', 'observacion']

  const visibleFields = fields || defaultFields

  // Reset form when pedido changes
  useEffect(() => {
    if (pedido) {
      setObservacion(pedido.observacion || '')
      setFechaNecesaria(pedido.fechaNecesaria ? formatDateForInput(pedido.fechaNecesaria) : '')
      setFechaEntregaEstimada(pedido.fechaEntregaEstimada ? formatDateForInput(pedido.fechaEntregaEstimada) : '')
      setEstado(pedido.estado || 'borrador')
      setErrors({})
    }
  }, [pedido])

  const validateForm = () => {
    const newErrors: { fechaNecesaria?: string; fechaEntregaEstimada?: string } = {}

    // Validación opcional para fechaNecesaria
    if (fechaNecesaria) {
      const fecha = new Date(fechaNecesaria)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      if (fecha < hoy) {
        newErrors.fechaNecesaria = 'La fecha necesaria no puede ser anterior a hoy'
      }
    }

    // Validación opcional para fechaEntregaEstimada
    if (fechaEntregaEstimada && fechaNecesaria) {
      const fechaNecesariaDate = new Date(fechaNecesaria)
      const fechaEntregaDate = new Date(fechaEntregaEstimada)

      if (fechaEntregaDate < fechaNecesariaDate) {
        newErrors.fechaEntregaEstimada = 'La fecha de entrega estimada no puede ser anterior a la fecha necesaria'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pedido || !validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    try {
      setLoading(true)

      // Preparar payload para API - ensure dates are sent as date-only strings
      const payload = {
        observacion: observacion.trim() || null,
        fechaNecesaria: fechaNecesaria || null,
        fechaEntregaEstimada: fechaEntregaEstimada || null,
        estado
      }

      console.log('🔍 Enviando payload de actualización:', payload)

      // Llamada al API
      const response = await fetch(`/api/pedido-equipo/${pedido.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        let errorData: { error?: string } = {}
        let errorMessage = 'Error al actualizar el pedido'

        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const textResponse = await response.text()
            console.error('❌ Non-JSON error response:', textResponse)
            errorMessage = textResponse || `Error ${response.status}: ${response.statusText}`
          }
        } catch (parseError) {
          console.error('❌ Error parsing response:', parseError)
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }

        console.error('❌ Error response:', errorData)
        throw new Error(errorMessage)
      }

      const pedidoActualizado = await response.json()
      console.log('✅ Pedido actualizado:', pedidoActualizado)

      // Call parent callback with the updated pedido
      onUpdated(pedidoActualizado)

      // Close modal
      onOpenChange(false)

      toast.success('Pedido actualizado exitosamente')
    } catch (error) {
      console.error('Error al actualizar pedido:', error)

      let errorMessage = 'Error al actualizar el pedido. Intente nuevamente.'

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'observacion') {
      setObservacion(value)
    } else if (field === 'fechaNecesaria') {
      setFechaNecesaria(value)
      // Clear error when user changes date
      if (errors.fechaNecesaria) {
        setErrors(prev => ({ ...prev, fechaNecesaria: undefined }))
      }
    } else if (field === 'fechaEntregaEstimada') {
      setFechaEntregaEstimada(value)
      // Clear error when user changes date
      if (errors.fechaEntregaEstimada) {
        setErrors(prev => ({ ...prev, fechaEntregaEstimada: undefined }))
      }
    }
  }

  const handleEstadoChange = (value: EstadoPedido) => {
    setEstado(value)
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      // Reset form to original values
      if (pedido) {
        setObservacion(pedido.observacion || '')
        setFechaNecesaria(pedido.fechaNecesaria || '')
        setFechaEntregaEstimada(pedido.fechaEntregaEstimada || '')
        setEstado(pedido.estado || 'borrador')
        setErrors({})
      }
    }
  }

  const estadoOptions: { value: EstadoPedido; label: string }[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'atendido', label: 'Atendido' },
    { value: 'parcial', label: 'Parcial' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'cancelado', label: 'Cancelado' }
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Editar Pedido de Equipos
          </DialogTitle>
        </DialogHeader>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {visibleFields.includes('fechaNecesaria') && (
            <div className="space-y-2">
              <Label htmlFor="fechaNecesaria" className="text-sm font-medium text-gray-700">
                Fecha Necesaria
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="fechaNecesaria"
                  type="date"
                  value={fechaNecesaria}
                  onChange={(e) => handleInputChange('fechaNecesaria', e.target.value)}
                  className={`pl-10 ${errors.fechaNecesaria ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              {errors.fechaNecesaria && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600"
                >
                  {errors.fechaNecesaria}
                </motion.p>
              )}
            </div>
          )}

          {visibleFields.includes('fechaEntregaEstimada') && (
            <div className="space-y-2">
              <Label htmlFor="fechaEntregaEstimada" className="text-sm font-medium text-gray-700">
                Fecha Entrega Estimada (Opcional)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="fechaEntregaEstimada"
                  type="date"
                  value={fechaEntregaEstimada}
                  onChange={(e) => handleInputChange('fechaEntregaEstimada', e.target.value)}
                  className={`pl-10 ${errors.fechaEntregaEstimada ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={loading}
                />
              </div>
              {errors.fechaEntregaEstimada && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600"
                >
                  {errors.fechaEntregaEstimada}
                </motion.p>
              )}
            </div>
          )}

          {visibleFields.includes('estado') && (
            <div className="space-y-2">
              <Label htmlFor="estado" className="text-sm font-medium text-gray-700">
                Estado del Pedido
              </Label>
              <Select value={estado} onValueChange={handleEstadoChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {estadoOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {visibleFields.includes('observacion') && (
            <div className="space-y-2">
              <Label htmlFor="observacion" className="text-sm font-medium text-gray-700">
                Observaciones (Opcional)
              </Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="observacion"
                  value={observacion}
                  onChange={(e) => handleInputChange('observacion', e.target.value)}
                  placeholder="Agregue observaciones adicionales sobre el pedido..."
                  className="pl-10 min-h-[100px]"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Actualizar Pedido
                </>
              )}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  )
}