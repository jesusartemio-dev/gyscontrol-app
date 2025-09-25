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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Target, DollarSign, Settings, FileText, User, Building2, Calendar, TrendingUp, Search, X } from 'lucide-react'
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

// ✅ Esquema de validación mejorado
const oportunidadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  clienteId: z.string().min(1, 'Debe seleccionar un cliente'),
  fuente: z.string().optional(),
  prioridad: z.string().optional(),
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

  // ✅ Formulario con React Hook Form mejorado
  const form = useForm<OportunidadFormData>({
    resolver: zodResolver(oportunidadSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      clienteId: '',
      fuente: '',
      prioridad: 'media',
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
        fuente: oportunidad.fuente || '',
        prioridad: oportunidad.prioridad || 'media',
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
        fuente: '',
        prioridad: 'media',
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

      // ✅ Preparar datos mejorados
      const formData = {
        clienteId: data.clienteId.trim(),
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || undefined,
        fuente: data.fuente?.trim() || undefined,
        prioridad: data.prioridad?.trim() || 'media',
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isEditing ? 'Modifica los detalles de la oportunidad' : 'Registra una nueva oportunidad comercial'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Información Principal */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                  Información Principal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Nombre */}
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Nombre de la Oportunidad *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Proyecto Mina XYZ - Fase 1"
                          className="h-9 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Usa un nombre descriptivo que identifique claramente la oportunidad
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cliente con búsqueda mejorada */}
                <FormField
                  control={form.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Cliente *
                      </FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Buscar por nombre o RUC..."
                              value={clienteSearch}
                              onChange={(e) => setClienteSearch(e.target.value)}
                              className="pl-10 h-9 text-sm"
                            />
                          </div>
                          <Select onValueChange={(value) => {
                            field.onChange(value)
                            setClienteSearch('')
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-9 w-48">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[200px]">
                              {clientes
                                .filter(cliente =>
                                  cliente.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
                                  (cliente.ruc && cliente.ruc.includes(clienteSearch))
                                )
                                .map((cliente) => (
                                  <SelectItem key={cliente.id} value={cliente.id}>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-gray-500" />
                                      <div>
                                        <div className="font-medium text-sm">{cliente.nombre}</div>
                                        {cliente.ruc && (
                                          <div className="text-xs text-gray-500">RUC: {cliente.ruc}</div>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-gray-500">Busca por nombre de empresa o número de RUC</p>
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
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Descripción
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe brevemente la oportunidad, alcance del proyecto, etc."
                          className="resize-none h-20 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Incluye detalles relevantes como alcance, ubicación o requerimientos especiales
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fuente y Prioridad */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fuente"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          Fuente de la Oportunidad
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar fuente..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(CRM_FUENTES).map((fuente) => (
                              <SelectItem key={fuente} value={fuente}>
                                {fuente}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs text-gray-500">
                          ¿Cómo llegó esta oportunidad?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prioridad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          Prioridad
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar prioridad..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(CRM_PRIORIDADES).map((prioridad) => (
                              <SelectItem key={prioridad} value={prioridad}>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      prioridad === 'critica' ? 'destructive' :
                                      prioridad === 'alta' ? 'default' :
                                      prioridad === 'media' ? 'secondary' : 'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {prioridad}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs text-gray-500">
                          Nivel de urgencia para seguimiento
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información Comercial */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Información Comercial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="valorEstimado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          Valor Estimado (USD)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 text-sm"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Valor total esperado del proyecto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="probabilidad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          Probabilidad (%)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              className="h-9 text-sm pr-8"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                              value={field.value || ''}
                            />
                            <TrendingUp className="absolute right-3 top-2 h-3 w-3 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Probabilidad de cerrar la venta
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaCierreEstimada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          Fecha Cierre Estimada
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="date"
                              className="h-9 text-sm"
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => {
                                const value = e.target.value
                                field.onChange(value ? new Date(value) : undefined)
                              }}
                            />
                            <Calendar className="absolute right-3 top-2 h-3 w-3 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Fecha probable de cierre
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Asignación */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-purple-600" />
                  Asignación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="responsableId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Responsable de la Oportunidad
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar responsable..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usuarios.map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="text-sm">{usuario.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-gray-500">
                        Persona responsable del seguimiento de esta oportunidad
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Botones de acción mejorados */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t bg-gray-50/50 -mx-6 px-6 py-4 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-10 px-4"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
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