// ===================================================
// 📁 Archivo: TareaForm.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Formulario para crear y editar tareas
//    Funciones: Formulario reactivo, validación, estados de carga
//
// 🧠 Funcionalidades:
//    - Formulario con React Hook Form + Zod
//    - Validación en tiempo real
//    - Estados de carga y error
//    - Modo creación y edición
//    - Campos condicionales
//    - Autoguardado (draft)
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import {
  Save,
  X,
  Calendar,
  Clock,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

import type { Tarea, User } from '@/types/modelos'
import type { TareaPayload, TareaUpdatePayload } from '@/types/payloads'
import {
  TareaCreateSchema,
  TareaUpdateSchema,
  type TareaCreateInput,
  type TareaUpdateInput
} from '@/lib/validators/tareas'
import { createTarea, updateTarea } from '@/lib/services/tareas'
import { getSiguienteOrden } from '@/lib/services/subtareas'

// 📋 Props del componente
interface TareaFormProps {
  proyectoServicioId: string
  tarea?: Tarea | null
  usuarios?: User[]
  onSuccess?: (tarea: Tarea) => void
  onCancel?: () => void
  className?: string
}

// 🔧 Tipo para el formulario
type FormData = TareaCreateInput | TareaUpdateInput

const TareaForm: React.FC<TareaFormProps> = ({
  proyectoServicioId,
  tarea,
  usuarios = [],
  onSuccess,
  onCancel,
  className
}) => {
  // 🔄 Estados del componente
  const [loading, setLoading] = useState(false)
  const [siguienteOrden, setSiguienteOrden] = useState<number>(1)
  const { toast } = useToast()
  
  const isEditing = Boolean(tarea)
  const schema = isEditing ? TareaUpdateSchema : TareaCreateSchema
  
  // 📝 Configurar formulario
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEditing ? {
      nombre: tarea?.nombre || '',
      descripcion: tarea?.descripcion || '',
      estado: tarea?.estado || 'pendiente',
      prioridad: tarea?.prioridad || 'media',
      orden: 1, // Default order since Tarea interface doesn't have orden property
      fechaInicio: tarea?.fechaInicio ? new Date(tarea.fechaInicio).toISOString().slice(0, 16) : '',
      fechaFin: tarea?.fechaFin ? new Date(tarea.fechaFin).toISOString().slice(0, 16) : '',
      horasEstimadas: tarea?.horasPlan || 0,
      horasReales: tarea?.horasReales || 0,
      progreso: tarea?.porcentajeCompletado || 0, // Use porcentajeCompletado instead of progreso
      asignadoId: tarea?.responsableId || '' // Use responsableId instead of asignadoId
    } : {
      proyectoServicioId,
      nombre: '',
      descripcion: '',
      estado: 'pendiente',
      prioridad: 'media',
      orden: 1,
      fechaInicio: '',
      fechaFin: '',
      horasEstimadas: 0,
      horasReales: 0,
      progreso: 0,
      asignadoId: ''
    }
  })

  // 🔄 Obtener siguiente orden disponible
  useEffect(() => {
    if (!isEditing) {
      const obtenerSiguienteOrden = async () => {
        try {
          const orden = await getSiguienteOrden(proyectoServicioId)
          setSiguienteOrden(orden)
          form.setValue('orden', orden)
        } catch (error) {
          console.error('Error al obtener siguiente orden:', error)
        }
      }
      
      obtenerSiguienteOrden()
    }
  }, [proyectoServicioId, isEditing, form])

  // 📝 Manejar envío del formulario
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      
      // Preparar datos para envío
      const submitData = {
        ...data,
        // Convertir fechas vacías a undefined
        fechaInicio: data.fechaInicio || undefined,
        fechaFin: data.fechaFin || undefined,
        // Mapear asignadoId a responsableId para el payload
        responsableId: data.asignadoId === 'unassigned' ? undefined : data.asignadoId || undefined,
        // Remover asignadoId del payload ya que no es parte del schema
        asignadoId: undefined,
        // Asegurar que horasEstimadas y horasReales sean números
        horasEstimadas: Number(data.horasEstimadas) || 0,
        horasReales: Number(data.horasReales) || 0,
        progreso: Number(data.progreso) || 0
      }
      
      // Limpiar campos undefined del objeto
      Object.keys(submitData).forEach(key => {
        if (submitData[key as keyof typeof submitData] === undefined) {
          delete submitData[key as keyof typeof submitData]
        }
      })
      
      let resultado: Tarea
      
      if (isEditing && tarea) {
        // Actualizar tarea existente
        resultado = await updateTarea(tarea.id, submitData as TareaUpdatePayload)
        toast({
          title: 'Tarea actualizada',
          description: 'La tarea se ha actualizado correctamente'
        })
      } else {
        // Crear nueva tarea
        resultado = await createTarea({
          ...submitData,
          proyectoServicioId
        } as TareaPayload)
        toast({
          title: 'Tarea creada',
          description: 'La tarea se ha creado correctamente'
        })
      }
      
      onSuccess?.(resultado)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar tarea'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 🎨 Configuración de estilos por estado
  const estadoConfig = {
    pendiente: { color: 'bg-gray-100 text-gray-800', label: 'Pendiente' },
    en_progreso: { color: 'bg-blue-100 text-blue-800', label: 'En Progreso' },
    completada: { color: 'bg-green-100 text-green-800', label: 'Completada' },
    cancelada: { color: 'bg-red-100 text-red-800', label: 'Cancelada' }
  }

  const prioridadConfig = {
    baja: { color: 'bg-gray-100 text-gray-800', label: 'Baja' },
    media: { color: 'bg-yellow-100 text-yellow-800', label: 'Media' },
    alta: { color: 'bg-orange-100 text-orange-800', label: 'Alta' },
    critica: { color: 'bg-red-100 text-red-800', label: 'Crítica' }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
            </span>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 📝 Información básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Información Básica</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nombre de la tarea *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ingrese el nombre de la tarea"
                            {...field}
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
                      <FormItem className="md:col-span-2">
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descripción detallada de la tarea"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Proporcione detalles adicionales sobre la tarea
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="orden"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orden</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Orden de ejecución de la tarea
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="asignadoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asignado a</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar usuario" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Sin asignar</SelectItem>
                            {usuarios.map((usuario) => (
                          <SelectItem key={usuario.id} value={usuario.id}>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span>{usuario.name || usuario.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* 🎯 Estado y prioridad */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Estado y Prioridad</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(estadoConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <Badge variant="outline" className={config.color}>
                                  {config.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="prioridad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(prioridadConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <Badge variant="outline" className={config.color}>
                                  {config.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="progreso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Progreso (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Porcentaje de completitud (0-100)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* 📅 Fechas y horas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Planificación
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fechaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de inicio</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fechaFin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de fin</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="horasEstimadas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horas estimadas</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Tiempo estimado en horas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isEditing && (
                    <FormField
                      control={form.control}
                      name="horasReales"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horas reales</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Tiempo real trabajado
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
              
              {/* 🔘 Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-6">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                )}
                
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Actualizar' : 'Crear'} Tarea
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default TareaForm