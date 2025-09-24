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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Target, DollarSign, Settings, FileText, User } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  responsableId: z.string().optional(),
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
  const [clienteSearch, setClienteSearch] = useState('')
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
      responsableId: '',
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
        responsableId: oportunidad.responsable?.id || '',
      })
    } else {
      form.reset({
        nombre: '',
        descripcion: '',
        clienteId: '',
        valorEstimado: undefined,
        probabilidad: 0,
        fechaCierreEstimada: undefined,
        responsableId: '',
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
        responsableId: data.responsableId?.trim() || undefined,
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
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isEditing ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isEditing ? 'Modifica los detalles de la oportunidad' : 'Registra una nueva oportunidad comercial'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información Principal */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                Información Principal
              </div>

              {/* Nombre */}
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Nombre de la Oportunidad *</FormLabel>
                    <FormControl>
                      <Input placeholder="Proyecto Mina XYZ" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cliente */}
              <FormField
                control={form.control}
                name="clienteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Cliente *</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Buscar..."
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        className="h-10 flex-1 max-w-[150px]"
                      />
                      <Select onValueChange={(value) => {
                        field.onChange(value)
                        setClienteSearch('')
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar cliente..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {clientes
                            .filter(cliente => cliente.nombre.toLowerCase().includes(clienteSearch.toLowerCase()))
                            .map((cliente) => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descripción */}
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Breve descripción de la oportunidad..."
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Información Comercial */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Información Comercial
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valorEstimado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Valor Estimado (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-10"
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
                      <FormLabel className="text-sm font-medium">Probabilidad (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          className="h-10"
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
                      <FormLabel className="text-sm font-medium">Fecha Cierre Estimada</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-10"
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
            </div>

            {/* Asignación */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Settings className="h-4 w-4" />
                Asignación
              </div>

              <FormField
                control={form.control}
                name="responsableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Responsable</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable..." />
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


            {/* Botones de acción */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-11"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 min-w-[120px]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Actualizar Oportunidad' : 'Crear Oportunidad'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}