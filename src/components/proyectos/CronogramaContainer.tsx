'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  RefreshCw, 
  Download, 
  Upload, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Calendar,
  BarChart3,
  List,
  PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EdtList } from './EdtList';
import { EdtForm } from './EdtForm';
import { KpiDashboard } from './KpiDashboard';
import { toast } from '@/hooks/use-toast';
import { ProyectoEdtService } from '@/lib/services/proyectoEdt';
import { CronogramaAnalyticsService } from '@/lib/services/cronogramaAnalytics';
import { getCategoriasServicio } from '@/lib/services/categoriaServicio';
import { getUsers } from '@/lib/services/user';
import type { 
  Proyecto, 
  ProyectoEdtConRelaciones,
  CategoriaServicio,
  User,
  KpisCronograma,
  TendenciaMensual,
  AnalisisRendimiento,
  MetricasComparativas,
  FiltrosCronogramaData,
  PrioridadEdt
} from '@/types/modelos';
import type { ProyectoEdtPayload } from '@/types/payloads';

// ✅ Props del componente
interface CronogramaContainerProps {
  proyectoId: string;
  proyecto: Proyecto;
}

// ✅ Estados del contenedor
type VistaActiva = 'dashboard' | 'lista' | 'gantt' | 'reportes';
type ModalActivo = 'crear' | 'editar' | 'configuracion' | null;

