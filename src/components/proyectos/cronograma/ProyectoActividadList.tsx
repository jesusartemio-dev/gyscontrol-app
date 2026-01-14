/**
 * Componente ProyectoActividadList - Gestión de Actividades en Cronograma de 6 Niveles
 *
 * Lista y gestión de actividades agrupadas por zonas.
 * Permite crear, editar, eliminar y visualizar actividades con su progreso.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Edit,
  Trash2,
  Wrench,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Target,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProyectoActividadForm } from './ProyectoActividadForm';

// Tipos para actividades
interface ProyectoActividad {
  id: string;
  nombre: string;
  descripcion?: string;
  fechaInicioPlan: string;
  fechaFinPlan: string;
  horasPlan: number;
  horasReales?: number;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  porcentajeAvance: number;
  proyectoEdtId?: string;
  proyectoCronogramaId: string;
  proyectoEdt?: {
    nombre: string;
    categoriaServicio?: {
      nombre: string;
    };
  };
  tareasCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ProyectoActividadListProps {
  proyectoId: string;
  cronogramaId?: string;
  modoVista?: 'automatico' | 'jerarquia_completa';
  onRefresh?: () => void;
}

export function ProyectoActividadList({
  proyectoId,
  cronogramaId,
  modoVista = 'automatico',
  onRefresh
}: ProyectoActividadListProps) {
  const [actividades, setActividades] = useState<ProyectoActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<ProyectoActividad | null>(null);
  const { toast } = useToast();

  // Cargar actividades del proyecto
  const loadActividades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (cronogramaId) params.append('cronogramaId', cronogramaId);
      if (modoVista) params.append('modoVista', modoVista);

      const url = `/api/proyectos/${proyectoId}/actividades${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al cargar actividades');
      }

      const data = await response.json();
      setActividades(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `No se pudieron cargar las actividades: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [proyectoId, cronogramaId, modoVista]);

  useEffect(() => {
    loadActividades();
  }, [loadActividades]);

  // Eliminar actividad
  const handleDeleteActividad = async (actividadId: string, actividadNombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la actividad "${actividadNombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/actividades/${actividadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar actividad');
      }

      toast({
        title: 'Actividad eliminada',
        description: `La actividad "${actividadNombre}" ha sido eliminada exitosamente.`,
      });

      loadActividades();
      onRefresh?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `No se pudo eliminar la actividad: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  // Abrir modal para crear actividad
  const handleNuevaActividad = () => {
    setActividadEditando(null);
    setModalOpen(true);
  };

  // Abrir modal para editar actividad
  const handleEditarActividad = (actividad: ProyectoActividad) => {
    setActividadEditando(actividad);
    setModalOpen(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setActividadEditando(null);
  };

  // Manejar éxito del formulario
  const handleFormSuccess = () => {
    loadActividades();
    onRefresh?.();
  };

  // Obtener color del badge según estado
  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'completado':
        return 'default';
      case 'en_progreso':
        return 'secondary';
      case 'pendiente':
        return 'outline';
      case 'pausada':
      case 'cancelada':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Obtener color del badge según prioridad
  const getPrioridadBadgeVariant = (prioridad: string) => {
    switch (prioridad) {
      case 'critica':
        return 'destructive';
      case 'alta':
        return 'destructive';
      case 'media':
        return 'secondary';
      case 'baja':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Obtener icono según estado
  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completado':
        return <CheckCircle className="h-3 w-3" />;
      case 'en_progreso':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'pendiente':
        return <Target className="h-3 w-3" />;
      case 'pausada':
      case 'cancelada':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Wrench className="h-3 w-3" />;
    }
  };

  // Formatear fechas
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definida';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Agrupar actividades por EDT
  const actividadesPorEdt = actividades.reduce((acc, actividad) => {
    let grupoNombre: string;

    if (actividad.proyectoEdt) {
      grupoNombre = actividad.proyectoEdt.nombre;
    } else {
      // Fallback
      grupoNombre = 'Sin asignación';
    }

    if (!acc[grupoNombre]) {
      acc[grupoNombre] = { actividades: [] };
    }
    acc[grupoNombre].actividades.push(actividad);
    return acc;
  }, {} as Record<string, { actividades: ProyectoActividad[] }>);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando actividades...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Error al cargar actividades</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={loadActividades}
            >
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Actividades del Proyecto
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestiona las agrupaciones de trabajo por EDT
          </p>
        </div>
        <Button size="sm" onClick={handleNuevaActividad}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Actividad
        </Button>
      </CardHeader>

      <CardContent>
        {actividades.length === 0 ? (
          <div className="text-center py-8">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay actividades definidas</h3>
            <p className="text-muted-foreground mb-4">
              Crea actividades para agrupar tareas relacionadas dentro de las zonas
            </p>
            <Button onClick={handleNuevaActividad}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Actividad
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(actividadesPorEdt).map(([edtNombre, edtData]) => (
              <div key={edtNombre}>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  EDT: {edtNombre}
                </h3>
                <div className="space-y-3">
                  {edtData.actividades.map((actividad) => (
                    <Card key={actividad.id} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{actividad.nombre}</h4>
                              <Badge variant={getEstadoBadgeVariant(actividad.estado)} className="flex items-center gap-1">
                                {getEstadoIcon(actividad.estado)}
                                {actividad.estado.replace('_', ' ')}
                              </Badge>
                              <Badge variant={getPrioridadBadgeVariant(actividad.prioridad)}>
                                {actividad.prioridad}
                              </Badge>
                            </div>

                            {actividad.descripcion && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {actividad.descripcion}
                              </p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">Inicio</p>
                                  <p className="text-muted-foreground">
                                    {formatDate(actividad.fechaInicioPlan)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">Fin</p>
                                  <p className="text-muted-foreground">
                                    {formatDate(actividad.fechaFinPlan)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">Horas Plan</p>
                                  <p className="text-muted-foreground">
                                    {actividad.horasPlan}h
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">Tareas</p>
                                  <p className="text-muted-foreground">
                                    {actividad.tareasCount || 0}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Progreso</span>
                                <span>{actividad.porcentajeAvance}%</span>
                              </div>
                              <Progress value={actividad.porcentajeAvance} className="h-2" />
                            </div>

                            {/* Mostrar información del EDT */}
                            {actividad.proyectoEdt && (
                              <div className="text-xs text-muted-foreground">
                                EDT: {actividad.proyectoEdt?.nombre}
                                {actividad.proyectoEdt?.categoriaServicio?.nombre && (
                                  <> • {actividad.proyectoEdt?.categoriaServicio?.nombre}</>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditarActividad(actividad)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteActividad(actividad.id, actividad.nombre)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal de formulario */}
      <ProyectoActividadForm
        open={modalOpen}
        onClose={handleCloseModal}
        proyectoId={proyectoId}
        actividad={actividadEditando}
        onSuccess={handleFormSuccess}
      />
    </Card>
  );
}