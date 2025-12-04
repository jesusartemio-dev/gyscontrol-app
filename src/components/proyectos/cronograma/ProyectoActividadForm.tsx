/**
 * Componente ProyectoActividadForm - Formulario Modal para Actividades
 *
 * Formulario simplificado para crear y editar actividades en el sistema de cronograma de 5 niveles.
 * Actividades se crean directamente bajo EDTs (sin zonas intermedias).
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ✅ Tipos simplificados para 5 niveles
interface ProyectoEdt {
  id: string;
  nombre: string;
  categoriaServicio?: {
    nombre: string;
  };
}

interface ProyectoCronograma {
  id: string;
  nombre: string;
  tipo: string;
}

interface ProyectoActividad {
  id: string;
  nombre: string;
  descripcion?: string;
  fechaInicioPlan: string;
  fechaFinPlan: string;
  horasPlan: number;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  proyectoEdtId: string; // ✅ OBLIGATORIO (sin zonaId)
  proyectoCronogramaId: string;
}

interface ProyectoActividadFormProps {
  open: boolean;
  onClose: () => void;
  proyectoId: string;
  actividad?: ProyectoActividad | null;
  proyectoEdtId?: string; // ✅ EDT padre (obligatorio)
  onSuccess: () => void;
}

export function ProyectoActividadForm({
  open,
  onClose,
  proyectoId,
  actividad,
  proyectoEdtId, // ✅ EDT padre obligatorio
  onSuccess
}: ProyectoActividadFormProps) {
  const [loading, setLoading] = useState(false);
  const [edts, setEdts] = useState<ProyectoEdt[]>([]);
  const [cronogramas, setCronogramas] = useState<ProyectoCronograma[]>([]);
  const [loadingEdts, setLoadingEdts] = useState(false);
  const [loadingCronogramas, setLoadingCronogramas] = useState(false);
  const { toast } = useToast();

  // ✅ Estado del formulario simplificado (sin zonas)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    proyectoEdtId: proyectoEdtId || '', // ✅ EDT pre-seleccionado
    proyectoCronogramaId: '',
    fechaInicioPlan: '',
    fechaFinPlan: '',
    horasPlan: 0,
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'critica',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ Cargar EDTs y cronogramas disponibles
  useEffect(() => {
    if (open) {
      loadEdts();
      loadCronogramas();
    }
  }, [open, proyectoId]);

  // ✅ Inicializar formulario simplificado
  useEffect(() => {
    if (open) {
      if (actividad) {
        // Modo edición
        setFormData({
          nombre: actividad.nombre,
          descripcion: actividad.descripcion || '',
          proyectoEdtId: actividad.proyectoEdtId, // ✅ Siempre EDT
          proyectoCronogramaId: actividad.proyectoCronogramaId,
          fechaInicioPlan: format(new Date(actividad.fechaInicioPlan), 'yyyy-MM-dd'),
          fechaFinPlan: format(new Date(actividad.fechaFinPlan), 'yyyy-MM-dd'),
          horasPlan: actividad.horasPlan,
          prioridad: actividad.prioridad,
        });
      } else {
        // Modo creación
        setFormData({
          nombre: '',
          descripcion: '',
          proyectoEdtId: proyectoEdtId || '', // ✅ EDT pre-seleccionado
          proyectoCronogramaId: '',
          fechaInicioPlan: '',
          fechaFinPlan: '',
          horasPlan: 0,
          prioridad: 'media',
        });
      }
      setErrors({});
    }
  }, [open, actividad, proyectoEdtId]);

  const loadEdts = async () => {
    try {
      setLoadingEdts(true);
      const response = await fetch(`/api/proyectos/${proyectoId}/edt`);
      if (!response.ok) {
        throw new Error('Error al cargar EDTs');
      }
      const data = await response.json();
      setEdts(data.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los EDTs disponibles',
        variant: 'destructive',
      });
    } finally {
      setLoadingEdts(false);
    }
  };

  const loadCronogramas = async () => {
    try {
      setLoadingCronogramas(true);
      // Cargar cronogramas del proyecto
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma`);
      if (!response.ok) {
        throw new Error('Error al cargar cronogramas');
      }
      const data = await response.json();
      setCronogramas(data.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los cronogramas disponibles',
        variant: 'destructive',
      });
    } finally {
      setLoadingCronogramas(false);
    }
  };

  // ✅ Validaciones simplificadas (sin zonas)
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.proyectoEdtId) {
      newErrors.proyectoEdtId = 'Debe seleccionar un EDT';
    }

    if (!formData.proyectoCronogramaId) {
      newErrors.proyectoCronogramaId = 'Debe seleccionar un cronograma';
    }

    if (!formData.fechaInicioPlan) {
      newErrors.fechaInicioPlan = 'La fecha de inicio es obligatoria';
    }

    if (!formData.fechaFinPlan) {
      newErrors.fechaFinPlan = 'La fecha de fin es obligatoria';
    }

    if (formData.fechaInicioPlan && formData.fechaFinPlan) {
      const inicio = new Date(formData.fechaInicioPlan);
      const fin = new Date(formData.fechaFinPlan);
      if (inicio >= fin) {
        newErrors.fechaFinPlan = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    if (formData.horasPlan < 0) {
      newErrors.horasPlan = 'Las horas planificadas deben ser positivas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const url = actividad
        ? `/api/proyectos/${proyectoId}/actividades/${actividad.id}`
        : `/api/proyectos/${proyectoId}/actividades`;

      const method = actividad ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        fechaInicioPlan: formData.fechaInicioPlan,
        fechaFinPlan: formData.fechaFinPlan,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar actividad');
      }

      toast({
        title: 'Éxito',
        description: actividad ? 'Actividad actualizada correctamente' : 'Actividad creada correctamente',
      });

      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `No se pudo ${actividad ? 'actualizar' : 'crear'} la actividad: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {actividad ? 'Editar Actividad' : 'Crear Nueva Actividad'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Actividad *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Cableado Principal, Iluminación Industrial"
              className={errors.nombre ? 'border-red-500' : ''}
            />
            {errors.nombre && (
              <p className="text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción detallada de la actividad"
              rows={3}
            />
          </div>

          {/* ✅ EDT Padre (Obligatorio - Simplificado) */}
          <div className="space-y-2">
            <Label htmlFor="proyectoEdtId">EDT Padre *</Label>
            <Select
              value={formData.proyectoEdtId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, proyectoEdtId: value }))}
              disabled={loadingEdts || !!proyectoEdtId} // ✅ Deshabilitar si viene pre-seleccionado
            >
              <SelectTrigger className={errors.proyectoEdtId ? 'border-red-500' : ''}>
                <SelectValue placeholder={loadingEdts ? "Cargando EDTs..." : "Seleccionar EDT"} />
              </SelectTrigger>
              <SelectContent>
                {edts.map((edt) => (
                  <SelectItem key={edt.id} value={edt.id}>
                    {edt.nombre}
                    {edt.categoriaServicio && (
                      <> • {edt.categoriaServicio.nombre}</>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.proyectoEdtId && (
              <p className="text-sm text-red-600">{errors.proyectoEdtId}</p>
            )}
            <p className="text-xs text-muted-foreground">
              La actividad se creará directamente bajo este EDT
            </p>
          </div>

          {/* Cronograma */}
          <div className="space-y-2">
            <Label htmlFor="proyectoCronogramaId">Cronograma *</Label>
            <Select
              value={formData.proyectoCronogramaId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, proyectoCronogramaId: value }))}
              disabled={loadingCronogramas}
            >
              <SelectTrigger className={errors.proyectoCronogramaId ? 'border-red-500' : ''}>
                <SelectValue placeholder={loadingCronogramas ? "Cargando cronogramas..." : "Seleccionar cronograma"} />
              </SelectTrigger>
              <SelectContent>
                {cronogramas.map((cronograma) => (
                  <SelectItem key={cronograma.id} value={cronograma.id}>
                    {cronograma.nombre} ({cronograma.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.proyectoCronogramaId && (
              <p className="text-sm text-red-600">{errors.proyectoCronogramaId}</p>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicioPlan" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha Inicio Planificada *
              </Label>
              <Input
                id="fechaInicioPlan"
                type="date"
                value={formData.fechaInicioPlan}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaInicioPlan: e.target.value }))}
                className={errors.fechaInicioPlan ? 'border-red-500' : ''}
              />
              {errors.fechaInicioPlan && (
                <p className="text-sm text-red-600">{errors.fechaInicioPlan}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaFinPlan" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha Fin Planificada *
              </Label>
              <Input
                id="fechaFinPlan"
                type="date"
                value={formData.fechaFinPlan}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaFinPlan: e.target.value }))}
                className={errors.fechaFinPlan ? 'border-red-500' : ''}
              />
              {errors.fechaFinPlan && (
                <p className="text-sm text-red-600">{errors.fechaFinPlan}</p>
              )}
            </div>
          </div>

          {/* Horas y Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horasPlan" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horas Planificadas
              </Label>
              <Input
                id="horasPlan"
                type="number"
                min="0"
                step="0.5"
                value={formData.horasPlan}
                onChange={(e) => setFormData(prev => ({ ...prev, horasPlan: parseFloat(e.target.value) || 0 }))}
                placeholder="0.0"
                className={errors.horasPlan ? 'border-red-500' : ''}
              />
              {errors.horasPlan && (
                <p className="text-sm text-red-600">{errors.horasPlan}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridad">Prioridad</Label>
              <Select
                value={formData.prioridad}
                onValueChange={(value: 'baja' | 'media' | 'alta' | 'critica') =>
                  setFormData(prev => ({ ...prev, prioridad: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actividad ? 'Actualizar Actividad' : 'Crear Actividad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}