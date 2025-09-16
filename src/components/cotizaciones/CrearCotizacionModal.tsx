/**
 * 🎯 CrearCotizacionModal - Modal para crear cotización desde plantilla
 * 
 * Funcionalidades:
 * - Selección de cliente con búsqueda
 * - Preview del código automático que se generará
 * - Validación y feedback visual
 * - Animaciones fluidas con Framer Motion
 * - UX/UI moderna siguiendo estándares GYS
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import ClienteSelector from '@/components/cotizaciones/ClienteSelector'
import { createCotizacionFromPlantilla } from '@/lib/services/cotizacion'
import { getPlantillaById } from '@/lib/services/plantilla'
import type { Cotizacion, Plantilla } from '@/types'
import {
  Plus,
  Loader2,
  FileText,
  User,
  Hash,
  AlertCircle,
  CheckCircle2,
  Settings
} from 'lucide-react'

interface CrearCotizacionModalProps {
  plantillaId: string
  onSuccess: (cotizacionId: string) => void
}

export default function CrearCotizacionModal({
  plantillaId,
  onSuccess
}: CrearCotizacionModalProps) {
  const [open, setOpen] = useState(false)
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewCodigo, setPreviewCodigo] = useState<string>('')

  // ✅ Load plantilla and generate preview code when modal opens
  useEffect(() => {
    if (open && plantillaId) {
      loadPlantilla()
      // Generate preview code (this will be the actual format)
      const currentYear = new Date().getFullYear()
      const yearSuffix = currentYear.toString().slice(-2)
      // For preview, show the format with leading zeros (4 digits)
      const previewCode = `GYS-XXXX-${yearSuffix}`
      setPreviewCodigo(previewCode)
    }
  }, [open, plantillaId])

  // ✅ Load plantilla data
  const loadPlantilla = async () => {
    try {
      const plantillaData = await getPlantillaById(plantillaId)
      setPlantilla(plantillaData)
    } catch (error) {
      console.error('❌ Error loading plantilla:', error)
      setError('No se pudo cargar la información de la plantilla.')
    }
  }

  // ✅ Reset form when modal closes
  const handleClose = () => {
    if (!creating) {
      setClienteIdSeleccionado('')
      setError(null)
      setPreviewCodigo('')
      setPlantilla(null)
      setOpen(false)
    }
  }

  // ✅ Handle cotization creation
  const handleCrearCotizacion = async () => {
    if (!clienteIdSeleccionado) {
      setError('Debe seleccionar un cliente para continuar.')
      return
    }

    try {
      setCreating(true)
      setError(null)
      
      console.log('🚀 Creando cotización desde plantilla:', {
        plantillaId,
        clienteId: clienteIdSeleccionado
      })

      const nuevaCotizacion = await createCotizacionFromPlantilla({
        plantillaId,
        clienteId: clienteIdSeleccionado
      })

      console.log('✅ Cotización creada:', nuevaCotizacion)
      
      toast.success(`Cotización ${nuevaCotizacion.codigo} creada exitosamente`)
      onSuccess(nuevaCotizacion.id)
      handleClose()
    } catch (error: any) {
      console.error('❌ Error al crear cotización:', error)
      setError(error?.message || 'No se pudo crear la cotización.')
      toast.error('Error al crear la cotización')
    } finally {
      setCreating(false)
    }
  }

  // 🎨 Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: -20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.1,
        duration: 0.3
      }
    }
  }

  return (
    <>
      {/* Trigger Button - Simple and compact */}
      <Button 
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Crear Cotización
      </Button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings className="h-5 w-5 text-blue-600" />
              Crear Cotización
            </DialogTitle>
            <DialogDescription>
              Selecciona un cliente para generar una cotización basada en la plantilla{plantilla?.nombre ? ` "${plantilla.nombre}"` : ''}
            </DialogDescription>
          </DialogHeader>

        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Client Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Cliente *
              </label>
            </div>
            <ClienteSelector 
              selectedId={clienteIdSeleccionado} 
              onChange={setClienteIdSeleccionado}
            />
          </div>

          <Separator />

          {/* Code Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Código de Cotización
              </label>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {previewCodigo || 'GYS-XXXX-XX'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Se generará automáticamente
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Automático
                </Badge>
              </div>
            </div>
          </div>

          {/* Plantilla Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Plantilla: {plantilla?.nombre || 'Cargando...'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Se copiará toda la estructura de equipos, servicios y gastos
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <DialogFooter className="flex items-center justify-between pt-6">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={creating}
          >
            Cancelar
          </Button>
          
          <Button 
            onClick={handleCrearCotizacion}
            disabled={!clienteIdSeleccionado || creating}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Crear Cotización
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}