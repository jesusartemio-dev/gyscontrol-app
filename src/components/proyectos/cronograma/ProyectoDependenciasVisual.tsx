/**
 * Componente ProyectoDependenciasVisual - Sistema Visual de Dependencias
 *
 * Interfaz visual para crear, editar y visualizar dependencias entre tareas
 * en el sistema de cronograma de 6 niveles. Soporta drag & drop y validaciones.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight,
  Link,
  Unlink,
  AlertTriangle,
  CheckCircle,
  Loader2,
  GitBranch,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tipos para dependencias
interface ProyectoTarea {
  id: string;
  nombre: string;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado';
  fechaInicio: string;
  fechaFin: string;
  proyectoActividadId?: string;
  proyectoActividad?: {
    nombre: string;
    proyectoZona?: {
      nombre: string;
    };
  };
}

interface ProyectoDependencia {
  id: string;
  tipo: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  tareaOrigen: {
    id: string;
    nombre: string;
  };
  tareaDependiente: {
    id: string;
    nombre: string;
  };
  createdAt: string;
}

interface ProyectoDependenciasVisualProps {
  proyectoId: string;
  cronogramaId?: string;
  onRefresh?: () => void;
}

export function ProyectoDependenciasVisual({
  proyectoId,
  cronogramaId,
  onRefresh
}: ProyectoDependenciasVisualProps) {
  const [tareas, setTareas] = useState<ProyectoTarea[]>([]);
  const [dependencias, setDependencias] = useState<ProyectoDependencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [creandoDependencia, setCreandoDependencia] = useState(false);
  const [tareaOrigen, setTareaOrigen] = useState<string>('');
  const [tareaDestino, setTareaDestino] = useState<string>('');
  const [tipoDependencia, setTipoDependencia] = useState<'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'>('finish_to_start');
  const { toast } = useToast();

  // Cargar tareas y dependencias
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Cargar tareas
      const tareasResponse = await fetch(`/api/proyectos/${proyectoId}/tareas`);
      if (!tareasResponse.ok) {
        throw new Error('Error al cargar tareas');
      }
      const tareasData = await tareasResponse.json();
      setTareas(tareasData.data || []);

      // Cargar dependencias
      const dependenciasResponse = await fetch(`/api/proyectos/${proyectoId}/dependencias`);
      if (!dependenciasResponse.ok) {
        throw new Error('Error al cargar dependencias');
      }
      const dependenciasData = await dependenciasResponse.json();
      setDependencias(dependenciasData.data || []);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `No se pudieron cargar las dependencias: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Crear nueva dependencia
  const handleCrearDependencia = async () => {
    if (!tareaOrigen || !tareaDestino) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar tarea origen y destino',
        variant: 'destructive',
      });
      return;
    }

    if (tareaOrigen === tareaDestino) {
      toast({
        title: 'Error',
        description: 'No se puede crear dependencia de una tarea consigo misma',
        variant: 'destructive',
      });
      return;
    }

    // Verificar si ya existe la dependencia
    const dependenciaExistente = dependencias.find(
      d => d.tareaOrigen.id === tareaOrigen && d.tareaDependiente.id === tareaDestino
    );

    if (dependenciaExistente) {
      toast({
        title: 'Error',
        description: 'Esta dependencia ya existe',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreandoDependencia(true);

      const response = await fetch(`/api/proyectos/${proyectoId}/dependencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tareaOrigenId: tareaOrigen,
          tareaDependienteId: tareaDestino,
          tipo: tipoDependencia,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear dependencia');
      }

      toast({
        title: 'Dependencia creada',
        description: 'La dependencia ha sido creada exitosamente',
      });

      // Limpiar formulario
      setTareaOrigen('');
      setTareaDestino('');
      setTipoDependencia('finish_to_start');

      loadData();
      onRefresh?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `No se pudo crear la dependencia: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setCreandoDependencia(false);
    }
  };

  // Eliminar dependencia
  const handleEliminarDependencia = async (dependenciaId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta dependencia?')) {
      return;
    }

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/dependencias/${dependenciaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar dependencia');
      }

      toast({
        title: 'Dependencia eliminada',
        description: 'La dependencia ha sido eliminada exitosamente',
      });

      loadData();
      onRefresh?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `No se pudo eliminar la dependencia: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  // Obtener nombre descriptivo del tipo de dependencia
  const getTipoDependenciaLabel = (tipo: string) => {
    switch (tipo) {
      case 'finish_to_start':
        return 'Terminar → Iniciar';
      case 'start_to_start':
        return 'Iniciar → Iniciar';
      case 'finish_to_finish':
        return 'Terminar → Terminar';
      case 'start_to_finish':
        return 'Iniciar → Terminar';
      default:
        return tipo;
    }
  };

  // Obtener icono del tipo de dependencia
  const getTipoDependenciaIcon = (tipo: string) => {
    switch (tipo) {
      case 'finish_to_start':
        return <ArrowRight className="h-4 w-4" />;
      case 'start_to_start':
        return <GitBranch className="h-4 w-4" />;
      case 'finish_to_finish':
        return <Target className="h-4 w-4" />;
      case 'start_to_finish':
        return <Link className="h-4 w-4" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  // Obtener tareas disponibles para origen (excluyendo las que ya tienen dependencias)
  const tareasDisponiblesOrigen = tareas.filter(tarea => {
    // Excluir tareas que ya son destino de alguna dependencia
    const esDestino = dependencias.some(d => d.tareaDependiente.id === tarea.id);
    return !esDestino;
  });

  // Obtener tareas disponibles para destino (excluyendo la tarea origen)
  const tareasDisponiblesDestino = tareas.filter(tarea => tarea.id !== tareaOrigen);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando dependencias...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario para crear dependencias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Crear Nueva Dependencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tarea Origen */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tarea Origen (Predecesora)</label>
              <Select value={tareaOrigen} onValueChange={setTareaOrigen}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tarea origen" />
                </SelectTrigger>
                <SelectContent>
                  {tareasDisponiblesOrigen.map((tarea) => (
                    <SelectItem key={tarea.id} value={tarea.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{tarea.nombre}</span>
                        {tarea.proyectoActividad && (
                          <span className="text-xs text-muted-foreground">
                            {tarea.proyectoActividad.nombre}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Dependencia */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Dependencia</label>
              <Select value={tipoDependencia} onValueChange={(value: any) => setTipoDependencia(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finish_to_start">Terminar → Iniciar</SelectItem>
                  <SelectItem value="start_to_start">Iniciar → Iniciar</SelectItem>
                  <SelectItem value="finish_to_finish">Terminar → Terminar</SelectItem>
                  <SelectItem value="start_to_finish">Iniciar → Terminar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tarea Destino */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tarea Destino (Sucesora)</label>
              <Select value={tareaDestino} onValueChange={setTareaDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tarea destino" />
                </SelectTrigger>
                <SelectContent>
                  {tareasDisponiblesDestino.map((tarea) => (
                    <SelectItem key={tarea.id} value={tarea.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{tarea.nombre}</span>
                        {tarea.proyectoActividad && (
                          <span className="text-xs text-muted-foreground">
                            {tarea.proyectoActividad.nombre}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleCrearDependencia}
            disabled={creandoDependencia || !tareaOrigen || !tareaDestino}
            className="w-full md:w-auto"
          >
            {creandoDependencia && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear Dependencia
          </Button>
        </CardContent>
      </Card>

      {/* Lista de dependencias existentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Dependencias Existentes
            <Badge variant="secondary">{dependencias.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dependencias.length === 0 ? (
            <div className="text-center py-8">
              <Link className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay dependencias definidas</h3>
              <p className="text-muted-foreground">
                Crea dependencias entre tareas para establecer el orden de ejecución
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dependencias.map((dependencia) => (
                <Card key={dependencia.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Tarea Origen */}
                        <div className="flex-1">
                          <div className="font-medium text-sm text-muted-foreground mb-1">
                            Origen (Predecesora)
                          </div>
                          <div className="font-medium">{dependencia.tareaOrigen.nombre}</div>
                        </div>

                        {/* Tipo de dependencia */}
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-md">
                          {getTipoDependenciaIcon(dependencia.tipo)}
                          <span className="text-sm font-medium">
                            {getTipoDependenciaLabel(dependencia.tipo)}
                          </span>
                        </div>

                        {/* Tarea Destino */}
                        <div className="flex-1 text-right">
                          <div className="font-medium text-sm text-muted-foreground mb-1">
                            Destino (Sucesora)
                          </div>
                          <div className="font-medium">{dependencia.tareaDependiente.nombre}</div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEliminarDependencia(dependencia.id)}
                        className="ml-4"
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}