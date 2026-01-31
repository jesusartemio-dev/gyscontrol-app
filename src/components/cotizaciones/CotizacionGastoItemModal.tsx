// ===================================================
// 📁 Archivo: CotizacionGastoItemModal.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Modal para agregar ítems de gasto a una sección
// ✍️ Autor: Sistema GYS
// 📅 Fecha: 2025-01-27
// ===================================================

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  Plus,
  Loader2,
  AlertCircle,
  Receipt,
  DollarSign,
  Shield,
  Percent,
  Calculator
} from 'lucide-react'
import { createCotizacionGastoItem } from '@/lib/services/cotizacionGastoItem'
import type { CotizacionGastoItemPayload, CotizacionGastoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'

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
    .min(0, 'El precio debe ser mayor o igual a 0')
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
  onCreated: (item: CotizacionGastoItem) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function CotizacionGastoItemModal({
  gastoId,
  onCreated,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Use external control if provided, otherwise internal
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const setIsOpen = externalOnOpenChange || setInternalOpen

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

  // Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    if (!newOpen) {
      form.reset()
      setError(null)
    }
  }

  const onSubmit = async (data: FormValues) => {
    setError(null)

    try {
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

      toast.success('Item de gasto agregado', {
        description: `Se agregó "${nuevo?.nombre}"`
      })

      if (nuevo) onCreated(nuevo)
      handleOpenChange(false)
    } catch (err) {
      console.error('Error al crear item de gasto:', err)
      setError('Error al crear el item. Inténtalo nuevamente.')
      toast.error('Error al agregar item de gasto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            Agregar Item de Gasto
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo item de gasto a esta sección.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <motion.form
            onSubmit={form.handleSubmit(onSubmit)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Nombre y Descripción */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-sm">
                      <Calculator className="h-3.5 w-3.5" />
                      Nombre *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Transporte, Combustible..."
                        {...field}
                        disabled={loading}
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
                    <FormLabel className="text-sm">Descripción</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Detalle opcional"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cantidad y Precio */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cantidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-sm">
                      <Calculator className="h-3.5 w-3.5" />
                      Cantidad *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={loading}
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
                    <FormLabel className="flex items-center gap-1.5 text-sm">
                      <DollarSign className="h-3.5 w-3.5" />
                      Precio Unitario *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Factor de Seguridad y Margen */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="factorSeguridad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-sm">
                      <Shield className="h-3.5 w-3.5" />
                      Factor Seguridad
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        max="10"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                        disabled={loading}
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
                    <FormLabel className="flex items-center gap-1.5 text-sm">
                      <Percent className="h-3.5 w-3.5" />
                      Margen
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        max="10"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                        disabled={loading}
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
                transition={{ duration: 0.2 }}
              >
                <Separator className="my-3" />
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs mb-1">Costo Interno</div>
                      <div className="font-semibold">${costoInterno.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs mb-1">Costo Cliente</div>
                      <div className="font-semibold text-green-600">${costoCliente.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs mb-1">Rentabilidad</div>
                      <Badge
                        variant={rentabilidad > 20 ? 'default' : rentabilidad > 0 ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {rentabilidad.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !form.formState.isValid}
                className="min-w-[120px] bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Item
                  </>
                )}
              </Button>
            </DialogFooter>
          </motion.form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
