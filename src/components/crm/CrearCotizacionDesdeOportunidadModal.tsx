'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createCotizacion, createCotizacionFromPlantilla, updateCotizacion } from '@/lib/services/cotizacion'
import { updateOportunidad } from '@/lib/services/crm/oportunidades'
import { getPlantillas } from '@/lib/services/plantilla'
import type { Plantilla } from '@/types'
import type { CrmOportunidad } from '@/lib/services/crm/oportunidades'
import {
  Plus,
  Loader2,
  FileText,
  Hash,
  AlertCircle,
  CheckCircle2,
  Settings,
  Package,
  DollarSign,
  Users
} from 'lucide-react'

interface CrearCotizacionDesdeOportunidadModalProps {
  oportunidad: CrmOportunidad
  onSuccess: (cotizacionId: string) => void
  onClose: () => void
}

type CreacionMode = 'blank' | 'template'

export default function CrearCotizacionDesdeOportunidadModal({
  oportunidad,
  onSuccess,
  onClose
}: CrearCotizacionDesdeOportunidadModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState<CreacionMode | null>(null)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [selectedPlantilla, setSelectedPlantilla] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewCodigo, setPreviewCodigo] = useState<string>('')

  // Load plantillas when modal opens
  useEffect(() => {
    if (open) {
      loadPlantillas()
      generatePreviewCode()
    }
  }, [open])

  const loadPlantillas = async () => {
    try {
      // Solo cargar plantillas completas para creación inicial de cotizaciones
      const response = await fetch('/api/plantilla?tipo=completa')
      if (!response.ok) {
        throw new Error('Error al cargar plantillas')
      }
      const plantillasData = await response.json()
      setPlantillas(plantillasData)
    } catch (error) {
      console.error('Error loading plantillas:', error)
      setError('No se pudieron cargar las plantillas.')
    }
  }

  const generatePreviewCode = async () => {
    try {
      const response = await fetch('/api/cotizacion/next-code')
      if (response.ok) {
        const data = await response.json()
        setPreviewCodigo(data.codigo)
      } else {
        // Fallback to static code if API fails
        const currentYear = new Date().getFullYear()
        const yearSuffix = currentYear.toString().slice(-2)
        setPreviewCodigo(`GYS-XXXX-${yearSuffix}`)
      }
    } catch (error) {
      console.error('Error generating preview code:', error)
      // Fallback to static code if API fails
      const currentYear = new Date().getFullYear()
      const yearSuffix = currentYear.toString().slice(-2)
      setPreviewCodigo(`GYS-XXXX-${yearSuffix}`)
    }
  }

  const handleClose = () => {
    if (!creating) {
      setOpen(false)
      setMode(null)
      setSelectedPlantilla('')
      setError(null)
      onClose()
    }
  }

  const handleCrearCotizacion = async () => {
    if (!mode) {
      setError('Debe seleccionar un método de creación.')
      return
    }

    if (mode === 'template' && !selectedPlantilla) {
      setError('Debe seleccionar una plantilla.')
      return
    }

    try {
      setCreating(true)
      setError(null)

      // ✅ Usar la nueva API que incluye validación de una cotización por oportunidad
      const response = await fetch(`/api/crm/oportunidades/${oportunidad.id}/cotizaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plantillaId: mode === 'template' ? selectedPlantilla : null,
          nombre: oportunidad.nombre
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear la cotización')
      }

      const nuevaCotizacion = await response.json()

      toast.success(`Cotización ${nuevaCotizacion.codigo} creada y enlazada a la oportunidad`)
      onSuccess(nuevaCotizacion.id)
      handleClose()

      // Redirigir a la página de edición de cotización (client-side navigation)
      router.push(`/comercial/cotizaciones/${nuevaCotizacion.id}`)

    } catch (error: any) {
      console.error('Error al crear cotización:', error)
      setError(error?.message || 'No se pudo crear la cotización.')
      toast.error('Error al crear la cotización')
    } finally {
      setCreating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-blue-600" />
            Crear Cotización desde Oportunidad
          </DialogTitle>
          <DialogDescription>
            Crea una cotización basada en la oportunidad "{oportunidad.nombre}"
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
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

          {/* Oportunidad Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Oportunidad: {oportunidad.nombre}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-blue-700">
                  <span>Valor estimado: {oportunidad.valorEstimado ? formatCurrency(oportunidad.valorEstimado) : 'N/A'}</span>
                  <span>Probabilidad: {oportunidad.probabilidad}%</span>
                  <Badge variant="outline" className="text-xs">
                    {oportunidad.estado}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Método de Creación */}
          {!mode && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">¿Cómo deseas crear la cotización?</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opción: Cotización Nueva */}
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
                  onClick={() => setMode('blank')}
                >
                  <CardContent className="p-6 text-center">
                    <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h4 className="font-medium mb-2">Cotización Nueva</h4>
                    <p className="text-sm text-muted-foreground">
                      Crear una cotización desde cero con la información básica de la oportunidad
                    </p>
                  </CardContent>
                </Card>

                {/* Opción: Desde Plantilla */}
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-green-300"
                  onClick={() => setMode('template')}
                >
                  <CardContent className="p-6 text-center">
                    <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h4 className="font-medium mb-2">Desde Plantilla</h4>
                    <p className="text-sm text-muted-foreground">
                      Usar una plantilla existente con equipos, servicios y gastos predefinidos
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Configuración de Cotización Nueva */}
          {mode === 'blank' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Cotización Nueva</h4>
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  Cambiar método
                </Button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Se creará una cotización básica con la información de la oportunidad.
                  Podrás agregar equipos, servicios y gastos después de crearla.
                </p>
              </div>
            </motion.div>
          )}

          {/* Selección de Plantilla */}
          {mode === 'template' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Seleccionar Plantilla</h4>
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  Cambiar método
                </Button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {plantillas.map((plantilla) => (
                  <Card
                    key={plantilla.id}
                    className={`cursor-pointer transition-all ${
                      selectedPlantilla === plantilla.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlantilla(plantilla.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <h5 className="font-medium">{plantilla.nombre}</h5>
                            {selectedPlantilla === plantilla.id && (
                              <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Cliente: {formatCurrency(plantilla.totalCliente || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Interno: {formatCurrency(plantilla.totalInterno || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {plantillas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay plantillas disponibles</p>
                    <p className="text-xs mt-1">Crea plantillas primero en la sección de Plantillas</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

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
        </motion.div>

        <DialogFooter className="flex items-center justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={creating}
          >
            Cancelar
          </Button>

          <div className="flex gap-2">
            {mode && (
              <Button
                variant="outline"
                onClick={() => setMode(null)}
                disabled={creating}
              >
                ← Volver
              </Button>
            )}

            <Button
              onClick={handleCrearCotizacion}
              disabled={!mode || (mode === 'template' && !selectedPlantilla) || creating}
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}