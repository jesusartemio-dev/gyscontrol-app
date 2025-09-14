'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Hash, CheckCircle, MapPin, Phone, Mail, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

// ✅ Importaciones de UI básicas
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ✅ Importaciones de servicios y tipos
import { createCliente, updateCliente } from '@/lib/services/cliente';
import type { Cliente } from '@/types/modelos';
import type { ClientePayload, ClienteUpdatePayload } from '@/types/payloads';

// ✅ Schema de validación con Zod mejorado
const clienteSchema = z.object({
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
});

type ClienteFormData = z.infer<typeof clienteSchema>;

// ✅ Props del componente
interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: Cliente | null; // null para crear, Cliente para editar
  onSaved: () => void; // Callback para refrescar la lista
}

/**
 * Modal simple para crear y editar clientes
 * Sin dependencias de Radix UI para evitar conflictos
 */
export default function ClienteModal({ isOpen, onClose, cliente, onSaved }: ClienteModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const isEditing = !!cliente;
  
  // ✅ Configuración del formulario con React Hook Form + Zod
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting, isDirty },
    watch
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: cliente?.nombre || '',
      ruc: cliente?.ruc || '',
      direccion: cliente?.direccion || '',
      telefono: cliente?.telefono || '',
      correo: cliente?.correo || '',
    },
    mode: 'onChange' // ✅ Real-time validation
  });

  // 🔁 Watch form values for real-time feedback
  const watchedNombre = watch('nombre');
  const watchedRuc = watch('ruc');
  const watchedDireccion = watch('direccion');
  const watchedTelefono = watch('telefono');
  const watchedCorreo = watch('correo');

  // ✅ Efecto para manejar el montaje del componente
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Reset form when cliente data changes
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      reset({
        nombre: cliente?.nombre || '',
        ruc: cliente?.ruc || '',
        direccion: cliente?.direccion || '',
        telefono: cliente?.telefono || '',
        correo: cliente?.correo || '',
      });
      setError(null);
    } else {
      setIsProcessing(false);
    }
  }, [cliente, reset]);

  // ✅ Handle modal close with cleanup
  const handleClose = useCallback(() => {
    if (!isProcessing && !isSubmitting) {
      setError(null);
      reset();
      onClose();
    }
  }, [isProcessing, isSubmitting, reset, onClose]);

  // ✅ Handle Escape key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing && !isSubmitting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isProcessing, isSubmitting, handleClose]);

  // 📡 Handle form submission
  const onSubmit = useCallback(async (data: ClienteFormData) => {
    if (isProcessing) return; // ✅ Prevent multiple submissions
    
    try {
      setIsProcessing(true);
      setError(null);
      
      const payload = {
        ...data,
        nombre: data.nombre.trim(),
        ruc: data.ruc?.trim() || undefined,
        direccion: data.direccion?.trim() || undefined,
        telefono: data.telefono?.trim() || undefined,
        correo: data.correo?.trim() || undefined
      };
      
      if (isEditing && cliente) {
        // ✅ Update existing client
        const updatePayload: Cliente = {
          ...cliente,
          ...payload
        };
        
        await updateCliente(updatePayload);
        toast.success('Cliente actualizado exitosamente');
      } else {
        // ✅ Create new client
        const createPayload: ClientePayload = payload;
        
        await createCliente(createPayload);
        toast.success('Cliente creado exitosamente');
      }
      
      // ✅ Clear form and notify parent
      reset();
      onSaved();
      
      // ✅ Close modal after successful save
      onClose();
      
    } catch (error) {
      console.error('Error al procesar cliente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al ${isEditing ? 'actualizar' : 'crear'} cliente: ${errorMessage}`);
      toast.error('Error al procesar cliente', {
        description: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  }, [cliente, reset, onSaved, onClose, isProcessing, isEditing]);

  // 🎨 Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

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
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
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
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {isEditing ? 'Actualiza la información del cliente' : 'Completa los datos del nuevo cliente'}
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
              {/* Campo Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  Nombre *
                </Label>
                <div className="relative">
                  <Input
                    id="nombre"
                    {...register('nombre')}
                    placeholder="Nombre del cliente"
                    disabled={isProcessing}
                    className={`transition-all duration-200 ${
                      errors.nombre 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : watchedNombre && !errors.nombre
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                    autoFocus
                  />
                  {watchedNombre && !errors.nombre && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                {errors.nombre ? (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nombre.message}
                  </p>
                ) : watchedNombre && (
                  <p className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Nombre válido
                  </p>
                )}
              </div>

              {/* Campo RUC */}
              <div className="space-y-2">
                <Label htmlFor="ruc" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Hash className="h-4 w-4" />
                  RUC
                </Label>
                <div className="relative">
                  <Input
                    id="ruc"
                    {...register('ruc')}
                    placeholder="11 dígitos (opcional)"
                    disabled={isProcessing}
                    className={`transition-all duration-200 ${
                      errors.ruc 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : watchedRuc && !errors.ruc
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  {watchedRuc && !errors.ruc && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                {errors.ruc ? (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.ruc.message}
                  </p>
                ) : watchedRuc && (
                  <p className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    RUC válido
                  </p>
                )}
              </div>

              {/* Campo Dirección */}
              <div className="space-y-2">
                <Label htmlFor="direccion" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </Label>
                <div className="relative">
                  <Input
                    id="direccion"
                    {...register('direccion')}
                    placeholder="Dirección del cliente (opcional)"
                    disabled={isProcessing}
                    className={`transition-all duration-200 ${
                      errors.direccion 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : watchedDireccion && !errors.direccion
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  {watchedDireccion && !errors.direccion && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                {errors.direccion ? (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.direccion.message}
                  </p>
                ) : watchedDireccion && (
                  <p className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Dirección válida
                  </p>
                )}
              </div>

              {/* Campo Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="telefono" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </Label>
                <div className="relative">
                  <Input
                    id="telefono"
                    {...register('telefono')}
                    placeholder="Teléfono del cliente (opcional)"
                    disabled={isProcessing}
                    className={`transition-all duration-200 ${
                      errors.telefono 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : watchedTelefono && !errors.telefono
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  {watchedTelefono && !errors.telefono && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                {errors.telefono ? (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.telefono.message}
                  </p>
                ) : watchedTelefono && (
                  <p className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Teléfono válido
                  </p>
                )}
              </div>

              {/* Campo Correo */}
              <div className="space-y-2">
                <Label htmlFor="correo" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4" />
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Input
                    id="correo"
                    type="email"
                    {...register('correo')}
                    placeholder="correo@ejemplo.com (opcional)"
                    disabled={isProcessing}
                    className={`transition-all duration-200 ${
                      errors.correo 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : watchedCorreo && !errors.correo
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  {watchedCorreo && !errors.correo && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                {errors.correo ? (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.correo.message}
                  </p>
                ) : watchedCorreo && (
                  <p className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Correo válido
                  </p>
                )}
              </div>

              {/* Mensaje de error */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing || !isValid}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isProcessing ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
