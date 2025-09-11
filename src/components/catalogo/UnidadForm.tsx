// ===================================================
// 📁 Archivo: UnidadForm.tsx
// 📌 Descripción: Formulario moderno para crear o editar Unidad
// ===================================================

'use client'

import { useState } from 'react'
import { useForm, ControllerRenderProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Unidad, UnidadPayload } from '@/types'
import { createUnidad, updateUnidad } from '@/lib/services/unidad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { Loader2, Calculator, Plus, Edit3 } from 'lucide-react'

// Zod schema for validation
const unidadSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Solo se permiten letras, números, espacios, guiones y puntos')
    .trim()
})

type UnidadFormData = z.infer<typeof unidadSchema>

interface Props {
  onCreated?: (unidad: Unidad) => void
  onUpdated?: (unidad: Unidad) => void
  defaultValue?: Unidad
  isEditMode?: boolean
}

export default function UnidadForm({
  onCreated,
  onUpdated,
  defaultValue,
  isEditMode = false,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<UnidadFormData>({
    resolver: zodResolver(unidadSchema),
    defaultValues: {
      nombre: defaultValue?.nombre || ''
    }
  })

  const onSubmit = async (data: UnidadFormData) => {
    setIsSubmitting(true)

    try {
      const payload: UnidadPayload = { nombre: data.nombre.trim() }
      let response

      if (isEditMode && defaultValue?.id) {
        response = await updateUnidad(defaultValue.id, payload)
        toast.success('✅ Unidad actualizada exitosamente', {
          description: `La unidad "${data.nombre}" ha sido actualizada`
        })
        onUpdated?.(response)
      } else {
        response = await createUnidad(payload)
        toast.success('✅ Unidad creada exitosamente', {
          description: `La unidad "${data.nombre}" ha sido agregada al catálogo`
        })
        onCreated?.(response)
        form.reset()
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Error al procesar la solicitud'
      toast.error('❌ Error al guardar la unidad', {
        description: errorMessage
      })
      console.error('Error saving unit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }: { field: ControllerRenderProps<UnidadFormData, 'nombre'> }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-sm font-medium">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Nombre de la Unidad
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ej: unidad, metro, litro, kilogramo..."
                    disabled={isSubmitting}
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              className="flex-1 sm:flex-none transition-all duration-200 hover:scale-105"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <><Edit3 className="h-4 w-4 mr-2" /> Actualizar Unidad</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" /> Crear Unidad</>
                  )}
                </>
              )}
            </Button>
            
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Form>
    </motion.div>
  )
}
