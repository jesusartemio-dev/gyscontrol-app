'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, AlertTriangle, Award, DollarSign, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface SelectionSummary {
  totalItems: number
  selectedWinners: number
  totalSavings: number
  averageDeliveryTime: number
}

interface WinnerSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  selections: Record<string, string | null>
  onConfirm: () => void
  summary: SelectionSummary
}

export default function WinnerSelectionModal({
  isOpen,
  onClose,
  selections,
  onConfirm,
  summary
}: WinnerSelectionModalProps) {
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm()
      toast.success('Ganadores seleccionados exitosamente')
      onClose()
    } catch (error) {
      console.error('Error confirming selections:', error)
      toast.error('Error al confirmar selecciones')
    } finally {
      setConfirming(false)
    }
  }

  const completionPercentage = summary.totalItems > 0
    ? (summary.selectedWinners / summary.totalItems) * 100
    : 0

  const canConfirm = summary.selectedWinners > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Award className="h-5 w-5 text-blue-600" />
             Resumen de Selecciones de Ganadores
           </DialogTitle>
         </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalItems}</div>
                <div className="text-sm text-muted-foreground">Total Ítems</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.selectedWinners}</div>
                <div className="text-sm text-muted-foreground">Ganadores</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${summary.totalSavings.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Ahorro Total</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {summary.averageDeliveryTime.toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Días Promedio</div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso de selección</span>
              <span>{completionPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          <Separator />

          {/* Selection Details */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Resumen de Selecciones</h3>

            {summary.selectedWinners === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No has seleccionado ningún ganador</p>
                <p className="text-sm">Selecciona al menos un ganador para continuar</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {summary.selectedWinners} de {summary.totalItems} ítems tienen ganador seleccionado
                  </span>
                </div>

                {summary.totalSavings > 0 && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Ahorro estimado: ${summary.totalSavings.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-orange-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Tiempo de entrega promedio: {summary.averageDeliveryTime.toFixed(1)} días
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Warnings */}
          {summary.selectedWinners > 0 && summary.selectedWinners < summary.totalItems && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">
                    Selección incompleta
                  </h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    Has seleccionado ganadores para {summary.selectedWinners} de {summary.totalItems} ítems.
                    Los ítems sin selección permanecerán sin asignar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
           <DialogFooter className="gap-3">
             <Button variant="outline" onClick={onClose}>
               Cerrar
             </Button>
             <Button
               onClick={onClose}
               className="bg-green-600 hover:bg-green-700"
             >
               <CheckCircle className="h-4 w-4 mr-2" />
               Aceptar
             </Button>
           </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
