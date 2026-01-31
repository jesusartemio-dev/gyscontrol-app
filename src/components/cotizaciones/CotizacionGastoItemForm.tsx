'use client'

// ===================================================
// 📁 Archivo: CotizacionGastoItemForm.tsx
// 📌 Descripción: Formulario para agregar ítems de gasto a una CotizaciónGasto
// ===================================================

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import * as z from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Calculator, DollarSign, Percent, Shield, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createCotizacionGastoItem } from '@/lib/services/cotizacionGastoItem'
import type { CotizacionGastoItemPayload, CotizacionGastoItem } from '@/types'
import { LoadingState, FormFieldState, StatusBadge } from '@/components/ui/visual-states'

// Validation schema
const gastoItemSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  descripcion: z.string()
    .max(255, 'La descripción no puede exceder 255 caracteres')
    .optional(),
  cantidad: z.number()
    .min(0.01, 'La cantidad debe ser mayor a 0')
    .max(999999, 'La cantidad es demasiado alta'),
  precioUnitario: z.number()
    .min(0.01, 'El precio debe ser mayor a 0')
    .max(999999999, 'El precio es demasiado alto'),
  factorSeguridad: z.number()
    .min(1, 'El factor de seguridad debe ser al menos 1')
    .max(10, 'El factor de seguridad no puede exceder 10'),
  margen: z.number()
    .min(1, 'El margen debe ser al menos 1')
    .max(10, 'El margen no puede exceder 10')
})

type FormValues = z.infer<typeof gastoItemSchema>

interface Props {
  gastoId: string
  onCreated?: (item: CotizacionGastoItem) => void
}

export default function CotizacionGastoItemForm({ gastoId, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'success' | 'error'>('idle')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const form = useForm<FormValues>({
    resolver: zodResolver(gastoItemSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      factorSeguridad: 1,
      margen: 1.25 // 25% margen por defecto para gastos
    }
  })

  const watchedValues = form.watch()
  // Nueva fórmula: costoCliente es el cálculo directo, costoInterno se deriva del margen
  const costoCliente = (watchedValues.cantidad || 0) * (watchedValues.precioUnitario || 0) * (watchedValues.factorSeguridad || 1)
  const margenValue = watchedValues.margen || 1.25
  const costoInterno = costoCliente / margenValue
  const rentabilidad = costoInterno > 0 ? ((costoCliente - costoInterno) / costoInterno) * 100 : 0

  const onSubmit = async (data: FormValues) => {
    try {
      // Validation state
      setValidationState('validating')
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulated validation delay
      setValidationState('success')
      
      // Submit state
      setSubmitState('submitting')
      setLoading(true)

      const payload: CotizacionGastoItemPayload = {
        gastoId,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        cantidad: data.cantidad,
        precioUnitario: data.precioUnitario,
        factorSeguridad: data.factorSeguridad,
        margen: data.margen,
        costoInterno,
        costoCliente,
      }

      const nuevo = await createCotizacionGastoItem(payload)
      
      setSubmitState('success')
      toast.success('💰 Ítem de gasto agregado exitosamente')

      if (nuevo) {
        onCreated?.(nuevo)
      }

      // Reset after success animation
      setTimeout(() => {
        form.reset()
        setValidationState('idle')
        setSubmitState('idle')
      }, 1500)
    } catch (err) {
      console.error(err)
      setSubmitState('error')
      setValidationState('error')
      toast.error('❌ Error al agregar ítem de gasto')
      
      // Reset error state after delay
      setTimeout(() => {
        setSubmitState('idle')
        setValidationState('idle')
      }, 3000)
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
      <Card className="border-orange-200 shadow-sm">
        <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Calculator className="h-5 w-5 text-orange-500" />
            </div>
            Agregar Ítem de Gasto
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Nombre del Gasto *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Transporte, Combustible..."
                          {...field}
                          className="focus:border-orange-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Detalle opcional del gasto"
                          {...field}
                          className="focus:border-orange-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Quantities and Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          step="0.01"
                          min="0.01"
                          placeholder="1.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="focus:border-orange-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="precioUnitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Precio Unitario *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="focus:border-orange-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="focus:border-orange-500"
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
                          step="0.1"
                          min="1"
                          max="10"
                          placeholder="1.0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          className="focus:border-orange-500"
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                    className={`bg-orange-500 hover:bg-orange-600 text-white px-8 transition-all duration-300 ${
                      submitState === 'success' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : submitState === 'error'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-orange-500 hover:bg-orange-600'
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
                          Agregar Ítem
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
