'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

import {
  createOportunidad,
  updateOportunidad,
  CrmOportunidad,
  CrmOportunidadCreate,
  CrmOportunidadUpdate,
  CRM_ESTADOS_OPORTUNIDAD,
  CRM_PRIORIDADES,
  CRM_FUENTES
} from '@/lib/services/crm'

// ✅ Esquema de validación
const oportunidadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  clienteId: z.string().min(1, 'Debe seleccionar un cliente'),
  valorEstimado: z.number().min(0, 'El valor debe ser positivo').optional(),
  probabilidad: z.number().min(0).max(100, 'La probabilidad debe estar entre 0 y 100').optional(),
  fechaCierreEstimada: z.date().optional(),
  fuente: z.string().optional(),
  prioridad: z.string().optional(),
  responsableId: z.string().optional(),
  notas: z.string().optional(),
  competencia: z.string().optional(),
})

type OportunidadFormData = z.infer<typeof oportunidadSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidad?: CrmOportunidad | null
  onSuccess?: (oportunidad: CrmOportunidad) => void
  clientes?: Array<{ id: string; nombre: string; ruc?: string }>
  usuarios?: Array<{ id: string; name: string; email: string }>
}

// ✅ Componente principal
export default function OportunidadForm({
  open,
  onOpenChange,
  oportunidad,
  onSuccess,
  clientes = [],
  usuarios = []
}: Props) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const isEditing = !!oportunidad

  // ✅ Formulario con React Hook Form
  const form = useForm<OportunidadFormData>({
    resolver: zodResolver(oportunidadSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      clienteId: '',
      valorEstimado: undefined,
      probabilidad: 0,
      fechaCierreEstimada: undefined,
      fuente: '',
      prioridad: 'media',
      responsableId: '',
      notas: '',
      competencia: '',
    }
  })

  // ✅ Resetear formulario cuando cambia la oportunidad
  useEffect(() => {
    if (oportunidad) {
      form.reset({
        nombre: oportunidad.nombre,
        descripcion: oportunidad.descripcion || '',
        clienteId: oportunidad.cliente?.id || '',
        valorEstimado: oportunidad.valorEstimado || undefined,
        probabilidad: oportunidad.probabilidad,
        fechaCierreEstimada: oportunidad.fechaCierreEstimada ? new Date(oportunidad.fechaCierreEstimada) : undefined,
        fuente: oportunidad.fuente || '',
        prioridad: oportunidad.prioridad,
        responsableId: oportunidad.responsable?.id || '',
        notas: oportunidad.notas || '',
        competencia: oportunidad.competencia || '',
      })
    } else {
      form.reset({
        nombre: '',
        descripcion: '',
        clienteId: '',
        valorEstimado: undefined,
        probabilidad: 0,
        fechaCierreEstimada: undefined,
        fuente: '',
        prioridad: 'media',
        responsableId: '',
        notas: '',
        competencia: '',
      })
    }
  }, [oportunidad, form])

  // ✅ Manejar envío del formulario
  const onSubmit = async (data: OportunidadFormData) => {
    try {
      setLoading(true)

      // ✅ Validación adicional antes de enviar
      if (!data.clienteId?.trim()) {
        throw new Error('Debe seleccionar un cliente')
      }
      if (!data.nombre?.trim()) {
        throw new Error('El nombre de la oportunidad es obligatorio')
      }

      console.log('📤 Enviando datos del formulario:', data)

      // ✅ Preparar datos
      const formData = {
        clienteId: data.clienteId.trim(),
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || undefined,
        valorEstimado: data.valorEstimado || undefined,
        probabilidad: data.probabilidad || 0,
        fechaCierreEstimada: data.fechaCierreEstimada?.toISOString(),
        fuente: data.fuente?.trim() || undefined,
        prioridad: data.prioridad?.trim() || undefined,
        responsableId: data.responsableId?.trim() || undefined,
        notas: data.notas?.trim() || undefined,
        competencia: data.competencia?.trim() || undefined,
      }

      console.log('📦 Datos preparados para envío:', formData)

      let result: CrmOportunidad

      if (isEditing && oportunidad) {
        // ✅ Actualizar oportunidad existente
        result = await updateOportunidad(oportunidad.id, formData as CrmOportunidadUpdate)
        toast({
          title: "Oportunidad actualizada",
          description: "Los cambios se han guardado correctamente.",
        })
      } else {
        // ✅ Crear nueva oportunidad
        result = await createOportunidad(formData as CrmOportunidadCreate)
        toast({
          title: "Oportunidad creada",
          description: "La oportunidad se ha creado correctamente.",
        })
      }

      // ✅ Callback de éxito
      if (onSuccess) {
        onSuccess(result)
      }

      // ✅ Cerrar modal
      onOpenChange(false)

    } catch (error: any) {
      console.error('Error al guardar oportunidad:', error)

      // ✅ Manejar errores específicos de validación
      let errorMessage = "No se pudo guardar la oportunidad. Intente nuevamente."

      if (error?.message?.includes('Cliente no encontrado')) {
        errorMessage = "El cliente seleccionado ya no existe. Seleccione otro cliente."
      } else if (error?.message?.includes('Responsable no encontrado')) {
        errorMessage = "El responsable seleccionado ya no existe. Seleccione otro responsable."
      } else if (error?.message?.includes('cliente seleccionado no existe')) {
        errorMessage = "El cliente seleccionado ya no existe. Seleccione otro cliente."
      } else if (error?.message?.includes('responsable seleccionado no existe')) {
        errorMessage = "El responsable seleccionado ya no existe. Seleccione otro responsable."
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEditing ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre y Cliente en fila con proporciones personalizadas */}
            <div className="flex gap-3">
              <div className="flex-1" style={{ flex: '0 0 70%' }}>
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Nombre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Proyecto Mina XYZ" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex-1" style={{ flex: '0 0 30%' }}>
                <FormField
                  control={form.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Cliente *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nombre}
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

            {/* Descripción full width */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe la oportunidad..."
                      className="resize-none h-16"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor, Probabilidad, Fecha en una fila */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="valorEstimado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Valor (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-9"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probabilidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Probabilidad (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        className="h-9"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fechaCierreEstimada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Fecha Cierre</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-9"
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value ? new Date(value) : undefined)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fuente, Prioridad, Responsable en fila */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="fuente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Fuente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Fuente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CRM_FUENTES).map(([key, value]) => (
                          <SelectItem key={key} value={value}>
                            {value.charAt(0).toUpperCase() + value.slice(1)}
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
                    <FormLabel className="text-sm">Prioridad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CRM_PRIORIDADES).map(([key, value]) => (
                          <SelectItem key={key} value={value}>
                            {value.charAt(0).toUpperCase() + value.slice(1)}
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
                name="responsableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Responsable</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Responsable" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usuarios.map((usuario) => (
                          <SelectItem key={usuario.id} value={usuario.id}>
                            {usuario.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información adicional opcional */}
            <div className="space-y-3 border-t pt-3">
              <FormField
                control={form.control}
                name="competencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Competidores</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Lista competidores..."
                        className="h-9"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas adicionales..."
                        className="resize-none h-16"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                {isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}