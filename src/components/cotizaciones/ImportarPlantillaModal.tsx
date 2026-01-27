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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Package,
  Wrench,
  Truck,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Plus,
  X,
  ListPlus
} from 'lucide-react'
import type { Plantilla } from '@/types'

interface ImportarPlantillaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cotizacionId: string
  tipo: 'equipos' | 'servicios' | 'gastos'
  onSuccess: () => void
}

interface PlantillaSeleccionada {
  id: string
  nombre: string
  totalItems: number
  totalValue: number
}

export default function ImportarPlantillaModal({
  open,
  onOpenChange,
  cotizacionId,
  tipo,
  onSuccess
}: ImportarPlantillaModalProps) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [selectedPlantillas, setSelectedPlantillas] = useState<PlantillaSeleccionada[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load plantillas when modal opens
  useEffect(() => {
    if (open) {
      loadPlantillas()
      setSelectedPlantillas([])
      setError(null)
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

  const calcularTotales = (plantilla: Plantilla) => {
    let totalItems = 0
    let totalValue = 0
    const p = plantilla as any

    if (tipo === 'equipos') {
      if (p.plantillaEquipoItemIndependiente && Array.isArray(p.plantillaEquipoItemIndependiente)) {
        totalItems = p.plantillaEquipoItemIndependiente.length
        totalValue = p.totalCliente || p.grandTotal || p.plantillaEquipoItemIndependiente.reduce((sum: number, item: any) =>
          sum + (item.costoCliente || item.precioCliente || 0), 0
        )
      } else if (p.plantillaEquipo && Array.isArray(p.plantillaEquipo)) {
        totalItems = p.plantillaEquipo.reduce((acc: number, e: any) => acc + (e.plantillaEquipoItem?.length || 0), 0)
        totalValue = p.totalEquiposCliente || 0
      }
    } else if (tipo === 'servicios') {
      if (p.plantillaServicioItemIndependiente && Array.isArray(p.plantillaServicioItemIndependiente)) {
        totalItems = p.plantillaServicioItemIndependiente.length
        totalValue = p.totalCliente || p.grandTotal || p.plantillaServicioItemIndependiente.reduce((sum: number, item: any) =>
          sum + (item.costoCliente || item.precioCliente || 0), 0
        )
      } else if (p.plantillaServicio && Array.isArray(p.plantillaServicio)) {
        totalItems = p.plantillaServicio.reduce((acc: number, s: any) => acc + (s.plantillaServicioItem?.length || 0), 0)
        totalValue = p.totalServiciosCliente || 0
      }
    } else if (tipo === 'gastos') {
      if (p.plantillaGastoItemIndependiente && Array.isArray(p.plantillaGastoItemIndependiente)) {
        totalItems = p.plantillaGastoItemIndependiente.length
        totalValue = p.totalCliente || p.grandTotal || p.plantillaGastoItemIndependiente.reduce((sum: number, item: any) =>
          sum + (item.costoCliente || item.precioCliente || 0), 0
        )
      } else if (p.plantillaGasto && Array.isArray(p.plantillaGasto)) {
        totalItems = p.plantillaGasto.reduce((acc: number, g: any) => acc + (g.plantillaGastoItem?.length || 0), 0)
        totalValue = p.totalGastosCliente || 0
      }
    }

    if (totalItems === 0 && p._count) {
      totalItems = p._count.plantillaServicioItemIndependiente ||
                   p._count.plantillaEquipoItemIndependiente ||
                   p._count.plantillaGastoItemIndependiente || 0
    }

    return { totalItems, totalValue }
  }

  const togglePlantillaSelection = (plantilla: Plantilla) => {
    const isSelected = selectedPlantillas.some(p => p.id === plantilla.id)

    if (isSelected) {
      setSelectedPlantillas(prev => prev.filter(p => p.id !== plantilla.id))
    } else {
      const { totalItems, totalValue } = calcularTotales(plantilla)
      setSelectedPlantillas(prev => [...prev, {
        id: plantilla.id,
        nombre: plantilla.nombre,
        totalItems,
        totalValue
      }])
    }
  }

  const removeFromSelection = (plantillaId: string) => {
    setSelectedPlantillas(prev => prev.filter(p => p.id !== plantillaId))
  }

  const handleImportar = async () => {
    if (selectedPlantillas.length === 0) {
      setError('Debe seleccionar al menos una plantilla.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      let totalElementosImportados = 0

      // Import each selected plantilla sequentially
      for (const plantilla of selectedPlantillas) {
        const response = await fetch(`/api/cotizaciones/${cotizacionId}/importar-plantilla`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plantillaId: plantilla.id,
            tipo: tipo
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Error al importar plantilla "${plantilla.nombre}"`)
        }

        const result = await response.json()
        totalElementosImportados += result.equiposImportados || result.serviciosImportados || result.gastosImportados || 0
      }

      toast.success(`${selectedPlantillas.length} plantilla(s) importada(s) exitosamente. Se agregaron ${totalElementosImportados} elementos.`)

      await onSuccess()
      onOpenChange(false)
      setSelectedPlantillas([])

    } catch (error: any) {
      console.error('Error al importar plantillas:', error)
      setError(error?.message || 'No se pudieron importar las plantillas.')
      toast.error('Error al importar las plantillas')
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
          titulo: 'Importar Plantillas de Equipos',
          descripcion: 'Selecciona las plantillas de equipos para agregar a esta cotización',
          icono: Wrench,
          color: 'text-orange-600'
        }
      case 'servicios':
        return {
          titulo: 'Importar Plantillas de Servicios',
          descripcion: 'Selecciona las plantillas de servicios para agregar a esta cotización',
          icono: Truck,
          color: 'text-green-600'
        }
      case 'gastos':
        return {
          titulo: 'Importar Plantillas de Gastos',
          descripcion: 'Selecciona las plantillas de gastos para agregar a esta cotización',
          icono: DollarSign,
          color: 'text-purple-600'
        }
      default:
        return {
          titulo: 'Importar Plantillas',
          descripcion: 'Selecciona las plantillas para importar',
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

  const totalSeleccionado = selectedPlantillas.reduce((sum, p) => sum + p.totalValue, 0)
  const totalItemsSeleccionados = selectedPlantillas.reduce((sum, p) => sum + p.totalItems, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SeccionIcono className={`h-5 w-5 ${seccionInfo.color}`} />
            {seccionInfo.titulo}
          </DialogTitle>
          <DialogDescription>
            {seccionInfo.descripcion}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
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
              Selecciona múltiples plantillas y haz clic en "Agregar" para añadirlas a la lista.
              Luego importa todas con el botón "Importar Seleccionadas".
            </AlertDescription>
          </Alert>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
            {/* Plantillas disponibles */}
            <div className="flex flex-col min-h-0">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Plantillas Disponibles
              </h4>
              <ScrollArea className="flex-1 border rounded-lg p-2">
                <div className="space-y-2">
                  {plantillas.map((plantilla) => {
                    const tipoInfo = getTipoInfo(plantilla.tipo || 'completa')
                    const TipoIcon = tipoInfo.icon
                    const isSelected = selectedPlantillas.some(p => p.id === plantilla.id)
                    const { totalItems, totalValue } = calcularTotales(plantilla)

                    return (
                      <Card
                        key={plantilla.id}
                        className={`transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50 opacity-60'
                            : 'hover:border-blue-300 cursor-pointer'
                        }`}
                        onClick={() => !isSelected && togglePlantillaSelection(plantilla)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <TipoIcon className="h-4 w-4 text-blue-600 shrink-0" />
                                <h5 className="font-medium text-sm truncate">{plantilla.nombre}</h5>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                            {!isSelected && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePlantillaSelection(plantilla)
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
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
              </ScrollArea>
            </div>

            {/* Plantillas seleccionadas */}
            <div className="flex flex-col min-h-0">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ListPlus className="h-4 w-4" />
                Plantillas a Importar
                {selectedPlantillas.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {selectedPlantillas.length}
                  </Badge>
                )}
              </h4>
              <ScrollArea className="flex-1 border rounded-lg p-2 bg-muted/30">
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {selectedPlantillas.map((plantilla) => (
                      <motion.div
                        key={plantilla.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="border-blue-200 bg-blue-50/50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm truncate">{plantilla.nombre}</h5>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>{plantilla.totalItems} items</span>
                                  <span>{formatCurrency(plantilla.totalValue)}</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeFromSelection(plantilla.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {selectedPlantillas.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay plantillas seleccionadas</p>
                      <p className="text-xs mt-1">Haz clic en una plantilla para agregarla</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Resumen de selección */}
              {selectedPlantillas.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total items:</span>
                    <span className="font-medium">{totalItemsSeleccionados}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Valor total:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(totalSeleccionado)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleImportar}
            disabled={selectedPlantillas.length === 0 || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[180px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <SeccionIcono className="w-4 h-4 mr-2" />
                Importar {selectedPlantillas.length > 0 ? `(${selectedPlantillas.length})` : ''} Seleccionadas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
