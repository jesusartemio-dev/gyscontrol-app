'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { toast } from 'sonner'
import type { CatalogoEquipo, CotizacionEquipoItem, CotizacionEquipoItemPayload } from '@/types'
import { createCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItem'
import EquipoCatalogoModal from '@/components/catalogo/EquipoCatalogoModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Search, Calculator, DollarSign, Package, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { LoadingState, FormFieldState, StatusBadge } from '@/components/ui/visual-states'

// Validation schema
const equipoItemSchema = z.object({
  cantidad: z.number().min(1, 'La cantidad debe ser mayor a 0')
})

type FormValues = z.infer<typeof equipoItemSchema>

interface Props {
  cotizacionEquipoId: string
  onCreated: (item: CotizacionEquipoItem) => void
}

export default function CotizacionEquipoItemForm({ cotizacionEquipoId, onCreated }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [equipo, setEquipo] = useState<CatalogoEquipo | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'success' | 'error'>('idle')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const form = useForm<FormValues>({
    resolver: zodResolver(equipoItemSchema),
    defaultValues: {
      cantidad: 1
    }
  })

  const watchedValues = form.watch()
  const costoInterno = equipo ? (watchedValues.cantidad || 0) * equipo.precioInterno : 0
  const costoCliente = equipo ? (watchedValues.cantidad || 0) * equipo.precioVenta : 0
  const rentabilidad = costoInterno > 0 ? ((costoCliente - costoInterno) / costoInterno) * 100 : 0

  const onSubmit = async (data: FormValues) => {
    if (!equipo) {
      setValidationState('error')
      toast.error('Selecciona un equipo antes de agregar')
      return
    }

    if (!equipo.categoria?.nombre || !equipo.unidad?.nombre) {
      setValidationState('error')
      toast.error('Este equipo no tiene categoría o unidad asignada')
      return
    }

    try {
      setSubmitState('submitting')
      setLoading(true)

      // Simulate validation delay for better UX
      setValidationState('validating')
      await new Promise(resolve => setTimeout(resolve, 500))
      setValidationState('success')

      const payload: CotizacionEquipoItemPayload = {
        cotizacionEquipoId,
        catalogoEquipoId: equipo.id,
        codigo: equipo.codigo,
        descripcion: equipo.descripcion,
        categoria: equipo.categoria.nombre,
        unidad: equipo.unidad.nombre,
        marca: equipo.marca,
        precioInterno: equipo.precioInterno,
        precioCliente: equipo.precioVenta,
        cantidad: data.cantidad,
        costoInterno,
        costoCliente
      }

      const creado = await createCotizacionEquipoItem(payload)
      
      setSubmitState('success')
      toast.success('✅ Equipo agregado exitosamente')
      
      // Show success state briefly before resetting
      setTimeout(() => {
        onCreated(creado)
        form.reset()
        setEquipo(null)
        setValidationState('idle')
        setSubmitState('idle')
      }, 1000)
      
    } catch (err) {
      console.error('❌ Error al crear ítem de cotización:', err)
      setSubmitState('error')
      setValidationState('error')
      toast.error('❌ Error al agregar equipo')
    } finally {
      setLoading(false)
    }
  }

  const handleEquipoSelect = (selectedEquipo: CatalogoEquipo) => {
    setEquipo(selectedEquipo)
    setModalAbierto(false)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-red-200 shadow-sm">
          <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Plus className="h-5 w-5 text-red-500" />
              </div>
              Agregar Equipo
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
                {/* Equipment Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Selección de Equipo *
                      <AnimatePresence>
                        {validationState === 'success' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </motion.div>
                        )}
                        {validationState === 'error' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Label>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalAbierto(true)}
                    className="w-full justify-start h-auto p-4 border-dashed border-2 hover:border-red-300 focus:border-red-500"
                  >
                    {equipo ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="text-left">
                          <div className="font-semibold">{equipo.codigo}</div>
                          <div className="text-sm text-muted-foreground">{equipo.descripcion}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {equipo.categoria?.nombre} • {equipo.unidad?.nombre} • {equipo.marca}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Precio Cliente</div>
                          <div className="font-semibold text-green-600">
                            ${equipo.precioVenta.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Search className="h-4 w-4" />
                        Seleccionar equipo del catálogo
                      </div>
                    )}
                  </Button>
                </div>

                {/* Quantity */}
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
                          className="focus:border-red-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cost Preview */}
                {equipo && (costoInterno > 0 || costoCliente > 0) && (
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
                      disabled={loading || !equipo || !form.formState.isValid || submitState === 'submitting'}
                      className={`px-8 text-white transition-all duration-300 ${
                        submitState === 'success' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : submitState === 'error'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-red-500 hover:bg-red-600'
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
                            Agregar Equipo
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

      <EquipoCatalogoModal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSeleccionar={handleEquipoSelect}
      />
    </>
  )
}
