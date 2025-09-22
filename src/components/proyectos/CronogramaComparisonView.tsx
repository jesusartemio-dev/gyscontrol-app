'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  Users,
  Zap,
  ArrowRight,
  Eye,
  Settings,
  PlayCircle
} from 'lucide-react';
import type { ProyectoEdtConRelaciones } from '@/types/modelos';
import { formatearHoras, formatearFecha } from '@/lib/utils';

// ✅ Props del componente
interface CronogramaComparisonViewProps {
  proyectoId: string;
  comercialEdts: ProyectoEdtConRelaciones[];
  proyectoEdts: ProyectoEdtConRelaciones[];
  registrosHoras: any[];
  loading?: boolean;
}

// ✅ Componente de comparación individual
interface ComparisonRowProps {
  comercial?: ProyectoEdtConRelaciones;
  proyecto?: ProyectoEdtConRelaciones;
  registros?: any[];
  categoria: string;
}

function ComparisonRow({ comercial, proyecto, registros, categoria }: ComparisonRowProps) {
  // Calcular métricas
  const horasComercial = comercial?.horasPlan || 0;
  const horasProyecto = proyecto?.horasPlan || 0;
  const horasReales = registros?.reduce((sum, reg) => sum + Number(reg.horasTrabajadas || 0), 0) || 0;

  const desviacionPlan = horasProyecto > 0 ? ((horasProyecto - horasComercial) / horasComercial) * 100 : 0;
  const desviacionReal = horasProyecto > 0 ? ((horasReales - horasProyecto) / horasProyecto) * 100 : 0;
  const eficiencia = horasProyecto > 0 ? (horasReales / horasProyecto) * 100 : 0;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          {categoria}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Estimación Comercial */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-700">Estimación Comercial</span>
            </div>
            <div className="space-y-2 pl-6">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Horas:</span>
                <span className="font-medium">{formatearHoras(horasComercial)}</span>
              </div>
              {comercial?.fechaInicio && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Inicio:</span>
                  <span className="text-sm">{formatearFecha(new Date(comercial.fechaInicio))}</span>
                </div>
              )}
              {comercial?.fechaFin && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fin:</span>
                  <span className="text-sm">{formatearFecha(new Date(comercial.fechaFin))}</span>
                </div>
              )}
              {comercial?.responsable && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Responsable:</span>
                  <span className="text-sm">{comercial.responsable.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Plan de Proyecto */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-700">Plan de Proyecto</span>
              {desviacionPlan !== 0 && (
                <Badge variant={desviacionPlan > 0 ? 'destructive' : 'default'} className="text-xs">
                  {desviacionPlan > 0 ? '+' : ''}{desviacionPlan.toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="space-y-2 pl-6">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Horas:</span>
                <span className="font-medium">{formatearHoras(horasProyecto)}</span>
              </div>
              {proyecto?.fechaInicio && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Inicio:</span>
                  <span className="text-sm">{formatearFecha(new Date(proyecto.fechaInicio))}</span>
                </div>
              )}
              {proyecto?.fechaFin && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fin:</span>
                  <span className="text-sm">{formatearFecha(new Date(proyecto.fechaFin))}</span>
                </div>
              )}
              {proyecto?.estado && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <Badge variant="outline" className="text-xs">{proyecto.estado}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Ejecución Real */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-purple-700">Ejecución Real</span>
              {horasReales > 0 && (
                <Badge variant={eficiencia >= 100 ? 'default' : eficiencia >= 80 ? 'secondary' : 'destructive'} className="text-xs">
                  {eficiencia.toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="space-y-2 pl-6">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Horas:</span>
                <span className="font-medium">{formatearHoras(horasReales)}</span>
              </div>
              {registros && registros.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Registros:</span>
                  <span className="text-sm">{registros.length}</span>
                </div>
              )}
              {horasReales > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progreso:</span>
                    <span>{Math.min(100, eficiencia).toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(100, eficiencia)} className="h-1" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indicadores de desviación */}
        {(desviacionPlan !== 0 || desviacionReal !== 0) && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-4 text-sm">
              {desviacionPlan !== 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Desviación Plan vs Estimación:</span>
                  <Badge variant={Math.abs(desviacionPlan) > 20 ? 'destructive' : 'secondary'}>
                    {desviacionPlan > 0 ? '+' : ''}{desviacionPlan.toFixed(1)}%
                  </Badge>
                </div>
              )}
              {desviacionReal !== 0 && horasReales > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Desviación Real vs Plan:</span>
                  <Badge variant={Math.abs(desviacionReal) > 20 ? 'destructive' : 'secondary'}>
                    {desviacionReal > 0 ? '+' : ''}{desviacionReal.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ✅ Componente principal
export function CronogramaComparisonView({
  proyectoId,
  comercialEdts,
  proyectoEdts,
  registrosHoras,
  loading = false
}: CronogramaComparisonViewProps) {
  const [activeTab, setActiveTab] = useState('resumen');

  // Agrupar datos por categoría
  const categoriasMap = new Map<string, {
    comercial?: ProyectoEdtConRelaciones;
    proyecto?: ProyectoEdtConRelaciones;
    registros: any[];
  }>();

  // Procesar EDTs comerciales
  comercialEdts.forEach(edt => {
    const categoria = edt.categoriaServicio?.nombre || 'Sin categoría';
    if (!categoriasMap.has(categoria)) {
      categoriasMap.set(categoria, { registros: [] });
    }
    categoriasMap.get(categoria)!.comercial = edt;
  });

  // Procesar EDTs de proyecto
  proyectoEdts.forEach(edt => {
    const categoria = edt.categoriaServicio?.nombre || 'Sin categoría';
    if (!categoriasMap.has(categoria)) {
      categoriasMap.set(categoria, { registros: [] });
    }
    categoriasMap.get(categoria)!.proyecto = edt;
  });

  // Procesar registros de horas
  registrosHoras.forEach(registro => {
    const categoria = registro.categoria || 'Sin categoría';
    if (!categoriasMap.has(categoria)) {
      categoriasMap.set(categoria, { registros: [] });
    }
    categoriasMap.get(categoria)!.registros.push(registro);
  });

  // Calcular métricas globales
  const totalComercial = comercialEdts.reduce((sum, edt) => sum + (edt.horasPlan || 0), 0);
  const totalProyecto = proyectoEdts.reduce((sum, edt) => sum + (edt.horasPlan || 0), 0);
  const totalReal = registrosHoras.reduce((sum, reg) => sum + Number(reg.horasTrabajadas || 0), 0);

  const desviacionGlobal = totalProyecto > 0 ? ((totalProyecto - totalComercial) / totalComercial) * 100 : 0;
  const eficienciaGlobal = totalProyecto > 0 ? (totalReal / totalProyecto) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con métricas globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimación Total</p>
                <p className="text-2xl font-bold">{formatearHoras(totalComercial)}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plan Total</p>
                <p className="text-2xl font-bold">{formatearHoras(totalProyecto)}</p>
                {desviacionGlobal !== 0 && (
                  <p className={`text-xs ${desviacionGlobal > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {desviacionGlobal > 0 ? '+' : ''}{desviacionGlobal.toFixed(1)}%
                  </p>
                )}
              </div>
              <Settings className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ejecutado</p>
                <p className="text-2xl font-bold">{formatearHoras(totalReal)}</p>
                <p className={`text-xs ${eficienciaGlobal >= 100 ? 'text-green-500' : eficienciaGlobal >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {eficienciaGlobal.toFixed(1)}% eficiencia
                </p>
              </div>
              <PlayCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">EDTs</p>
                <p className="text-2xl font-bold">{categoriasMap.size}</p>
                <p className="text-xs text-muted-foreground">
                  {comercialEdts.length} est. • {proyectoEdts.length} plan
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de vista */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resumen">Resumen Ejecutivo</TabsTrigger>
          <TabsTrigger value="detallado">Vista Detallada</TabsTrigger>
        </TabsList>

        {/* Vista Resumen */}
        <TabsContent value="resumen" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Ejecutivo del Cronograma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progreso general */}
              <div>
                <h4 className="font-medium mb-3">Progreso General del Proyecto</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Estimación → Plan → Real</span>
                    <span>{eficienciaGlobal.toFixed(1)}% completado</span>
                  </div>
                  <Progress value={Math.min(100, eficienciaGlobal)} className="h-3" />
                </div>
              </div>

              {/* Alertas importantes */}
              {(Math.abs(desviacionGlobal) > 20 || eficienciaGlobal < 80) && (
                <div className="space-y-3">
                  <h4 className="font-medium">Alertas y Observaciones</h4>
                  <div className="space-y-2">
                    {Math.abs(desviacionGlobal) > 20 && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          Desviación significativa entre estimación comercial y plan de proyecto ({desviacionGlobal.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                    {eficienciaGlobal < 80 && totalReal > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">
                          Eficiencia por debajo del 80% - revisar ejecución del proyecto
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Distribución por categorías */}
              <div>
                <h4 className="font-medium mb-3">Distribución por Categorías</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from(categoriasMap.entries()).map(([categoria, data]) => (
                    <div key={categoria} className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2">{categoria}</h5>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Est.:</span>
                          <span className="ml-1 font-medium">{formatearHoras(data.comercial?.horasPlan || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plan:</span>
                          <span className="ml-1 font-medium">{formatearHoras(data.proyecto?.horasPlan || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Real:</span>
                          <span className="ml-1 font-medium">{formatearHoras(data.registros.reduce((sum, r) => sum + Number(r.horasTrabajadas || 0), 0))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vista Detallada */}
        <TabsContent value="detallado" className="space-y-6">
          {Array.from(categoriasMap.entries()).map(([categoria, data]) => (
            <ComparisonRow
              key={categoria}
              categoria={categoria}
              comercial={data.comercial}
              proyecto={data.proyecto}
              registros={data.registros}
            />
          ))}

          {categoriasMap.size === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay datos de cronograma</h3>
                <p className="text-muted-foreground">
                  No se encontraron EDTs comerciales ni de proyecto para comparar.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}