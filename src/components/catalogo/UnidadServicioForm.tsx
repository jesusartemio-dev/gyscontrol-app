// ===================================================
// 📁 Archivo: UnidadServicioForm.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Formulario moderno para crear o editar Unidad de Servicio
//
// 🧠 Uso: Utilizado en páginas de catálogo con validación Zod y UX mejorada
// ✍️ Autor: Jesús Artemio (Master Experto)
// 📅 Última actualización: 2025-04-20
// ===================================================

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { UnidadServicio, UnidadServicioPayload } from '@/types'
import { createUnidadServicio, updateUnidadServicio } from '@/lib/services/unidadServicio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { Loader2, Calculator, Plus, Edit3, CheckCircle } from 'lucide-react'

// Zod schema for validation
const unidadServicioSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Solo se permiten letras, números, espacios, guiones y puntos')
    .trim()
})

type UnidadServicioFormData = z.infer<typeof unidadServicioSchema>

interface Props {
  onCreated?: (unidad: UnidadServicio) => void
  onUpdated?: (unidad: UnidadServicio) => void
  defaultValue?: UnidadServicio
  isEditMode?: boolean
}

export default function UnidadServicioForm({
  onCreated,
  onUpdated,
  defaultValue,
  isEditMode = false,
}: Props) {
  const [loading, setLoading] = useState(false)

  const form = useForm<UnidadServicioFormData>({
    resolver: zodResolver(unidadServicioSchema),
    defaultValues: {
      nombre: defaultValue?.nombre || ''
    }
  })

  const onSubmit = async (data: UnidadServicioFormData) => {
    setLoading(true)

    const payload: UnidadServicioPayload = { nombre: data.nombre }

    try {
      let response
      if (isEditMode && defaultValue?.id) {
        response = await updateUnidadServicio(defaultValue.id, payload)
        toast.success('✅ Unidad de servicio actualizada correctamente', {
          description: `La unidad "${data.nombre}" ha sido actualizada`
        })
        onUpdated?.(response)
      } else {
        response = await createUnidadServicio(payload)
        toast.success('✅ Unidad de servicio creada correctamente', {
          description: `La unidad "${data.nombre}" ha sido agregada al catálogo`
        })
        onCreated?.(response)
        form.reset()
      }
    } catch (error) {
      toast.error('❌ Error al guardar la unidad', {
        description: 'Por favor, intenta nuevamente o contacta al administrador'
      })
      console.error('Error saving unidad servicio:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isEditMode ? 'bg-orange-100' : 'bg-blue-100'
            }`}>
              {isEditMode ? (
                <Edit3 className="h-5 w-5 text-orange-600" />
              ) : (
                <Plus className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditMode ? 'Editar Unidad de Servicio' : 'Nueva Unidad de Servicio'}
              </h3>
              <p className="text-sm text-gray-600">
                {isEditMode 
                  ? 'Modifica los datos de la unidad existente'
                  : 'Agrega una nueva unidad de medida para servicios'
                }
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-gray-600" />
                    Nombre de la Unidad
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: horas, días, metros, unidades..."
                      disabled={loading}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Ejemplos: "horas", "días", "metros", "unidades", "m²", "kg"
                  </p>
                </FormItem>
              )}
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !form.formState.isValid}
              className={`min-w-[120px] transition-all duration-200 ${
                isEditMode 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Actualizar
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Unidad
                    </>
                  )}
                </>
              )}
            </Button>
            
            {!isEditMode && (
              <div className="flex items-center text-xs text-gray-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                El formulario se limpiará automáticamente
              </div>
            )}
          </div>

          {/* Form Status */}
          {form.formState.errors.nombre && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-lg p-3"
            >
              <p className="text-sm text-red-800 flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                {form.formState.errors.nombre.message}
              </p>
            </motion.div>
          )}
        </form>
      </Form>
    </motion.div>
  )
}
