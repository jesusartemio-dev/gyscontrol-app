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
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  Package,
  Wrench,
  Truck,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react'
import type { Plantilla } from '@/types'

interface ImportarPlantillaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cotizacionId: string
  tipo: 'equipos' | 'servicios' | 'gastos'
  onSuccess: () => void
}

export default function ImportarPlantillaModal({
  open,
  onOpenChange,
  cotizacionId,
  tipo,
  onSuccess
}: ImportarPlantillaModalProps) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [selectedPlantilla, setSelectedPlantilla] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load plantillas when modal opens
  useEffect(() => {
    if (open) {
      loadPlantillas()
    }
  }, [open, tipo])

  const loadPlantillas = async () => {
    try {
      const response = await fetch(`/api/plantilla?tipo=${tipo}`)
      if (!response.ok) {
        throw new Error('Error al cargar plantillas')
      }
      const data = await response.json()
      setPlantillas(data)
    } catch (error) {
      console.error('Error loading plantillas:', error)
      setError('No se pudieron cargar las plantillas.')
    }
  }

  const handleImportar = async () => {
    if (!selectedPlantilla) {
      setError('Debe seleccionar una plantilla.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/cotizaciones/${cotizacionId}/importar-plantilla`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plantillaId: selectedPlantilla,
          tipo: tipo
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al importar plantilla')
      }

      const result = await response.json()
      toast.success(`Plantilla importada exitosamente. Se agregaron ${result.equiposImportados || result.serviciosImportados || result.gastosImportados || 0} elementos.`)

      await onSuccess()
      onOpenChange(false)
      setSelectedPlantilla('')

    } catch (error: any) {
      console.error('Error al importar plantilla:', error)
      setError(error?.message || 'No se pudo importar la plantilla.')
      toast.error('Error al importar la plantilla')
    } finally {
      setLoading(false)
    }
  }

  const getTipoInfo = (tipoPlantilla: string) => {
    switch (tipoPlantilla) {
      case 'completa':
        return {
          label: 'Completa',
          icon: Package,
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      case 'equipos':
        return {
          label: 'Equipos',
          icon: Wrench,
          color: 'bg-orange-100 text-orange-800 border-orange-200'
        }
      case 'servicios':
        return {
          label: 'Servicios',
          icon: Truck,
          color: 'bg-green-100 text-green-800 border-green-200'
        }
      case 'gastos':
        return {
          label: 'Gastos',
          icon: DollarSign,
          color: 'bg-purple-100 text-purple-800 border-purple-200'
        }
      default:
        return {
          label: tipoPlantilla,
          icon: Package,
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
  }

  const getSeccionInfo = () => {
    switch (tipo) {
      case 'equipos':
        return {
          titulo: 'Importar Plantilla de Equipos',
          descripcion: 'Selecciona una plantilla de equipos para agregar a esta cotización',
          icono: Wrench,
          color: 'text-orange-600'
        }
      case 'servicios':
        return {
          titulo: 'Importar Plantilla de Servicios',
          descripcion: 'Selecciona una plantilla de servicios para agregar a esta cotización',
          icono: Truck,
          color: 'text-green-600'
        }
      case 'gastos':
        return {
          titulo: 'Importar Plantilla de Gastos',
          descripcion: 'Selecciona una plantilla de gastos para agregar a esta cotización',
          icono: DollarSign,
          color: 'text-purple-600'
        }
      default:
        return {
          titulo: 'Importar Plantilla',
          descripcion: 'Selecciona una plantilla para importar',
          icono: Package,
          color: 'text-blue-600'
        }
    }
  }

  const seccionInfo = getSeccionInfo()
  const SeccionIcono = seccionInfo.icono

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SeccionIcono className={`h-5 w-5 ${seccionInfo.color}`} />
            {seccionInfo.titulo}
          </DialogTitle>
          <DialogDescription>
            {seccionInfo.descripcion}
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

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Los elementos importados se agregarán como nuevas secciones a esta cotización.
              Puedes modificarlos después de la importación.
            </AlertDescription>
          </Alert>

          {/* Plantillas List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {plantillas.map((plantilla) => {
              const tipoInfo = getTipoInfo(plantilla.tipo || 'completa')
              const TipoIcon = tipoInfo.icon

              // Calculate totals based on tipo and plantilla structure
              let totalItems = 0
              let totalValue = 0

              const p = plantilla as any

              // Check for independent templates first (they have specific item arrays)
              if (tipo === 'equipos') {
                if (p.plantillaEquipoItemIndependiente && Array.isArray(p.plantillaEquipoItemIndependiente)) {
                  // Independent equipment template
                  totalItems = p.plantillaEquipoItemIndependiente.length
                  totalValue = p.totalCliente || p.grandTotal || p.plantillaEquipoItemIndependiente.reduce((sum: number, item: any) =>
                    sum + (item.costoCliente || item.precioCliente || 0), 0
                  )
                } else if (p.plantillaEquipo && Array.isArray(p.plantillaEquipo)) {
                  // Complete template with equipment sections
                  totalItems = p.plantillaEquipo.reduce((acc: number, e: any) => acc + (e.plantillaEquipoItem?.length || 0), 0)
                  totalValue = p.totalEquiposCliente || 0
                }
              } else if (tipo === 'servicios') {
                if (p.plantillaServicioItemIndependiente && Array.isArray(p.plantillaServicioItemIndependiente)) {
                  // Independent service template
                  totalItems = p.plantillaServicioItemIndependiente.length
                  totalValue = p.totalCliente || p.grandTotal || p.plantillaServicioItemIndependiente.reduce((sum: number, item: any) =>
                    sum + (item.costoCliente || item.precioCliente || 0), 0
                  )
                } else if (p.plantillaServicio && Array.isArray(p.plantillaServicio)) {
                  // Complete template with service sections
                  totalItems = p.plantillaServicio.reduce((acc: number, s: any) => acc + (s.plantillaServicioItem?.length || 0), 0)
                  totalValue = p.totalServiciosCliente || 0
                }
              } else if (tipo === 'gastos') {
                if (p.plantillaGastoItemIndependiente && Array.isArray(p.plantillaGastoItemIndependiente)) {
                  // Independent expense template
                  totalItems = p.plantillaGastoItemIndependiente.length
                  totalValue = p.totalCliente || p.grandTotal || p.plantillaGastoItemIndependiente.reduce((sum: number, item: any) =>
                    sum + (item.costoCliente || item.precioCliente || 0), 0
                  )
                } else if (p.plantillaGasto && Array.isArray(p.plantillaGasto)) {
                  // Complete template with expense sections
                  totalItems = p.plantillaGasto.reduce((acc: number, g: any) => acc + (g.plantillaGastoItem?.length || 0), 0)
                  totalValue = p.totalGastosCliente || 0
                }
              }

              // Fallback: use _count if available
              if (totalItems === 0 && p._count) {
                totalItems = p._count.plantillaServicioItemIndependiente ||
                             p._count.plantillaEquipoItemIndependiente ||
                             p._count.plantillaGastoItemIndependiente || 0
              }

              return (
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
                          <TipoIcon className="h-4 w-4 text-blue-600" />
                          <h5 className="font-medium">{plantilla.nombre}</h5>
                          {selectedPlantilla === plantilla.id && (
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {totalItems} items
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(totalValue)}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {tipoInfo.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {plantillas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <SeccionIcono className={`h-8 w-8 mx-auto mb-2 ${seccionInfo.color} opacity-50`} />
                <p className="text-sm">No hay plantillas disponibles para {tipo}</p>
                <p className="text-xs mt-1">Crea plantillas especializadas primero</p>
              </div>
            )}
          </div>
        </motion.div>

        <DialogFooter className="flex items-center justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleImportar}
            disabled={!selectedPlantilla || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <SeccionIcono className="w-4 h-4 mr-2" />
                Importar Plantilla
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}