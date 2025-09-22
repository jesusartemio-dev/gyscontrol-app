'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Loader2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { ProyectoEdtConRelaciones, EstadoEdt, CategoriaServicio, User } from '@/types/modelos';
import type { ProyectoEdtPayload } from '@/types/payloads';

// ✅ Schema de validación Zod
const edtFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre del EDT es requerido'),
  categoriaServicioId: z.string().min(1, 'La categoría de servicio es requerida'),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica'], {
    required_error: 'La prioridad es requerida'
  }),
  zona: z.string().optional(),
  descripcion: z.string().optional(),
  fechaInicioPlan: z.date({
    required_error: 'La fecha de inicio planificada es requerida'
  }),
  fechaFinPlan: z.date({
    required_error: 'La fecha de fin planificada es requerida'
  }),
  horasPlan: z.number().min(0.1, 'Las horas planificadas deben ser mayor a 0'),
  responsableId: z.string().optional(),
  estado: z.enum(['planificado', 'en_progreso', 'detenido', 'completado', 'cancelado']).optional()
}).refine((data) => data.fechaFinPlan > data.fechaInicioPlan, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['fechaFinPlan']
});

type EdtFormData = z.infer<typeof edtFormSchema>;

// ✅ Props del componente
interface EdtFormProps {
  proyectoId: string;
  edt?: ProyectoEdtConRelaciones;
  categoriasServicios: CategoriaServicio[];
  usuarios?: User[];
  onSubmit: (data: ProyectoEdtPayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ✅ Opciones de prioridad
const prioridadOptions = [
  { value: 'baja', label: 'Baja', color: 'text-green-600' },
  { value: 'media', label: 'Media', color: 'text-yellow-600' },
  { value: 'alta', label: 'Alta', color: 'text-orange-600' },
  { value: 'critica', label: 'Crítica', color: 'text-red-600' }
] as const;

// ✅ Opciones de estado
const estadoOptions = [
  { value: 'planificado', label: 'Planificado' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'detenido', label: 'Detenido' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' }
] as const;

// ✅ Componente principal
export function EdtForm({ 
  proyectoId, 
  edt, 
  categoriasServicios, 
  usuarios = [], 
  onSubmit, 
  onCancel, 
  loading = false 
}: EdtFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!edt;

  // ✅ Configuración del formulario
  const form = useForm<EdtFormData>({
    resolver: zodResolver(edtFormSchema),
    defaultValues: {
      nombre: edt?.nombre || '',
      categoriaServicioId: edt?.categoriaServicioId || '',
      prioridad: edt?.prioridad || 'media',
      zona: edt?.zona || '',
      descripcion: edt?.descripcion || '',
      fechaInicioPlan: edt?.fechaInicio ? new Date(edt.fechaInicio) : new Date(),
      fechaFinPlan: edt?.fechaFin ? new Date(edt.fechaFin) : new Date(),
      horasPlan: edt?.horasPlan ? Number(edt.horasPlan) : 8,
      responsableId: edt?.responsableId || '',
      estado: edt?.estado || 'planificado'
    }
  });

  // ✅ Manejar envío del formulario
  const handleSubmit = async (data: EdtFormData) => {
    setIsSubmitting(true);
    try {
      const payload: ProyectoEdtPayload = {
        proyectoId,
        nombre: data.nombre,
        categoriaServicioId: data.categoriaServicioId,
        prioridad: data.prioridad,
        zona: data.zona || undefined,
        descripcion: data.descripcion || undefined,
        fechaInicio: data.fechaInicioPlan?.toISOString(),
        fechaFin: data.fechaFinPlan?.toISOString(),
        horasEstimadas: data.horasPlan,
        responsableId: data.responsableId || undefined,
        estado: data.estado
      };

      await onSubmit(payload);
      
      toast({
        title: isEditing ? 'EDT actualizado' : 'EDT creado',
        description: `El EDT ha sido ${isEditing ? 'actualizado' : 'creado'} correctamente`
      });
    } catch (error) {
      console.error('Error al guardar EDT:', error);
      toast({
        title: 'Error',
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} el EDT`,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Validar fechas en tiempo real
  const fechaInicio = form.watch('fechaInicioPlan');
  const categoriaServicioId = form.watch('categoriaServicioId');

  useEffect(() => {
    const fechaFin = form.getValues('fechaFinPlan');
    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
      const nuevaFechaFin = new Date(fechaInicio);
      nuevaFechaFin.setDate(nuevaFechaFin.getDate() + 1);
      form.setValue('fechaFinPlan', nuevaFechaFin);
    }
  }, [fechaInicio, form]);

  // ✅ Auto-fill nombre when categoriaServicio changes
  useEffect(() => {
    if (categoriaServicioId && !isEditing) {
      const categoria = categoriasServicios.find(c => c.id === categoriaServicioId);
      if (categoria) {
        const currentNombre = form.getValues('nombre');
        if (!currentNombre || currentNombre === '') {
          form.setValue('nombre', categoria.nombre);
        }
      }
    }
  }, [categoriaServicioId, categoriasServicios, form, isEditing]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? 'Editar EDT' : 'Crear Nuevo EDT'}
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* ✅ Nombre del EDT */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del EDT *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Instalación eléctrica zona A, Montaje de equipos, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ✅ Fila 1: Categoría y Prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="categoriaServicioId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría de Servicio *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriasServicios.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nombre}
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
                    <FormLabel>Prioridad *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {prioridadOptions.map((opcion) => (
                          <SelectItem key={opcion.value} value={opcion.value}>
                            <span className={opcion.color}>{opcion.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ✅ Fila 2: Zona y Estado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="zona"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Zona A, Piso 2, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {estadoOptions.map((opcion) => (
                          <SelectItem key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ✅ Descripción */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción detallada del EDT..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ✅ Fila 3: Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fechaInicioPlan"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Inicio Planificada *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fechaFinPlan"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Fin Planificada *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => 
                            date < new Date('1900-01-01') || 
                            (fechaInicio && date <= fechaInicio)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ✅ Fila 4: Horas y Responsable */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="horasPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas Planificadas *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.5"
                        min="0.1"
                        placeholder="8.0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsable</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sin asignar</SelectItem>
                        {usuarios.map((usuario) => (
                          <SelectItem key={usuario.id} value={usuario.id}>
                            {usuario.name} ({usuario.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ✅ Botones de acción */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || loading}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear EDT')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}