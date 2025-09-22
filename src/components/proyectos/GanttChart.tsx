'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Settings,
  Layers,
  List
} from 'lucide-react';
import { GanttPorFases } from './fases/GanttPorFases';
import { CronogramaGanttView } from '../comercial/cronograma/CronogramaGanttView';

// ===================================================
// 📁 Archivo: GanttChart.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Componente Gantt principal con modos jerárquico y de tareas
//
// 🧠 Uso: Visualización Gantt con navegación entre modos
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-21
// ===================================================

interface ProyectoFase {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  fechaInicioPlan?: string;
  fechaFinPlan?: string;
  fechaInicioReal?: string;
  fechaFinReal?: string;
  estado: string;
  porcentajeAvance?: number;
  edts: any[];
}

interface GanttChartProps {
  // Modo jerárquico
  fases?: ProyectoFase[];
  proyectoId?: string;
  onEdtClick?: (edt: any) => void;
  onTareaClick?: (tarea: any) => void;

  // Modo comercial (existente)
  cotizacionId?: string;
  refreshKey?: number;
}

type GanttMode = 'jerarquico' | 'tareas';

export function GanttChart({
  fases,
  proyectoId,
  onEdtClick,
  onTareaClick,
  cotizacionId,
  refreshKey
}: GanttChartProps) {
  const [mode, setMode] = useState<GanttMode>('jerarquico');

  // Determinar modo disponible basado en props
  const availableModes = useMemo(() => {
    const modes: GanttMode[] = [];
    if (fases && proyectoId) modes.push('jerarquico');
    if (cotizacionId !== undefined) modes.push('tareas');
    return modes;
  }, [fases, proyectoId, cotizacionId]);

  // Auto-seleccionar modo si solo hay uno disponible
  useMemo(() => {
    if (availableModes.length === 1) {
      setMode(availableModes[0]);
    }
  }, [availableModes]);

  // Si no hay modos disponibles
  if (availableModes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Diagrama de Gantt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Vista Gantt no disponible</h3>
            <p className="text-muted-foreground">
              No hay datos suficientes para mostrar el diagrama de Gantt.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Diagrama de Gantt
          </CardTitle>

          {/* Selector de modo si hay múltiples opciones */}
          {availableModes.length > 1 && (
            <Tabs value={mode} onValueChange={(value) => setMode(value as GanttMode)}>
              <TabsList>
                {availableModes.includes('jerarquico') && (
                  <TabsTrigger value="jerarquico" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Jerárquico
                  </TabsTrigger>
                )}
                {availableModes.includes('tareas') && (
                  <TabsTrigger value="tareas" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Tareas
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Información del modo actual */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline">
            {mode === 'jerarquico' ? 'Proyecto → Fases → EDTs → Tareas' : 'EDTs y Tareas'}
          </Badge>
          {mode === 'jerarquico' && fases && (
            <span className="text-sm text-muted-foreground">
              {fases.length} fases • {fases.reduce((sum, f) => sum + (f.edts?.length || 0), 0)} EDTs
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Modo Jerárquico */}
        {mode === 'jerarquico' && fases && proyectoId && (
          <GanttPorFases
            fases={fases}
            proyectoId={proyectoId}
            onEdtClick={onEdtClick}
            onTareaClick={onTareaClick}
          />
        )}

        {/* Modo Tareas (existente) */}
        {mode === 'tareas' && cotizacionId !== undefined && (
          <CronogramaGanttView
            cotizacionId={cotizacionId}
            refreshKey={refreshKey || 0}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Componente wrapper para navegación suave entre Gantts
interface GanttNavigationProps extends GanttChartProps {
  onNavigateToEdt?: (edtId: string) => void;
  onNavigateToTarea?: (tareaId: string) => void;
}

export function GanttNavigation({
  onNavigateToEdt,
  onNavigateToTarea,
  ...props
}: GanttNavigationProps) {
  const handleEdtClick = (edt: any) => {
    props.onEdtClick?.(edt);
    onNavigateToEdt?.(edt.id);
  };

  const handleTareaClick = (tarea: any) => {
    props.onTareaClick?.(tarea);
    onNavigateToTarea?.(tarea.id);
  };

  return (
    <GanttChart
      {...props}
      onEdtClick={handleEdtClick}
      onTareaClick={handleTareaClick}
    />
  );
}