// ✅ Componente principal
export function CronogramaContainer({ proyectoId, proyecto }: CronogramaContainerProps) {
  // ✅ Estados principales
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('dashboard');
  const [modalActivo, setModalActivo] = useState<ModalActivo>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Estados de datos
  const [edts, setEdts] = useState<ProyectoEdtConRelaciones[]>([]);
  const [categoriasServicios, setCategoriasServicios] = useState<CategoriaServicio[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [edtSeleccionado, setEdtSeleccionado] = useState<ProyectoEdtConRelaciones | null>(null);

  // ✅ Estados de analytics
  const [kpis, setKpis] = useState<KpisCronograma | null>(null);
  const [tendencias, setTendencias] = useState<TendenciaMensual[]>([]);
  const [analisisRendimiento, setAnalisisRendimiento] = useState<AnalisisRendimiento[]>([]);
  const [metricas, setMetricas] = useState<MetricasComparativas[]>([]);
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'semestre' | 'año'>('mes');

  // ✅ Cargar datos iniciales
  const cargarDatos = useCallback(async (mostrarLoading = true) => {
    if (mostrarLoading) setLoading(true);
    if (!mostrarLoading) setRefreshing(true);

    try {
      // Cargar datos en paralelo
      const [edtsData, categoriasData, usuariosData] = await Promise.all([
        ProyectoEdtService.obtenerEdtsPorProyecto(proyectoId),
        getCategoriasServicio(),
      getUsers()
      ]);

      setEdts(edtsData);
      setCategoriasServicios(categoriasData);
      setUsuarios(usuariosData || []);

      // Cargar analytics si hay EDT
      if (edtsData.length > 0) {
        await cargarAnalytics();
      }

      toast({
        title: 'Datos actualizados',
        description: 'La información del cronograma ha sido actualizada correctamente'
      });
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del cronograma',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [proyectoId]);

  // ✅ Cargar analytics
  const cargarAnalytics = useCallback(async () => {
    try {
      const [kpisData, tendenciasData, rendimientoData, metricasData] = await Promise.all([
        CronogramaAnalyticsService.obtenerKpisCronograma(proyectoId, { proyectoId } as FiltrosCronogramaData),
      CronogramaAnalyticsService.obtenerTendenciasMensuales(proyectoId),
      CronogramaAnalyticsService.obtenerAnalisisRendimiento(proyectoId),
      CronogramaAnalyticsService.obtenerMetricasComparativas([proyectoId])
      ]);

      setKpis(kpisData);
      setTendencias(tendenciasData);
      setAnalisisRendimiento(rendimientoData);
      setMetricas(metricasData);
    } catch (error) {
      console.error('Error al cargar analytics:', error);
      // No mostrar error toast para analytics, es información adicional
    }
  }, [proyectoId, periodo]);

  // ✅ Efectos
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (edts.length > 0) {
      cargarAnalytics();
    }
  }, [periodo, cargarAnalytics, edts.length]);

  // ✅ Handlers de EDT
  const handleCrearEdt = async (data: ProyectoEdtPayload) => {       
    try {
      const edtData = {
        ...data,
        prioridad: data.prioridad || 'MEDIA' as PrioridadEdt
      };
      await ProyectoEdtService.crearEdt(edtData);
      await cargarDatos(false);
      setModalActivo(null);
      toast({
        title: 'EDT creado',
        description: 'El EDT ha sido creado correctamente'
      });
    } catch (error) {
      console.error('Error al crear EDT:', error);
      throw error; // Re-throw para que el form lo maneje
    }
  };

  const handleActualizarEdt = async (data: ProyectoEdtPayload) => {
    if (!edtSeleccionado) return;

    try {
      const updateData = {
        ...data,
        fechaInicioReal: data.fechaInicioReal ? new Date(data.fechaInicioReal) : null,
        fechaFinReal: data.fechaFinReal ? new Date(data.fechaFinReal) : null,
        fechaInicioPlan: data.fechaInicio ? new Date(data.fechaInicio) : null,
        fechaFinPlan: data.fechaFin ? new Date(data.fechaFin) : null
      };
      await ProyectoEdtService.actualizarEdt(edtSeleccionado.id, updateData);
      await cargarDatos(false);
      setModalActivo(null);
      setEdtSeleccionado(null);
      toast({
        title: 'EDT actualizado',
        description: 'El EDT ha sido actualizado correctamente'
      });
    } catch (error) {
      console.error('Error al actualizar EDT:', error);
      throw error; // Re-throw para que el form lo maneje
    }
  };

  const handleEliminarEdt = async (edtId: string) => {
    try {
      await ProyectoEdtService.eliminarEdt(edtId);
      await cargarDatos(false);
      toast({
        title: 'EDT eliminado',
        description: 'El EDT ha sido eliminado correctamente'
      });
    } catch (error) {
      console.error('Error al eliminar EDT:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el EDT',
        variant: 'destructive'
      });
    }
  };

  const handleSeleccionarEdt = (edt: ProyectoEdtConRelaciones) => {
    setEdtSeleccionado(edt);
    // Aquí podrías abrir un modal de detalles o navegar a una vista específica
  };

  const abrirModalEditar = (edt: ProyectoEdtConRelaciones) => {
    setEdtSeleccionado(edt);
    setModalActivo('editar');
  };

  // ✅ Estadísticas rápidas
  const estadisticas = {
    total: edts.length,
    completados: edts.filter(edt => edt.estado === 'completado').length,
    enProgreso: edts.filter(edt => edt.estado === 'en_progreso').length,
    enRiesgo: edts.filter(edt => edt.estado === 'detenido').length,
    progresoPromedio: edts.length > 0 ? 
      edts.reduce((sum, edt) => sum + edt.porcentajeAvance, 0) / edts.length : 0
  };

  return (
    <div className="space-y-6">
      {/* ✅ Header con acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Badge variant={proyecto.estado === 'activo' ? 'default' : 'secondary'}>
            {proyecto.estado}
          </Badge>
          <div className="text-sm text-muted-foreground">
            {estadisticas.total} EDT • {estadisticas.completados} completados
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarDatos(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalActivo('configuracion')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button
            size="sm"
            onClick={() => setModalActivo('crear')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo EDT
          </Button>
        </div>
      </div>

      {/* ✅ Alertas de estado */}
      <AnimatePresence>
        {estadisticas.enRiesgo > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hay {estadisticas.enRiesgo} EDT detenidos que requieren atención inmediata.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        
        {estadisticas.progresoPromedio >= 90 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ¡Excelente progreso! El proyecto está cerca de completarse con un {estadisticas.progresoPromedio.toFixed(1)}% de avance.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Navegación por tabs */}
      <Tabs value={vistaActiva} onValueChange={(value) => setVistaActiva(value as VistaActiva)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista EDT
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Gantt
          </TabsTrigger>
          <TabsTrigger value="reportes" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Reportes
          </TabsTrigger>
        </TabsList>

        {/* ✅ Vista Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <KpiDashboard
            proyectoId={proyectoId}
            kpis={kpis || undefined}
            tendencias={tendencias || undefined}
            analisisRendimiento={analisisRendimiento[0] || undefined}
            metricas={metricas[0] || undefined}
            edts={edts}
            loading={loading}
            periodo={periodo}
            onPeriodoChange={setPeriodo}
          />
        </TabsContent>

        {/* ✅ Vista Lista */}
        <TabsContent value="lista" className="space-y-6">
          <EdtList
            proyectoId={proyectoId}
            edts={edts}
            loading={loading}
            onEdtSelect={handleSeleccionarEdt}
            onEdtEdit={abrirModalEditar}
            onEdtDelete={handleEliminarEdt}
            onRefresh={() => cargarDatos(false)}
          />
        </TabsContent>

        {/* ✅ Vista Gantt (placeholder) */}
        <TabsContent value="gantt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Diagrama de Gantt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Vista Gantt</h3>
                <p className="text-muted-foreground">
                  La vista de diagrama de Gantt estará disponible próximamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ Vista Reportes (placeholder) */}
        <TabsContent value="reportes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Reportes Avanzados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PieChart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Reportes Personalizados</h3>
                <p className="text-muted-foreground">
                  Los reportes avanzados y exportación de datos estarán disponibles próximamente.
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ✅ Modal para crear EDT */}
      <Dialog open={modalActivo === 'crear'} onOpenChange={() => setModalActivo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo EDT</DialogTitle>
          </DialogHeader>
          <EdtForm
            proyectoId={proyectoId}
            categoriasServicios={categoriasServicios}
            usuarios={usuarios}
            onSubmit={handleCrearEdt}
            onCancel={() => setModalActivo(null)}
          />
        </DialogContent>
      </Dialog>

      {/* ✅ Modal para editar EDT */}
      <Dialog open={modalActivo === 'editar'} onOpenChange={() => {
        setModalActivo(null);
        setEdtSeleccionado(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar EDT</DialogTitle>
          </DialogHeader>
          {edtSeleccionado && (
            <EdtForm
              proyectoId={proyectoId}
              edt={edtSeleccionado}
              categoriasServicios={categoriasServicios}
              usuarios={usuarios}
              onSubmit={handleActualizarEdt}
              onCancel={() => {
                setModalActivo(null);
                setEdtSeleccionado(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ Modal de configuración (placeholder) */}
      <Dialog open={modalActivo === 'configuracion'} onOpenChange={() => setModalActivo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración del Cronograma</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Configuración</h3>
            <p className="text-muted-foreground">
              Las opciones de configuración estarán disponibles próximamente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}