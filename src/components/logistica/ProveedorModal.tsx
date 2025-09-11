// ===================================================
// 📁 Archivo: ProveedorModal.tsx
// 📌 Ubicación: src/components/logistica/ProveedorModal.tsx
// 🔧 Descripción: Modal simplificado para crear/editar proveedores
// 🧠 Uso: Modal con React Hook Form, Zod validation y UX/UI mejorada
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Loader2, Building2, Hash, CheckCircle, MapPin, Phone, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Proveedor } from '@/types'
import { createProveedor, updateProveedor } from '@/lib/services/proveedor'

// ✅ Validation schema with Zod
const proveedorSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]+$/, 'El nombre solo puede contener letras, espacios, guiones y puntos'),
  ruc: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 0 || /^\d{11}$/.test(val),
      'El RUC debe tener exactamente 11 dígitos'
    ),
  direccion: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 0 || val.length >= 5,
      'La dirección debe tener al menos 5 caracteres'
    ),
  telefono: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 0 || /^[+]?[0-9\s\-()]{7,15}$/.test(val),
      'El teléfono debe tener un formato válido'
    ),
  correo: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'El correo debe tener un formato válido'
    )
})

type FormData = z.infer<typeof proveedorSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (proveedor: Proveedor) => void
  proveedor?: Proveedor | null
}

export default function ProveedorModal({ open, onOpenChange, onSaved, proveedor }: Props) {
  const [isProcessing, setIsProcessing] = useState(false)
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid, isDirty },
    watch
  } = useForm<FormData>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      nombre: proveedor?.nombre || '',
      ruc: proveedor?.ruc || '',
      direccion: proveedor?.direccion || '',
      telefono: proveedor?.telefono || '',
      correo: proveedor?.correo || ''
    },
    mode: 'onChange' // ✅ Real-time validation
  })

  // 🔁 Watch form values for real-time feedback
  const watchedNombre = watch('nombre')
  const watchedRuc = watch('ruc')
  const watchedDireccion = watch('direccion')
  const watchedTelefono = watch('telefono')
  const watchedCorreo = watch('correo')

  // ✅ Reset form when proveedor data changes
  useEffect(() => {
    if (open) {
      setIsProcessing(false)
      reset({
        nombre: proveedor?.nombre || '',
        ruc: proveedor?.ruc || '',
        direccion: proveedor?.direccion || '',
        telefono: proveedor?.telefono || '',
        correo: proveedor?.correo || ''
      })
    } else {
      setIsProcessing(false)
    }
  }, [proveedor, open, reset])

  // 📡 Handle form submission
  const onSubmit = useCallback(async (data: FormData) => {
    if (isProcessing) return // ✅ Prevent multiple submissions
    
    try {
      setIsProcessing(true)
      
      const payload = {
        ...data,
        nombre: data.nombre.trim(),
        ruc: data.ruc?.trim() || undefined,
        direccion: data.direccion?.trim() || undefined,
        telefono: data.telefono?.trim() || undefined,
        correo: data.correo?.trim() || undefined
      }
      
      let result: Proveedor | null
      
      if (proveedor) {
        // ✅ Update existing provider
        result = await updateProveedor(proveedor.id, payload)
        if (!result) {
          throw new Error('Error al actualizar proveedor')
        }
        toast.success('Proveedor actualizado exitosamente')
      } else {
        // ✅ Create new provider
        result = await createProveedor(payload)
        if (!result) {
          throw new Error('Error al crear proveedor')
        }
        toast.success('Proveedor creado exitosamente')
      }
      
      // ✅ Clear form and notify parent
      reset()
      onSaved?.(result)
      
      // ✅ Close modal after successful save
      onOpenChange(false)
      
    } catch (error) {
      console.error('Error al procesar proveedor:', error)
      toast.error('Error al procesar proveedor', {
        description: error instanceof Error ? error.message : 'Por favor, intenta nuevamente'
      })
    } finally {
      setIsProcessing(false)
    }
  }, [proveedor, reset, onSaved, onOpenChange, isProcessing])

  // ✅ Handle modal close with cleanup
  const handleClose = useCallback(() => {
    if (!isProcessing && !isSubmitting) {
      reset()
      onOpenChange(false)
    }
  }, [isProcessing, isSubmitting, reset, onOpenChange])

  // 🎨 Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: -20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  }

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {proveedor ? 'Actualiza la información del proveedor' : 'Completa los datos del nuevo proveedor'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isProcessing || isSubmitting}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nombre *
                </Label>
                <Input
                  id="nombre"
                  {...register('nombre')}
                  placeholder="Nombre del proveedor"
                  className={`transition-colors ${
                    errors.nombre 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : watchedNombre 
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  disabled={isProcessing || isSubmitting}
                />
                {errors.nombre && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.nombre.message}
                  </p>
                )}
                {watchedNombre && !errors.nombre && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Nombre válido
                  </p>
                )}
              </div>

              {/* RUC */}
              <div className="space-y-2">
                <Label htmlFor="ruc" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  RUC
                </Label>
                <Input
                  id="ruc"
                  {...register('ruc')}
                  placeholder="RUC del proveedor (opcional)"
                  className={`transition-colors ${
                    errors.ruc 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : watchedRuc && watchedRuc.length > 0
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  disabled={isProcessing || isSubmitting}
                />
                {errors.ruc && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.ruc.message}
                  </p>
                )}
                {watchedRuc && watchedRuc.length > 0 && !errors.ruc && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    RUC válido
                  </p>
                )}
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="direccion" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </Label>
                <Input
                  id="direccion"
                  {...register('direccion')}
                  placeholder="Dirección del proveedor (opcional)"
                  className={`transition-colors ${
                    errors.direccion 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : watchedDireccion && watchedDireccion.length > 0
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  disabled={isProcessing || isSubmitting}
                />
                {errors.direccion && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.direccion.message}
                  </p>
                )}
                {watchedDireccion && watchedDireccion.length > 0 && !errors.direccion && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Dirección válida
                  </p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="telefono" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  {...register('telefono')}
                  placeholder="Teléfono del proveedor (opcional)"
                  className={`transition-colors ${
                    errors.telefono 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : watchedTelefono && watchedTelefono.length > 0
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  disabled={isProcessing || isSubmitting}
                />
                {errors.telefono && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.telefono.message}
                  </p>
                )}
                {watchedTelefono && watchedTelefono.length > 0 && !errors.telefono && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Teléfono válido
                  </p>
                )}
              </div>

              {/* Correo */}
              <div className="space-y-2">
                <Label htmlFor="correo" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Correo
                </Label>
                <Input
                  id="correo"
                  {...register('correo')}
                  placeholder="Correo del proveedor (opcional)"
                  className={`transition-colors ${
                    errors.correo 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : watchedCorreo && watchedCorreo.length > 0
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  disabled={isProcessing || isSubmitting}
                />
                {errors.correo && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.correo.message}
                  </p>
                )}
                {watchedCorreo && watchedCorreo.length > 0 && !errors.correo && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Correo válido
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing || isSubmitting}
                  className="px-4 py-2"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing || isSubmitting || !isValid || !isDirty}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isProcessing || isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {proveedor ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    <>
                      {proveedor ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Actualizar
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Crear
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
