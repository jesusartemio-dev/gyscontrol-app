'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, User, MapPin, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProyectoEdtConRelaciones, EstadoEdt } from '@/types/modelos';
import { formatearFecha, formatearHoras } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ✅ Props del componente
interface EdtListProps {
  proyectoId: string;
  edts: ProyectoEdtConRelaciones[];
  loading?: boolean;
  onEdtSelect?: (edt: ProyectoEdtConRelaciones) => void;
  onEdtEdit?: (edt: ProyectoEdtConRelaciones) => void;
  onEdtDelete?: (edtId: string) => void;
  onRefresh?: () => void;
}

// ✅ Configuración de colores y iconos por estado
const estadoColors = {
  planificado: 'default',
  en_progreso: 'secondary',
  detenido: 'destructive',
  completado: 'outline',
  cancelado: 'destructive'
} as const;

const estadoIcons = {
  planificado: Calendar,
  en_progreso: Clock,
  detenido: AlertTriangle,
  completado: CheckCircle,
  cancelado: AlertTriangle
};

const estadoLabels = {
  planificado: 'Planificado',
  en_progreso: 'En Progreso',
  detenido: 'Detenido',
  completado: 'Completado',
  cancelado: 'Cancelado'
};

// ✅ Componente principal
export function EdtList({ 
  proyectoId, 
  edts, 
  loading = false, 
  onEdtSelect, 
  onEdtEdit, 
  onEdtDelete,
  onRefresh 
}: EdtListProps) {
  const [filtroEstado, setFiltroEstado] = useState<EstadoEdt | 'todos'>('todos');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [edtsFiltrados, setEdtsFiltrados] = useState<ProyectoEdtConRelaciones[]>(edts);

  // ✅ Aplicar filtros
  useEffect(() => {
    let resultado = edts;

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(edt => edt.estado === filtroEstado);
    }

    // Filtro por texto
    if (filtroTexto) {
      const textoLower = filtroTexto.toLowerCase();
      resultado = resultado.filter(edt =>
        edt.categoriaServicio.nombre.toLowerCase().includes(textoLower) ||
        edt.descripcion?.toLowerCase().includes(textoLower) ||
        edt.responsable?.name?.toLowerCase().includes(textoLower)
      );
    }

    setEdtsFiltrados(resultado);
  }, [edts, filtroEstado, filtroTexto]);

  // ✅ Manejar eliminación con confirmación
  const handleDelete = async (edt: ProyectoEdtConRelaciones) => {
    if (window.confirm(`¿Estás seguro de eliminar el EDT "${edt.categoriaServicio.nombre}"?`)) {
      try {
        await onEdtDelete?.(edt.id);
        toast({
          title: 'EDT eliminado',
          description: 'El EDT ha sido eliminado correctamente'
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el EDT',
          variant: 'destructive'
        });
      }
    }
  };

  // ✅ Skeleton loading
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por categoría, descripción o responsable..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="flex-1"
        />
        <Select value={filtroEstado} onValueChange={(value) => setFiltroEstado(value as EstadoEdt | 'todos')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="planificado">Planificado</SelectItem>
            <SelectItem value="en_progreso">En Progreso</SelectItem>
            <SelectItem value="detenido">Detenido</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            Actualizar
          </Button>
        )}
      </div>

      {/* ✅ Estadísticas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
        <div className="text-center p-2 bg-muted rounded">
          <div className="font-medium">{edts.length}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
        {Object.entries(estadoLabels).map(([estado, label]) => {
          const count = edts.filter(edt => edt.estado === estado).length;
          return (
            <div key={estado} className="text-center p-2 bg-muted rounded">
              <div className="font-medium">{count}</div>
              <div className="text-muted-foreground">{label}</div>
            </div>
          );
        })}
      </div>

      {/* ✅ Lista de EDT */}
      <AnimatePresence>
        {edtsFiltrados.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay EDT disponibles</h3>
            <p className="text-muted-foreground">
              {filtroEstado !== 'todos' || filtroTexto 
                ? 'No se encontraron EDT que coincidan con los filtros aplicados.'
                : 'Aún no se han creado EDT para este proyecto.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {edtsFiltrados.map((edt, index) => {
              const IconoEstado = estadoIcons[edt.estado];
              const porcentajeAvance = edt.porcentajeAvance;
              const horasPlan = Number(edt.horasPlan || 0);
              const horasReales = Number(edt.horasReales);
              const eficiencia = horasPlan > 0 ? (horasReales / horasPlan) * 100 : 0;
              
              return (
                <motion.div
                  key={edt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="hover:shadow-md transition-all duration-200 cursor-pointer group"
                    onClick={() => onEdtSelect?.(edt)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <IconoEstado className="h-5 w-5" />
                            {edt.categoriaServicio.nombre}
                          </CardTitle>
                          {edt.descripcion && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {edt.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={estadoColors[edt.estado]}>
                            {estadoLabels[edt.estado]}
                          </Badge>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {onEdtEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdtEdit(edt);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {onEdtDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(edt);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* ✅ Barra de progreso */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progreso</span>
                          <span className="font-medium">{porcentajeAvance}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <motion.div
                            className={`h-2 rounded-full ${
                              porcentajeAvance === 100 ? 'bg-green-500' :
                              porcentajeAvance >= 75 ? 'bg-blue-500' :
                              porcentajeAvance >= 50 ? 'bg-yellow-500' :
                              porcentajeAvance >= 25 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${porcentajeAvance}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>
                      </div>

                      {/* ✅ Información de horas */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Horas Plan</p>
                          <p className="font-medium">{formatearHoras(horasPlan)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Horas Reales</p>
                          <p className="font-medium">{formatearHoras(horasReales)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Eficiencia</p>
                          <p className={`font-medium ${
                            eficiencia <= 100 ? 'text-green-600' :
                            eficiencia <= 120 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {eficiencia.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* ✅ Fechas y responsable */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {edt.fechaInicio && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Inicio: {formatearFecha(new Date(edt.fechaInicio))}</span>
                          </div>
                        )}
                        {edt.fechaFin && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Fin: {formatearFecha(new Date(edt.fechaFin))}</span>
                          </div>
                        )}
                        {edt.responsable && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{edt.responsable.name}</span>
                          </div>
                        )}
                      </div>

                      {/* ✅ Últimos registros de horas */}
                      {edt.registrosHoras && edt.registrosHoras.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium mb-2">Últimos registros</p>
                          <div className="space-y-1">
                            {edt.registrosHoras.slice(0, 3).map((registro) => (
                              <div key={registro.id} className="flex justify-between text-xs text-muted-foreground">
                                <span>{formatearFecha(registro.fechaTrabajo)} - {registro.usuario?.name || 'Usuario'}</span>
                                <span>{formatearHoras(Number(registro.horasTrabajadas))}</span>
                              </div>
                            ))}
                            {edt.registrosHoras.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center pt-1">
                                +{edt.registrosHoras.length - 3} registros más
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}