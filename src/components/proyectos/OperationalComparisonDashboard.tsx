'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ===================================================
// 📁 Archivo: OperationalComparisonDashboard.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Dashboard comparativo operativo de 3 cronogramas
//
// 🧠 Uso: Análisis avanzado de desviaciones y métricas operativas
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-21
// ===================================================

interface ComparisonData {
  proyecto: {
    id: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
  };
  comercial: any[];
  planificado: any[];
  real: any[];
  metricas: {
    precisionComercial: number;
    eficienciaPlanificacion: number;
    velocidadEjecucion: number;
    analisisPorCategoria: any[];
    desviacionesTemporales: any[];
    totalHorasPlan: number;
    totalHorasReal: number;
    desviacionHoras: number;
  };
  resumen: {
    totalEdtsComercial: number;
    totalEdtsPlanificado: number;
    totalEdtsReal: number;
    precisionComercial: number;
    eficienciaPlanificacion: number;
    velocidadEjecucion: number;
  };
}

interface OperationalComparisonDashboardProps {
  proyectoId: string;
  onRefresh?: () => void;
}

export function OperationalComparisonDashboard({
  proyectoId,
  onRefresh
}: OperationalComparisonDashboardProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Cargar datos de comparación
  useEffect(() => {
    loadComparisonData();
  }, [proyectoId]);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proyectos/comparacion-cronogramas?proyectoId=${proyectoId}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de comparación',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading comparison data:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar datos de comparación',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Comparativo Operativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Comparativo Operativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin datos de comparación</h3>
            <p className="text-muted-foreground mb-4">
              No hay datos suficientes para mostrar el análisis comparativo.
            </p>
            <Button onClick={loadComparisonData}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con métricas principales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Dashboard Comparativo Operativo
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadComparisonData}>
              <Activity className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Precisión Comercial */}
            <MetricCard
              title="Precisión Comercial"
              value={`${data.resumen.precisionComercial.toFixed(1)}%`}
              description="EDTs planificados vs comerciales"
              icon={<Target className="h-5 w-5" />}
              trend={data.resumen.precisionComercial >= 80 ? 'up' : 'down'}
              color={data.resumen.precisionComercial >= 80 ? 'green' : 'orange'}
            />

            {/* Eficiencia de Planificación */}
            <MetricCard
              title="Eficiencia Planificación"
              value={`${data.resumen.eficienciaPlanificacion.toFixed(1)}%`}
              description="EDTs ejecutados vs planificados"
              icon={<CheckCircle className="h-5 w-5" />}
              trend={data.resumen.eficienciaPlanificacion >= 90 ? 'up' : 'down'}
              color={data.resumen.eficienciaPlanificacion >= 90 ? 'green' : 'red'}
            />

            {/* Velocidad de Ejecución */}
            <MetricCard
              title="Velocidad Ejecución"
              value={`${data.resumen.velocidadEjecucion.toFixed(1)}%`}
              description="Horas reales vs planificadas"
              icon={<Zap className="h-5 w-5" />}
              trend={data.resumen.velocidadEjecucion <= 110 ? 'up' : 'down'}
              color={data.resumen.velocidadEjecucion <= 110 ? 'green' : 'red'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs de análisis detallado */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="categories">Por Categoría</TabsTrigger>
          <TabsTrigger value="timeline">Línea Temporal</TabsTrigger>
          <TabsTrigger value="deviations">Desviaciones</TabsTrigger>
        </TabsList>

        {/* Resumen General */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estadísticas por cronograma */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas por Cronograma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Comercial</span>
                    <Badge variant="secondary">{data.resumen.totalEdtsComercial} EDTs</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Planificado</span>
                    <Badge variant="secondary">{data.resumen.totalEdtsPlanificado} EDTs</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Real</span>
                    <Badge variant="secondary">{data.resumen.totalEdtsReal} EDTs</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Análisis de horas */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Horas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Horas Planificadas</span>
                      <span>{data.metricas.totalHorasPlan}h</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Horas Reales</span>
                      <span>{data.metricas.totalHorasReal}h</span>
                    </div>
                    <Progress
                      value={(data.metricas.totalHorasReal / data.metricas.totalHorasPlan) * 100}
                      className="h-2"
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Desviación</span>
                      <span className={data.metricas.desviacionHoras >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {data.metricas.desviacionHoras >= 0 ? '+' : ''}{data.metricas.desviacionHoras}h
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Análisis por Categoría */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparación por Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.metricas.analisisPorCategoria.map((cat: any, index: number) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{cat.categoria}</h4>
                      <Badge variant="outline">Desviación: {cat.desviacion}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{cat.comercial}</div>
                        <div className="text-muted-foreground">Comercial</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{cat.planificado}</div>
                        <div className="text-muted-foreground">Planificado</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">{cat.real}</div>
                        <div className="text-muted-foreground">Real</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análisis de Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Temporal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Análisis Temporal</h3>
                <p className="text-muted-foreground">
                  El análisis temporal detallado estará disponible próximamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Desviaciones */}
        <TabsContent value="deviations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desviaciones Detectadas</CardTitle>
            </CardHeader>
            <CardContent>
              {data.metricas.desviacionesTemporales.length > 0 ? (
                <div className="space-y-3">
                  {data.metricas.desviacionesTemporales.map((desviacion: any, index: number) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{desviacion.nombre}</h4>
                          <p className="text-sm text-muted-foreground">
                            Desviación: {desviacion.diasRetraso || 0} días
                          </p>
                        </div>
                        <Badge variant={desviacion.diasRetraso > 0 ? "destructive" : "secondary"}>
                          {desviacion.diasRetraso > 0 ? 'Retraso' : 'A tiempo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sin desviaciones significativas</h3>
                  <p className="text-muted-foreground">
                    El proyecto se está ejecutando según lo planificado.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente auxiliar para métricas
function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  color
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
  color: 'green' | 'orange' | 'red';
}) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50 border-green-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    red: 'text-red-600 bg-red-50 border-red-200'
  };

  return (
    <Card className={`border ${colorClasses[color]}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`p-2 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-center">
          {trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
          ) : trend === 'down' ? (
            <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
          ) : (
            <div className="h-4 w-4 mr-1" />
          )}
          <span className="text-xs">
            {trend === 'up' ? 'Positivo' : trend === 'down' ? 'Requiere atención' : 'Estable'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}