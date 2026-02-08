'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  CreditCard,
  Calendar,
  DollarSign,
  Save,
  Loader2,
  AlertCircle,
  Lock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { updateCotizacion } from '@/lib/services/cotizacion'
import type { Cotizacion } from '@/types'

interface CabeceraTabProps {
  cotizacion: Cotizacion
  onUpdated: (updatedCotizacion: Cotizacion) => void
  isLocked?: boolean
}

export function CabeceraTab({ cotizacion, onUpdated, isLocked = false }: CabeceraTabProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    referencia: cotizacion.referencia || '',
    formaPago: cotizacion.formaPago || '',
    validezOferta: cotizacion.validezOferta || 15,
    fechaValidezHasta: cotizacion.fechaValidezHasta ?
      new Date(cotizacion.fechaValidezHasta).toISOString().split('T')[0] : '',
    moneda: cotizacion.moneda || 'USD',
    revision: cotizacion.revision || '',
    incluyeIGV: cotizacion.incluyeIGV ?? false
  })

  useEffect(() => {
    setFormData({
      referencia: cotizacion.referencia || '',
      formaPago: cotizacion.formaPago || '',
      validezOferta: cotizacion.validezOferta || 15,
      fechaValidezHasta: cotizacion.fechaValidezHasta ?
        new Date(cotizacion.fechaValidezHasta).toISOString().split('T')[0] : '',
      moneda: cotizacion.moneda || 'USD',
      revision: cotizacion.revision || '',
      incluyeIGV: cotizacion.incluyeIGV ?? false
    })
  }, [cotizacion])

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const dataToUpdate = {
        ...formData,
        fechaValidezHasta: formData.fechaValidezHasta || null
      }

      const updatedCotizacion = await updateCotizacion(cotizacion.id, dataToUpdate)
      onUpdated(updatedCotizacion)
      setSuccess(true)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al actualizar la cabecera de la cotización')
      console.error('Error updating cotizacion header:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Cabecera de la Cotización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLocked && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              <Lock className="h-4 w-4 flex-shrink-0" />
              Esta cotización está aprobada. Los campos no pueden ser editados.
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Cabecera actualizada exitosamente
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Referencia */}
              <div className="space-y-2">
                <Label htmlFor="referencia" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Referencia
                </Label>
                <Input
                  id="referencia"
                  value={formData.referencia}
                  onChange={(e) => handleInputChange('referencia', e.target.value)}
                  placeholder="Ej: GYS-4251-25 R04"
                  disabled={isLocked}
                />
              </div>

              {/* Revisión */}
              <div className="space-y-2">
                <Label htmlFor="revision" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Revisión
                </Label>
                <Input
                  id="revision"
                  value={formData.revision}
                  onChange={(e) => handleInputChange('revision', e.target.value)}
                  placeholder="Ej: R01, R02, etc."
                  disabled={isLocked}
                />
              </div>

              {/* Forma de Pago */}
              <div className="space-y-2">
                <Label htmlFor="formaPago" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Forma de Pago
                </Label>
                <Select
                  value={formData.formaPago}
                  onValueChange={(value) => handleInputChange('formaPago', value)}
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar forma de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30% adelanto, 40% entrega, 30% conformidad">
                      30% adelanto, 40% entrega, 30% conformidad
                    </SelectItem>
                    <SelectItem value="50% adelanto, 50% entrega">
                      50% adelanto, 50% entrega
                    </SelectItem>
                    <SelectItem value="100% entrega">100% entrega</SelectItem>
                    <SelectItem value="credito-30">Crédito 30 días</SelectItem>
                    <SelectItem value="credito-60">Crédito 60 días</SelectItem>
                    <SelectItem value="credito-90">Crédito 90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Moneda */}
              <div className="space-y-2">
                <Label htmlFor="moneda" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Moneda
                </Label>
                <Select
                  value={formData.moneda}
                  onValueChange={(value) => handleInputChange('moneda', value)}
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - Dólares Americanos</SelectItem>
                    <SelectItem value="PEN">PEN - Soles Peruanos</SelectItem>
                    <SelectItem value="EUR">EUR - Euros</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              {/* Validez de Oferta */}
              <div className="space-y-2">
                <Label htmlFor="validezOferta" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Validez de Oferta (días)
                </Label>
                <Input
                  id="validezOferta"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.validezOferta}
                  onChange={(e) => handleInputChange('validezOferta', parseInt(e.target.value) || 15)}
                  disabled={isLocked}
                />
              </div>

              {/* Fecha de Validez Hasta */}
              <div className="space-y-2">
                <Label htmlFor="fechaValidezHasta" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Validez Hasta
                </Label>
                <Input
                  id="fechaValidezHasta"
                  type="date"
                  value={formData.fechaValidezHasta}
                  onChange={(e) => handleInputChange('fechaValidezHasta', e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* IGV */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="incluyeIGV"
                checked={formData.incluyeIGV}
                onChange={(e) => handleInputChange('incluyeIGV', e.target.checked)}
                className="rounded border-gray-300"
                disabled={isLocked}
              />
              <Label htmlFor="incluyeIGV" className="text-sm">
                Los precios incluyen IGV (18%)
              </Label>
            </div>

            {/* Botón de guardar */}
            {!isLocked && (
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}