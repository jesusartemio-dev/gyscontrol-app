/**
 * ===================================================
 * COMPONENTE: EntregaItemForm
 * ===================================================
 * 
 * Formulario para registrar y actualizar entregas de items
 * de pedidos de equipos con validación y manejo de estados.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarIcon, Loader2, Package, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

import { EntregaItemSchema, type EntregaItemPayload } from '@/lib/validators/trazabilidad';
import { EstadoEntregaItem } from '@/types/modelos';
import { obtenerColorEstado, obtenerIconoEstado } from '@/lib/validators/trazabilidad';
import { registrarEntrega, actualizarEntrega } from '@/lib/services/entregas';
import { cn } from '@/lib/utils';

// ============================
// 🏷️ TIPOS E INTERFACES
// ============================

interface EntregaItemFormProps {
  /** ID del item del pedido */
  pedidoEquipoItemId: string;
  /** Estado actual del item */
  estadoActual?: EstadoEntregaItem;
  /** Cantidad pendiente de entrega */
  cantidadPendiente?: number;
  /** Función callback al completar la entrega */
  onEntregaCompletada?: (data: EntregaItemPayload) => void;
  /** Función callback al cancelar */
  onCancelar?: () => void;
  /** Modo del formulario */
  modo?: 'crear' | 'actualizar';
  /** Datos iniciales para edición */
  datosIniciales?: Partial<EntregaItemPayload>;
}

// ============================
// 🎨 COMPONENTE PRINCIPAL
// ============================

export function EntregaItemForm({
  pedidoEquipoItemId,
  estadoActual = EstadoEntregaItem.PENDIENTE,
  cantidadPendiente = 0,
  onEntregaCompletada,
  onCancelar,
  modo = 'crear',
  datosIniciales
}: EntregaItemFormProps) {
  const [isPending, startTransition] = useTransition();
  const [fechaEntregaAbierta, setFechaEntregaAbierta] = useState(false);

  // ============================
  // 📋 CONFIGURACIÓN DEL FORMULARIO
  // ============================

  const form = useForm<EntregaItemPayload>({
    resolver: zodResolver(EntregaItemSchema),
    defaultValues: {
      pedidoEquipoItemId,
      estadoEntrega: datosIniciales?.estadoEntrega || EstadoEntregaItem.EN_PROCESO,
      cantidadAtendida: datosIniciales?.cantidadAtendida || cantidadPendiente,
      fechaEntregaReal: datosIniciales?.fechaEntregaReal || new Date(),
      observacionesEntrega: datosIniciales?.observacionesEntrega || '',
      comentarioLogistica: datosIniciales?.comentarioLogistica || ''
    }
  });

  // ============================
  // 🎯 MANEJADORES DE EVENTOS
  // ============================

  const handleSubmit = (data: EntregaItemPayload) => {
    startTransition(async () => {
      try {
        let resultado;
        
        if (modo === 'crear') {
          // 📡 Registrar nueva entrega
          resultado = await registrarEntrega(data);
        } else {
          // 🔄 Actualizar entrega existente
          resultado = await actualizarEntrega(pedidoEquipoItemId, data);
        }
        
        toast.success(
          modo === 'crear' 
            ? 'Entrega registrada exitosamente'
            : 'Entrega actualizada exitosamente'
        );
        
        // ✅ Notificar al componente padre con los datos actualizados
        onEntregaCompletada?.({
          ...data,
          ...resultado // Incluir datos devueltos por la API
        });
      } catch (error) {
        console.error('Error al procesar entrega:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast.error(`Error al procesar la entrega: ${errorMessage}`);
      }
    });
  };

  const estadosDisponibles: EstadoEntregaItem[] = [
    EstadoEntregaItem.PENDIENTE,
    EstadoEntregaItem.EN_PROCESO,
    EstadoEntregaItem.PARCIAL,
    EstadoEntregaItem.ENTREGADO,
    EstadoEntregaItem.RETRASADO,
    EstadoEntregaItem.CANCELADO
  ];

  // ============================
  // 🎨 RENDERIZADO
  // ============================

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            {modo === 'crear' ? 'Registrar Entrega' : 'Actualizar Entrega'}
          </CardTitle>
          <Badge className={obtenerColorEstado(estadoActual)}>
            {estadoActual.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {modo === 'crear' 
            ? 'Complete los datos de la entrega del item'
            : 'Modifique los datos de la entrega'
          }
        </p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Estado de Entrega */}
            <FormField
              control={form.control}
              name="estadoEntrega"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado de Entrega</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {estadosDisponibles.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          <div className="flex items-center gap-2">
                            <Badge className={obtenerColorEstado(estado)} variant="outline">
                              {estado.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cantidad Atendida */}
            <FormField
              control={form.control}
              name="cantidadAtendida"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad Atendida</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max={cantidadPendiente}
                      placeholder="Ingrese la cantidad entregada"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Cantidad pendiente: {cantidadPendiente}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de Entrega Real */}
            <FormField
              control={form.control}
              name="fechaEntregaReal"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Entrega Real</FormLabel>
                  <Popover open={fechaEntregaAbierta} onOpenChange={setFechaEntregaAbierta}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Seleccione una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setFechaEntregaAbierta(false);
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observaciones de Entrega */}
            <FormField
              control={form.control}
              name="observacionesEntrega"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones de Entrega</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ingrese observaciones sobre la entrega..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comentario de Logística */}
            <FormField
              control={form.control}
              name="comentarioLogistica"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario de Logística</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Comentarios internos de logística..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones de Acción */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    {modo === 'crear' ? 'Registrar Entrega' : 'Actualizar Entrega'}
                  </>
                )}
              </Button>
              
              {onCancelar && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancelar}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default EntregaItemForm;
