'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { toast } from 'sonner'
import { calcularHoras } from '@/lib/utils/formulas'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import type { CotizacionServicioItemPayload, TipoFormula } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Settings, Calculator, DollarSign, Clock, Loader2, Shield, Percent, CheckCircle2, AlertTriangle } from 'lucide-react'
import { LoadingState, FormFieldState, StatusBadge } from '@/components/ui/visual-states'

// Validation schema
const servicioItemSchema = z.object({
  cantidad: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  factorSeguridad: z.number().min(1, 'El factor de seguridad debe ser mayor o igual a 1'),
  margen: z.number().min(1, 'El margen debe ser mayor o igual a 1')
})

type FormValues = z.infer<typeof servicioItemSchema>

interface Props {
  grupoId: string
  catalogoId: string
  nombre: string
  descripcion: string
  edtId: string
  edtNombre?: string
  formula: TipoFormula
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  unidadServicioNombre: string
  recursoNombre: string
  unidadServicioId: string
  recursoId: string
  costoHora: number
  onCreated: () => void
}

export default function CotizacionServicioItemForm({
  grupoId,
  catalogoId,
  nombre,
  descripcion,
  edtId,
  edtNombre,
  formula,
  horaBase,
  horaRepetido,
  horaUnidad,
  horaFijo,
  unidadServicioNombre,
  recursoNombre,
  unidadServicioId,
  recursoId,
  costoHora,
  onCreated
}: Props) {
  const [loading, setLoading] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'success' | 'error'>('idle')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const form = useForm<FormValues>({
    resolver: zodResolver(servicioItemSchema),
    defaultValues: {
      cantidad: 1,
      factorSeguridad: 1,
      margen: 1.35
    }
  })

  const watchedValues = form.watch()
  const horas = calcularHoras({
    formula,
    cantidad: watchedValues.cantidad || 1,
    horaBase,
    horaRepetido,
    horaUnidad,
    horaFijo
  })

  // Nueva fórmula: costoCliente es el cálculo directo, costoInterno se deriva del margen
  const costoCliente = horas * costoHora * (watchedValues.factorSeguridad || 1)
  const margenValue = watchedValues.margen || 1.35
  const costoInterno = costoCliente / margenValue
  const rentabilidad = costoInterno > 0 ? ((costoCliente - costoInterno) / costoInterno) * 100 : 0

  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitState('submitting')
      setLoading(true)

      // Simulate validation delay for better UX
      setValidationState('validating')
      await new Promise(resolve => setTimeout(resolve, 500))
      setValidationState('success')

      const payload: CotizacionServicioItemPayload = {
        cotizacionServicioId: grupoId,
        catalogoServicioId: catalogoId,
        unidadServicioId,
        recursoId,
        nombre,
        descripcion,
        edtId,
        unidadServicioNombre,
        recursoNombre,
        formula,
        horaBase,
        horaRepetido,
        horaUnidad,
        horaFijo,
        costoHora,
        cantidad: data.cantidad,
        horaTotal: horas,
        factorSeguridad: data.factorSeguridad,
        margen: data.margen,
        costoInterno,
        costoCliente
      }

      await createCotizacionServicioItem(payload)
      
      setSubmitState('success')
      toast.success('✅ Servicio agregado exitosamente')
      
      // Show success state briefly before resetting
      setTimeout(() => {
        onCreated()
        setValidationState('idle')
        setSubmitState('idle')
      }, 1000)
      
    } catch (err) {
      console.error('Error al agregar servicio:', err)
      setSubmitState('error')
      setValidationState('error')
      toast.error('❌ Error al agregar servicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-blue-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Plus className="h-5 w-5 text-blue-500" />
              </div>
              Agregar Servicio
            </div>
            <AnimatePresence>
              {submitState !== 'idle' && (
                <StatusBadge 
                  status={submitState === 'submitting' ? 'loading' : submitState === 'success' ? 'success' : 'error'}
                  label={submitState === 'submitting' ? 'Guardando...' : submitState === 'success' ? 'Guardado' : 'Error'}
                  pulse={submitState === 'submitting'}
                />
              )}
            </AnimatePresence>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Service Information */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <div className="font-semibold text-lg">{nombre}</div>
              <div className="text-sm text-muted-foreground italic">{descripcion}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  {edtNombre || 'EDT'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formula}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {recursoNombre} • {unidadServicioNombre}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${costoHora}/hora
                </Badge>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cantidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Cantidad *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          className="focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="factorSeguridad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Factor de Seguridad
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          max="10"
                          placeholder="1.0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          className="focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="margen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Margen
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="1"
                          max="10"
                          placeholder="1.35"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          className="focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Cost Preview */}
              {(costoInterno > 0 || costoCliente > 0) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <Separator className="my-4" />
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Vista Previa de Costos
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-muted-foreground mb-1">Horas Totales</div>
                        <div className="font-semibold text-lg">
                          {horas.toFixed(2)}h
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground mb-1">Costo Interno</div>
                        <div className="font-semibold text-lg">
                          ${costoInterno.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground mb-1">Costo Cliente</div>
                        <div className="font-semibold text-lg text-green-600">
                          ${costoCliente.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground mb-1">Rentabilidad</div>
                        <Badge 
                          variant={rentabilidad > 20 ? 'default' : rentabilidad > 0 ? 'secondary' : 'outline'}
                          className="font-semibold"
                        >
                          {rentabilidad.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <motion.div
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  <Button
                    type="submit"
                    disabled={loading || submitState === 'submitting' || !form.formState.isValid}
                    className={`transition-all duration-300 px-8 text-white ${
                      submitState === 'success' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : submitState === 'error'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-500 hover:bg-blue-600'
                    } disabled:opacity-50`}
                  >
                    <AnimatePresence mode="wait">
                      {submitState === 'submitting' ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center"
                        >
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Agregando...
                        </motion.div>
                      ) : submitState === 'success' ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          ¡Agregado!
                        </motion.div>
                      ) : submitState === 'error' ? (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-center"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Reintentar
                        </motion.div>
                      ) : (
                        <motion.div
                          key="default"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Servicio
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
