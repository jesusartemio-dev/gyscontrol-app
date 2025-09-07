// ✅ PedidoEquipoCoherenciaClient.tsx
// 🎯 Componente para validaciones de coherencia entre listas y pedidos
// 📊 Muestra alertas, desviaciones y acciones correctivas
// 🔧 Integrado con servicios de validación y notificaciones
// 🎨 Diseño modular con estados de carga y error

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  FileText,
  Settings,
  Eye
} from 'lucide-react';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { validacionCoherenciaService } from '@/lib/services/aprovisionamiento';
import type { ValidacionCoherencia } from '@/types/aprovisionamiento';
import { EstadoPedido } from '@prisma/client';

// 📋 Props del componente
interface PedidoEquipoCoherenciaClientProps {
  proyectoId?: string;
  listaEquipoId?: string;
  className?: string;
  modo?: 'completo' | 'compacto' | 'resumen';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// 🎯 Estado de coherencia
interface CoherenciaState {
  validaciones: ValidacionCoherencia[];
  resumen: {
    totalListas: number;
    listasCoherentes: number;
    alertasCriticas: number;
    alertasAdvertencia: number;
    desviacionPromedio: number;
  };
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

// ✅ Componente principal
export default function PedidoEquipoCoherenciaClient({
  proyectoId,
  listaEquipoId,
  className,
  modo = 'completo',
  autoRefresh = false,
  refreshInterval = 30000
}: PedidoEquipoCoherenciaClientProps) {
  const [state, setState] = useState<CoherenciaState>({
    validaciones: [],
    resumen: {
      totalListas: 0,
      listasCoherentes: 0,
      alertasCriticas: 0,
      alertasAdvertencia: 0,
      desviacionPromedio: 0
    },
    loading: true,
    error: null,
    lastUpdate: null
  });

  // 🔄 Cargar validaciones de coherencia
  const cargarValidaciones = async () => {
    if (!proyectoId) return;
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await validacionCoherenciaService.generarAlertasCoherencia(proyectoId);
      
      if (response.success) {
        // 📊 Procesar datos de coherencia
        const validaciones: ValidacionCoherencia[] = response.data.coherencia.map(c => ({
          listaId: c.listaId,
          listaCodigo: `LISTA-${c.listaId.slice(-6)}`,
          montoLista: c.montoLista,
          montoPedidos: c.montoPedidos,
          diferencia: c.desviacionMonto,
          porcentajeDesviacion: c.desviacionPorcentaje,
          estado: c.esCoherente ? 'ok' : 
                  Math.abs(c.desviacionPorcentaje) > 20 ? 'critica' : 'advertencia',
          mensaje: c.esCoherente ? 'Lista coherente' : 
                   `Desviación del ${c.desviacionPorcentaje.toFixed(1)}%`,
          pedidosAsociados: c.pedidosRelacionados.map(p => ({
            id: `pedido-${Math.random().toString(36).substr(2, 9)}`,
            codigo: p.codigo,
            monto: p.monto,
            estado: EstadoPedido.enviado
          })),
          esCoherente: c.esCoherente,
          alertas: c.alertas?.map(a => ({
            tipo: 'warning' as const,
            titulo: 'Alerta de Coherencia',
            mensaje: a,
            prioridad: 'media' as const
          })) || []
        }));

        // 📊 Calcular resumen
        const resumen = {
          totalListas: validaciones.length,
          listasCoherentes: validaciones.filter(v => v.esCoherente).length,
          alertasCriticas: validaciones.filter(v => v.estado === 'critica').length,
          alertasAdvertencia: validaciones.filter(v => v.estado === 'advertencia').length,
          desviacionPromedio: validaciones.length > 0 ? 
            validaciones.reduce((sum, v) => sum + Math.abs(v.porcentajeDesviacion), 0) / validaciones.length : 0
        };

        setState(prev => ({
          ...prev,
          validaciones: listaEquipoId ? 
            validaciones.filter(v => v.listaId === listaEquipoId) : 
            validaciones,
          resumen,
          loading: false,
          lastUpdate: new Date()
        }));
      }
    } catch (error) {
      console.error('Error cargando validaciones:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  };

  // 🔄 Auto-refresh
  useEffect(() => {
    cargarValidaciones();
    
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(cargarValidaciones, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [proyectoId, listaEquipoId, autoRefresh, refreshInterval]);

  // 🎨 Renderizado según modo
  if (modo === 'resumen') {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Coherencia General
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {state.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Coherentes:</span>
                <div className="font-medium">
                  {state.resumen.listasCoherentes}/{state.resumen.totalListas}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Alertas:</span>
                <div className="font-medium text-destructive">
                  {state.resumen.alertasCriticas + state.resumen.alertasAdvertencia}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (modo === 'compacto') {
    return (
      <div className={cn('space-y-2', className)}>
        {state.loading ? (
          <Skeleton className="h-8 w-full" />
        ) : state.error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={state.resumen.alertasCriticas > 0 ? 'destructive' : 
                             state.resumen.alertasAdvertencia > 0 ? 'secondary' : 'default'}>
                {state.resumen.listasCoherentes}/{state.resumen.totalListas} Coherentes
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={cargarValidaciones}
              disabled={state.loading}
            >
              <RefreshCw className={cn('h-4 w-4', state.loading && 'animate-spin')} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 🎯 Modo completo
  return (
    <TooltipProvider>
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Validaciones de Coherencia
            </CardTitle>
            <div className="flex items-center gap-2">
              {state.lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Actualizado: {state.lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={cargarValidaciones}
                disabled={state.loading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', state.loading && 'animate-spin')} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 📊 Resumen general */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{state.resumen.totalListas}</div>
              <div className="text-xs text-muted-foreground">Total Listas</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{state.resumen.listasCoherentes}</div>
              <div className="text-xs text-muted-foreground">Coherentes</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{state.resumen.alertasAdvertencia}</div>
              <div className="text-xs text-muted-foreground">Advertencias</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{state.resumen.alertasCriticas}</div>
              <div className="text-xs text-muted-foreground">Críticas</div>
            </div>
          </div>

          {/* 🚨 Estado de carga y errores */}
          {state.loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* 📋 Lista de validaciones */}
          {!state.loading && !state.error && (
            <div className="space-y-3">
              {state.validaciones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No hay validaciones de coherencia disponibles</p>
                </div>
              ) : (
                state.validaciones.map((validacion) => (
                  <Card key={validacion.listaId} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{validacion.listaCodigo}</Badge>
                            <CoherenciaIndicator estado={validacion.estado} mensaje={validacion.mensaje} />
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Monto Lista:</span>
                              <div className="font-medium">{formatCurrency(validacion.montoLista)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Monto Pedidos:</span>
                              <div className="font-medium">{formatCurrency(validacion.montoPedidos)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Desviación:</span>
                              <div className={cn(
                                'font-medium flex items-center gap-1',
                                validacion.diferencia > 0 ? 'text-red-600' : 'text-green-600'
                              )}>
                                {validacion.diferencia > 0 ? 
                                  <TrendingUp className="h-3 w-3" /> : 
                                  <TrendingDown className="h-3 w-3" />
                                }
                                {formatPercentage(Math.abs(validacion.porcentajeDesviacion))}
                              </div>
                            </div>
                          </div>

                          {validacion.pedidosAsociados.length > 0 && (
                            <div className="mt-3">
                              <span className="text-xs text-muted-foreground mb-2 block">
                                Pedidos Asociados ({validacion.pedidosAsociados.length}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {validacion.pedidosAsociados.slice(0, 3).map((pedido) => (
                                  <Badge key={pedido.id} variant="secondary" className="text-xs">
                                    {pedido.codigo}
                                  </Badge>
                                ))}
                                {validacion.pedidosAsociados.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{validacion.pedidosAsociados.length - 3} más
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver detalles</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ajustar coherencia</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// 🎯 Componente auxiliar para indicador de coherencia
const CoherenciaIndicator: React.FC<{
  estado: 'ok' | 'advertencia' | 'critica';
  mensaje?: string;
}> = ({ estado, mensaje }) => {
  const getVariant = () => {
    switch (estado) {
      case 'ok': return 'default';
      case 'advertencia': return 'secondary';
      case 'critica': return 'destructive';
      default: return 'outline';
    }
  };

  const getIcon = () => {
    switch (estado) {
      case 'ok': return <CheckCircle className="w-3 h-3" />;
      case 'advertencia': return <AlertTriangle className="w-3 h-3" />;
      case 'critica': return <AlertCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getLabel = () => {
    switch (estado) {
      case 'ok': return 'Coherente';
      case 'advertencia': return 'Advertencia';
      case 'critica': return 'Crítico';
      default: return 'Desconocido';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={getVariant()} className="gap-1">
          {getIcon()}
          {getLabel()}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{mensaje || 'Sin información adicional'}</p>
      </TooltipContent>
    </Tooltip>
  );
};