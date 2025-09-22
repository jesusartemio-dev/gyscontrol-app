'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

// ===================================================
// 📁 Archivo: GanttMini.tsx
// 📌 Ubicación: src/components/proyectos/fases/
// 🔧 Descripción: Versión compacta del Gantt para comparación
//
// 🧠 Uso: Dashboard comparativo de 3 cronogramas paralelos
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-21
// ===================================================

interface CronogramaData {
  id: string;
  nombre: string;
  categoria?: string;
  fechaInicio?: string;
  fechaFin?: string;
  horasEstimadas?: number;
  horasReales?: number;
  estado: string;
  porcentajeAvance?: number;
  tareas?: number;
  tipo: 'comercial' | 'planificado' | 'real';
  fase?: string;
}

interface GanttMiniProps {
  data: CronogramaData[];
  color: 'blue' | 'green' | 'orange';
  showMetrics?: boolean;
  title?: string;
}

export function GanttMini({ data, color, showMetrics = false, title }: GanttMiniProps) {
  // Calcular métricas
  const totalItems = data.length;
  const completados = data.filter(item => item.estado === 'completado').length;
  const enProgreso = data.filter(item => item.estado === 'en_progreso').length;
  const promedioAvance = totalItems > 0 ?
    data.reduce((sum, item) => sum + (item.porcentajeAvance || 0), 0) / totalItems : 0;

  const totalHoras = data.reduce((sum, item) => sum + (item.horasEstimadas || item.horasReales || 0), 0);
  const totalTareas = data.reduce((sum, item) => sum + (item.tareas || 0), 0);

  // Colores según el tipo
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      text: 'text-blue-800',
      progress: 'bg-blue-500'
    },
    green: {
      bg: 'bg-green-100',
      border: 'border-green-200',
      text: 'text-green-800',
      progress: 'bg-green-500'
    },
    orange: {
      bg: 'bg-orange-100',
      border: 'border-orange-200',
      text: 'text-orange-800',
      progress: 'bg-orange-500'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <Calendar className={`h-4 w-4 ${colors.text}`} />
          <h3 className={`font-medium ${colors.text}`}>{title}</h3>
        </div>
      )}

      {/* Timeline simplificado */}
      <div className="space-y-2 mb-4">
        {data.slice(0, 5).map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium truncate">{item.nombre}</span>
                {item.categoria && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {item.categoria}
                  </Badge>
                )}
              </div>
              {item.fase && (
                <div className="text-xs text-muted-foreground">{item.fase}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={item.porcentajeAvance || 0}
                className="w-12 h-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {item.porcentajeAvance || 0}%
              </span>
            </div>
          </div>
        ))}

        {data.length > 5 && (
          <div className="text-xs text-muted-foreground text-center py-1">
            +{data.length - 5} más...
          </div>
        )}
      </div>

      {/* Métricas */}
      {showMetrics && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
          <div className="text-center">
            <div className="text-lg font-semibold">{totalItems}</div>
            <div className="text-xs text-muted-foreground">Total EDTs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{completados}</div>
            <div className="text-xs text-muted-foreground">Completados</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{promedioAvance.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Avance Promedio</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{totalHoras}</div>
            <div className="text-xs text-muted-foreground">Horas Totales</div>
          </div>
        </div>
      )}

      {/* Indicador de estado general */}
      <div className="flex items-center justify-center mt-3 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1">
          {completados === totalItems && totalItems > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : enProgreso > 0 ? (
            <Minus className="h-4 w-4 text-blue-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-orange-600" />
          )}
          <span className="text-xs font-medium">
            {completados === totalItems && totalItems > 0 ? 'Completado' :
             enProgreso > 0 ? 'En Progreso' : 'Pendiente'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Componente wrapper para múltiples GanttMini
interface GanttMiniComparisonProps {
  comercial: CronogramaData[];
  planificado: CronogramaData[];
  real: CronogramaData[];
}

export function GanttMiniComparison({ comercial, planificado, real }: GanttMiniComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <GanttMini
          data={comercial}
          color="blue"
          showMetrics={true}
          title="Cronograma Comercial"
        />
      </div>
      <div>
        <GanttMini
          data={planificado}
          color="green"
          showMetrics={true}
          title="Cronograma Planificado"
        />
      </div>
      <div>
        <GanttMini
          data={real}
          color="orange"
          showMetrics={true}
          title="Cronograma Real"
        />
      </div>
    </div>
  );
}