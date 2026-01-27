'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
  CheckCircle,
  Play,
  Pause
} from 'lucide-react';

// ===================================================
// 📁 Archivo: GanttPorFases.tsx
// 📌 Ubicación: src/components/proyectos/fases/
// 🔧 Descripción: Gantt jerárquico completo de 4 niveles
//
// 🧠 Uso: Visualización jerárquica Proyecto → Fases → EDTs → Tareas
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

interface GanttPorFasesProps {
  fases: ProyectoFase[];
  proyectoId: string;
  onEdtClick?: (edt: any) => void;
  onTareaClick?: (tarea: any) => void;
}

export function GanttPorFases({
  fases,
  proyectoId,
  onEdtClick,
  onTareaClick
}: GanttPorFasesProps) {
  const [expandedFases, setExpandedFases] = useState<Set<string>>(new Set());
  const [expandedEdts, setExpandedEdts] = useState<Set<string>>(new Set());

  // Funciones de expansión
  const toggleFase = (faseId: string) => {
    const newExpanded = new Set(expandedFases);
    if (newExpanded.has(faseId)) {
      newExpanded.delete(faseId);
    } else {
      newExpanded.add(faseId);
    }
    setExpandedFases(newExpanded);
  };

  const toggleEdt = (edtId: string) => {
    const newExpanded = new Set(expandedEdts);
    if (newExpanded.has(edtId)) {
      newExpanded.delete(edtId);
    } else {
      newExpanded.add(edtId);
    }
    setExpandedEdts(newExpanded);
  };

  // Obtener icono según estado
  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'en_progreso': return <Play className="h-4 w-4 text-blue-600" />;
      case 'detenido': return <Pause className="h-4 w-4 text-red-600" />;
      case 'planificado': return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Gantt Jerárquico - Proyecto → Fases → EDTs → Tareas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Proyecto Level */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Proyecto Completo</span>
              <Badge variant="secondary">{fases.length} fases</Badge>
            </div>
          </div>

          {/* Fases */}
          {fases.map((fase) => (
            <div key={fase.id} className="border rounded-lg">
              {/* Fase Header */}
              <div className="flex items-center justify-between p-4 bg-green-50 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFase(fase.id)}
                    className="h-6 w-6 p-0"
                  >
                    {expandedFases.has(fase.id) ?
                      <ChevronDown className="h-4 w-4" /> :
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                  {getEstadoIcon(fase.estado)}
                  <span className="font-medium">{fase.nombre}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{fase.edts?.length || 0} EDTs</Badge>
                  <Progress value={fase.porcentajeAvance || 0} className="w-16 h-2" />
                  <span className="text-sm text-muted-foreground">{fase.porcentajeAvance || 0}%</span>
                </div>
              </div>

              {/* EDTs dentro de la fase */}
              {expandedFases.has(fase.id) && fase.edts?.map((edt: any) => (
                <div key={edt.id} className="ml-8 border-l-2 border-gray-200">
                  {/* EDT Row */}
                  <div
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b"
                    onClick={() => onEdtClick?.(edt)}
                  >
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEdt(edt.id);
                        }}
                        className="h-5 w-5 p-0"
                      >
                        {expandedEdts.has(edt.id) ?
                          <ChevronDown className="h-3 w-3" /> :
                          <ChevronRight className="h-3 w-3" />
                        }
                      </Button>
                      {getEstadoIcon(edt.estado)}
                      <span className="text-sm font-medium">{edt.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {edt.edt?.nombre || 'Sin categoría'}
                      </Badge>
                      <Progress value={edt.porcentajeAvance || 0} className="w-12 h-1.5" />
                      <span className="text-xs text-muted-foreground">{edt.porcentajeAvance || 0}%</span>
                    </div>
                  </div>

                  {/* Tareas dentro del EDT */}
                  {expandedEdts.has(edt.id) && edt.tareas?.map((tarea: any) => (
                    <div
                      key={tarea.id}
                      className="ml-12 p-2 hover:bg-orange-50 cursor-pointer border-b border-gray-100"
                      onClick={() => onTareaClick?.(tarea)}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-orange-600" />
                        <span className="text-xs">{tarea.nombre}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {tarea.estado}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}