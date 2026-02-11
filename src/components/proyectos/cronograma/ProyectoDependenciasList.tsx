/**
 * Componente ProyectoDependenciasList - Gestión de Dependencias en Cronograma de 6 Niveles
 *
 * Lista y gestión de dependencias entre tareas del proyecto.
 * Permite crear, editar, eliminar y visualizar relaciones de dependencia.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Link,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  GitBranch,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tipos para dependencias
interface ProyectoDependencia {
  id: string;
  tipo: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  tareaOrigenId: string;
  tareaDependienteId: string;
  tareaOrigen?: {
    id: string;
    nombre: string;
    proyectoEdt?: {
      nombre: string;
      proyectoFase?: {
        nombre: string;
      };
    };
  };
  tareaDependiente?: {
    id: string;
    nombre: string;
    proyectoEdt?: {
      nombre: string;
      proyectoFase?: {
        nombre: string;
      };
    };
  };
  createdAt: string;
}

interface ProyectoDependenciasListProps {
  proyectoId: string;
  cronogramaId?: string;
  onRefresh?: () => void;
}

export function ProyectoDependenciasList({
  proyectoId,
  cronogramaId,
  onRefresh
}: ProyectoDependenciasListProps) {
  const [dependencias, setDependencias] = useState<ProyectoDependencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Cargar dependencias del proyecto
  const loadDependencias = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/dependencias`);
      if (!response.ok) {
        throw new Error('Error al cargar dependencias');
      }

      const data = await response.json();
      setDependencias(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `No se pudieron cargar las dependencias: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [proyectoId, toast]);

  useEffect(() => {
    loadDependencias();
  }, [loadDependencias]);

  // Eliminar dependencia
  const handleDeleteDependencia = async (dependenciaId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta dependencia?')) {
      return;
    }

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/dependencias/${dependenciaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar dependencia');
      }

      toast({
        title: 'Dependencia eliminada',
        description: 'La dependencia ha sido eliminada exitosamente.',
      });

      loadDependencias();
      onRefresh?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `No se pudo eliminar la dependencia: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  // Obtener descripción del tipo de dependencia
  const getTipoDependenciaInfo = (tipo: string) => {
    switch (tipo) {
      case 'finish_to_start':
        return {
          label: 'Fin → Inicio',
          description: 'La tarea dependiente no puede iniciar hasta que la tarea origen termine',
          icon: <ArrowRight className="h-4 w-4" />
        };
      case 'start_to_start':
        return {
          label: 'Inicio → Inicio',
          description: 'La tarea dependiente debe iniciar cuando la tarea origen inicie',
          icon: <GitBranch className="h-4 w-4" />
        };
      case 'finish_to_finish':
        return {
          label: 'Fin → Fin',
          description: 'La tarea dependiente debe terminar cuando la tarea origen termine',
          icon: <ArrowRight className="h-4 w-4 rotate-180" />
        };
      case 'start_to_finish':
        return {
          label: 'Inicio → Fin',
          description: 'La tarea dependiente debe terminar cuando la tarea origen inicie',
          icon: <GitBranch className="h-4 w-4 rotate-180" />
        };
      default:
        return {
          label: 'Desconocido',
          description: 'Tipo de dependencia no reconocido',
          icon: <AlertCircle className="h-4 w-4" />
        };
    }
  };

  // Verificar si hay dependencias válidas
  const hasValidDependencies = dependencias.some(dep =>
    dep.tareaOrigen && dep.tareaDependiente
  );

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

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Error al cargar dependencias</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={loadDependencias}
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
            <Link className="h-5 w-5" />
            Dependencias del Proyecto
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestiona las relaciones de dependencia entre tareas
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Dependencia
        </Button>
      </CardHeader>

      <CardContent>
        {dependencias.length === 0 ? (
          <div className="text-center py-8">
            <Link className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay dependencias definidas</h3>
            <p className="text-muted-foreground mb-4">
              Crea dependencias para establecer relaciones lógicas entre tareas
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Dependencia
            </Button>
          </div>
        ) : !hasValidDependencies ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Dependencias con datos incompletos</h3>
            <p className="text-muted-foreground mb-4">
              Algunas dependencias no tienen información completa de las tareas relacionadas
            </p>
            <Button variant="outline" onClick={loadDependencias}>
              Recargar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {dependencias
              .filter(dep => dep.tareaOrigen && dep.tareaDependiente)
              .map((dependencia) => {
                const tipoInfo = getTipoDependenciaInfo(dependencia.tipo);
                return (
                  <Card key={dependencia.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-blue-100 rounded-full">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Tarea Origen</p>
                                <p className="text-sm text-muted-foreground">
                                  {dependencia.tareaOrigen?.nombre}
                                </p>
                                {dependencia.tareaOrigen?.proyectoEdt && (
                                  <p className="text-xs text-muted-foreground">
                                    EDT: {dependencia.tareaOrigen.proyectoEdt.nombre}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-center">
                              <Badge variant="outline" className="flex items-center gap-1 mb-1">
                                {tipoInfo.icon}
                                {tipoInfo.label}
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-green-100 rounded-full">
                                <Target className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Tarea Dependiente</p>
                                <p className="text-sm text-muted-foreground">
                                  {dependencia.tareaDependiente?.nombre}
                                </p>
                                {dependencia.tareaDependiente?.proyectoEdt && (
                                  <p className="text-xs text-muted-foreground">
                                    EDT: {dependencia.tareaDependiente.proyectoEdt.nombre}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground mb-2">
                            {tipoInfo.description}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Creada: {new Date(dependencia.createdAt).toLocaleDateString('es-ES')}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDependencia(dependencia.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}