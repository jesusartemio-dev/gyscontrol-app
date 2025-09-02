// ===================================================
// 📁 Archivo: PedidoEquipoModalCrear.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para crear pedidos de equipos con UX/UI mejorada
// 🎨 Mejoras aplicadas: Framer Motion, validación en tiempo real, estados de carga
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { PedidoEquipoPayload, ListaEquipo } from '@/types'
import {
  Plus,
  Loader2,
  Calendar,
  FileText,
  Package,
  AlertCircle,
} from 'lucide-react'

interface Props {
  listas: ListaEquipo[]
  proyectoId: string
  responsableId: string
  onCreated: (payload: PedidoEquipoPayload) => Promise<{ id: string } | null>
  onRefresh?: () => void
}

export default function PedidoEquipoModalCrear({
  listas,
  proyectoId,
  responsableId,
  onCreated,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false)
  const [listaId, setListaId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ listaId?: string; fechaNecesaria?: string }>({})

  // Validation function
  const validateForm = () => {
    const newErrors: { listaId?: string; fechaNecesaria?: string } = {}
    
    if (!listaId.trim()) {
      newErrors.listaId = 'Debe seleccionar una lista técnica'
    }
    
    if (!fechaNecesaria) {
      newErrors.fechaNecesaria = 'La fecha necesaria es obligatoria'
    } else {
      const selectedDate = new Date(fechaNecesaria)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        newErrors.fechaNecesaria = 'La fecha no puede ser anterior a hoy'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Reset form
  const resetForm = () => {
    setListaId('')
    setObservacion('')
    setFechaNecesaria(format(new Date(), 'yyyy-MM-dd'))
    setErrors({})
  }

  // Get selected list details
  const selectedList = listas.find(lista => lista.id === listaId)

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Por favor, corrija los errores en el formulario')
      return
    }

    try {
      setLoading(true)

      const payload: PedidoEquipoPayload = {
        proyectoId,
        responsableId,
        listaId,
        observacion: observacion.trim() || undefined,
        fechaNecesaria: new Date(fechaNecesaria).toISOString(),
      }

      const nuevo = await onCreated(payload)
      if (!nuevo?.id) throw new Error('No se creó el pedido')

      toast.success('✅ Pedido creado exitosamente')
      onRefresh?.()
      setOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error al crear pedido:', err)
      toast.error('Error al crear el pedido. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      resetForm()
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Crear Pedido
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Package className="w-6 h-6 mr-2 text-blue-600" />
              Crear Nuevo Pedido de Equipos
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Complete la información para generar un nuevo pedido de equipos
            </p>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Lista Técnica Selection */}
            <div className="space-y-2">
              <Label htmlFor="lista" className="text-sm font-medium text-gray-700 flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Lista Técnica *
              </Label>
              <select
                id="lista"
                value={listaId}
                onChange={(e) => {
                  setListaId(e.target.value)
                  if (errors.listaId) {
                    setErrors(prev => ({ ...prev, listaId: undefined }))
                  }
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.listaId
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={loading}
              >
                <option value="">Seleccionar lista técnica...</option>
                {listas.map((lista) => (
                  <option key={lista.id} value={lista.id}>
                    {lista.nombre}
                  </option>
                ))}
              </select>
              {errors.listaId && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 flex items-center"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.listaId}
                </motion.p>
              )}
            </div>

            {/* Selected List Preview */}
            {selectedList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">{selectedList.nombre}</h4>
                        <p className="text-sm text-blue-700">
                          Código: {selectedList.codigo}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        Lista Seleccionada
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Fecha Necesaria */}
            <div className="space-y-2">
              <Label htmlFor="fecha" className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Fecha Necesaria *
              </Label>
              <Input
                id="fecha"
                type="date"
                value={fechaNecesaria}
                onChange={(e) => {
                  setFechaNecesaria(e.target.value)
                  if (errors.fechaNecesaria) {
                    setErrors(prev => ({ ...prev, fechaNecesaria: undefined }))
                  }
                }}
                className={`${
                  errors.fechaNecesaria
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={loading}
              />
              {errors.fechaNecesaria && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 flex items-center"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.fechaNecesaria}
                </motion.p>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observacion" className="text-sm font-medium text-gray-700 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Observaciones
              </Label>
              <textarea
                id="observacion"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Observaciones adicionales o instrucciones especiales..."
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !listaId}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando pedido...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Pedido
                </>
              )}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
