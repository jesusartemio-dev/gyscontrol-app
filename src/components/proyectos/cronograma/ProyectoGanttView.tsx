/**
 * Componente ProyectoGanttView - Vista Gantt Integrada con 5 Niveles
 *
 * Diagrama de Gantt completo que muestra la jerarquía completa:
 * Proyecto → Fases → EDTs → Actividades → Tareas
 */

'use client';


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  ZoomIn,
  ZoomOut,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  Square,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos para la jerarquía completa
interface GanttItem {
  id: string;
  nombre: string;
  tipo: 'proyecto' | 'fase' | 'edt' | 'zona' | 'actividad' | 'tarea';
  fechaInicio: Date;
  fechaFin: Date;
  porcentajeAvance: number;
  estado: string;
  nivel: number;
  padreId?: string;
  hijos?: GanttItem[];
  color: string;
  expandable: boolean;
  expanded?: boolean;
}

interface ProyectoGanttViewProps {
  proyectoId: string;
  cronogramaId?: string;
  modoVista?: 'automatico' | 'jerarquia_completa';
  onItemClick?: (item: GanttItem) => void;
}

export function ProyectoGanttView({
  proyectoId,
  cronogramaId,
  modoVista = 'automatico',
  onItemClick
}: ProyectoGanttViewProps) {

  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1); // 0.5 = 6 meses, 1 = 3 meses, 2 = 1.5 meses
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [dataLoaded, setDataLoaded] = useState(false);
  const { toast } = useToast();

  // Cargar datos jerárquicos
  const loadGanttData = useCallback(async () => {
    try {
      setLoading(true);

      // Cargar proyecto base
      const proyectoResponse = await fetch(`/api/proyectos/${proyectoId}`);
      if (!proyectoResponse.ok) {
        throw new Error('Error al cargar proyecto');
      }
      const proyectoData = await proyectoResponse.json();
      const proyecto = proyectoData.data;

      // Establecer fechas del proyecto (manejar fechas null)
      const projFechaInicio = proyecto.fechaInicio ? new Date(proyecto.fechaInicio) : new Date();
      const projFechaFin = proyecto.fechaFin ? new Date(proyecto.fechaFin) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // +1 año por defecto
      setFechaInicio(projFechaInicio);
      setFechaFin(projFechaFin);

      // Cargar fases filtradas por cronograma
      const fasesUrl = cronogramaId
        ? `/api/proyectos/${proyectoId}/cronograma/fases?cronogramaId=${cronogramaId}`
        : `/api/proyectos/${proyectoId}/cronograma/fases`;
      const fasesResponse = await fetch(fasesUrl);
      const fasesData = fasesResponse.ok ? await fasesResponse.json() : { data: [] };

      // Cargar EDTs filtrados por cronograma
      const edtsUrl = cronogramaId
        ? `/api/proyectos/${proyectoId}/cronograma/edts?cronogramaId=${cronogramaId}`
        : `/api/proyectos/${proyectoId}/cronograma/edts`;
      const edtsResponse = await fetch(edtsUrl);
      const edtsData = edtsResponse.ok ? await edtsResponse.json() : { data: [] };

      // Cargar zonas filtradas por cronograma (solo si existen zonas, pero según el usuario ya no hay zonas)
      console.log('ℹ️ Skipping zonas loading - no longer used in 5-level cronograma')
      const zonasData = { data: [] };

      // Cargar actividades filtradas por cronograma
      const actividadesUrl = cronogramaId
        ? `/api/proyectos/${proyectoId}/cronograma/actividades?cronogramaId=${cronogramaId}&modoVista=${modoVista}`
        : `/api/proyectos/${proyectoId}/cronograma/actividades?modoVista=${modoVista}`;
      const actividadesResponse = await fetch(actividadesUrl);
      const actividadesData = actividadesResponse.ok ? await actividadesResponse.json() : { data: [] };

      // Cargar tareas filtradas por cronograma
      const tareasUrl = cronogramaId
        ? `/api/proyectos/${proyectoId}/tareas?cronogramaId=${cronogramaId}`
        : `/api/proyectos/${proyectoId}/tareas`;
      const tareasResponse = await fetch(tareasUrl);
      const tareasData = tareasResponse.ok ? await tareasResponse.json() : { data: [] };

      // Construir jerarquía
      const ganttItems: GanttItem[] = [];

      // Proyecto raíz
      const proyectoItem: GanttItem = {
        id: proyecto.id,
        nombre: proyecto.nombre,
        tipo: 'proyecto',
        fechaInicio: projFechaInicio,
        fechaFin: projFechaFin,
        porcentajeAvance: proyecto.progresoGeneral || 0,
        estado: proyecto.estado,
        nivel: 0,
        color: '#3b82f6',
        expandable: true,
        expanded: true,
        hijos: []
      };

      // Agregar fases
      proyectoItem.hijos = fasesData.data?.map((fase: any) => ({
        id: fase.id,
        nombre: fase.nombre,
        tipo: 'fase' as const,
        fechaInicio: fase.fechaInicioPlan ? new Date(fase.fechaInicioPlan) : projFechaInicio,
        fechaFin: fase.fechaFinPlan ? new Date(fase.fechaFinPlan) : projFechaFin,
        porcentajeAvance: fase.porcentajeAvance || 0,
        estado: fase.estado,
        nivel: 1,
        padreId: proyecto.id,
        color: '#10b981',
        expandable: true,
        expanded: false,
        hijos: []
      })) || [];

      // Agregar EDTs a fases
      proyectoItem.hijos?.forEach((fase: GanttItem) => {
        const edtsDeFase = edtsData.data?.filter((edt: any) => edt.proyectoFaseId === fase.id) || [];
        fase.hijos = edtsDeFase.map((edt: any) => ({
          id: edt.id,
          nombre: edt.nombre,
          tipo: 'edt' as const,
          fechaInicio: edt.fechaInicioPlan ? new Date(edt.fechaInicioPlan) : fase.fechaInicio,
          fechaFin: edt.fechaFinPlan ? new Date(edt.fechaFinPlan) : fase.fechaFin,
          porcentajeAvance: edt.porcentajeAvance || 0,
          estado: edt.estado,
          nivel: 2,
          padreId: fase.id,
          color: '#f59e0b',
          expandable: true,
          expanded: false,
          hijos: []
        }));

        // Agregar EDTs a fases (5 niveles: Proyecto > Fase > EDT > Actividad > Tarea)
        fase.hijos?.forEach((edt: GanttItem) => {
          // EDTs ahora conectan directamente con actividades (sin zonas)
          const actividadesDeEdt = actividadesData.data?.filter((act: any) => act.proyectoEdtId === edt.id) || [];
          edt.hijos = actividadesDeEdt.map((actividad: any) => ({
            id: actividad.id,
            nombre: actividad.nombre,
            tipo: 'actividad' as const,
            fechaInicio: actividad.fechaInicioPlan ? new Date(actividad.fechaInicioPlan) : edt.fechaInicio,
            fechaFin: actividad.fechaFinPlan ? new Date(actividad.fechaFinPlan) : edt.fechaFin,
            porcentajeAvance: actividad.porcentajeAvance || 0,
            estado: actividad.estado,
            nivel: 3, // EDT es nivel 2, actividad es nivel 3
            padreId: edt.id,
            color: '#ef4444',
            expandable: true,
            expanded: false,
            hijos: []
          }));

          // Agregar tareas a actividades
          edt.hijos?.forEach((actividad: GanttItem) => {
            const tareasDeActividad = tareasData.data?.filter((tarea: any) => tarea.proyectoActividadId === actividad.id) || [];
            actividad.hijos = tareasDeActividad.map((tarea: any) => ({
              id: tarea.id,
              nombre: tarea.nombre,
              tipo: 'tarea' as const,
              fechaInicio: new Date(tarea.fechaInicio),
              fechaFin: new Date(tarea.fechaFin),
              porcentajeAvance: tarea.porcentajeCompletado || 0,
              estado: tarea.estado,
              nivel: 4, // Tarea es nivel 4
              padreId: actividad.id,
              color: '#6b7280',
              expandable: false,
              hijos: []
            }));
          });
        });
      });

      // Agregar EDTs que no están asignados a fases (pero que pertenecen al cronograma)
      const edtsSinFase = edtsData.data?.filter((edt: any) => !edt.proyectoFaseId) || [];
      if (edtsSinFase.length > 0) {
        // Crear una fase "virtual" para EDTs sin asignar, o agregarlos directamente al proyecto
        // Por simplicidad, los agregamos directamente al proyecto
        const edtsVirtuales = edtsSinFase.map((edt: any) => ({
          id: edt.id,
          nombre: edt.nombre,
          tipo: 'edt' as const,
          fechaInicio: edt.fechaInicioPlan ? new Date(edt.fechaInicioPlan) : proyectoItem.fechaInicio,
          fechaFin: edt.fechaFinPlan ? new Date(edt.fechaFinPlan) : proyectoItem.fechaFin,
          porcentajeAvance: edt.porcentajeAvance || 0,
          estado: edt.estado,
          nivel: 2,
          padreId: proyectoItem.id,
          color: '#f59e0b',
          expandable: true,
          expanded: false,
          hijos: []
        }));

        // Agregar EDTs sin fase (5 niveles: EDT > Actividad > Tarea)
        edtsVirtuales.forEach((edt: GanttItem) => {
          // EDTs conectan directamente con actividades (sin zonas)
          const actividadesDeEdt = actividadesData.data?.filter((act: any) => act.proyectoEdtId === edt.id) || [];
          edt.hijos = actividadesDeEdt.map((actividad: any) => ({
            id: actividad.id,
            nombre: actividad.nombre,
            tipo: 'actividad' as const,
            fechaInicio: actividad.fechaInicioPlan ? new Date(actividad.fechaInicioPlan) : edt.fechaInicio,
            fechaFin: actividad.fechaFinPlan ? new Date(actividad.fechaFinPlan) : edt.fechaFin,
            porcentajeAvance: actividad.porcentajeAvance || 0,
            estado: actividad.estado,
            nivel: 3, // EDT es nivel 2, actividad es nivel 3
            padreId: edt.id,
            color: '#ef4444',
            expandable: true,
            expanded: false,
            hijos: []
          }));

          // Agregar tareas a actividades
          edt.hijos?.forEach((actividad: GanttItem) => {
            const tareasDeActividad = tareasData.data?.filter((tarea: any) => tarea.proyectoActividadId === actividad.id) || [];
            actividad.hijos = tareasDeActividad.map((tarea: any) => ({
              id: tarea.id,
              nombre: tarea.nombre,
              tipo: 'tarea' as const,
              fechaInicio: new Date(tarea.fechaInicio),
              fechaFin: new Date(tarea.fechaFin),
              porcentajeAvance: tarea.porcentajeCompletado || 0,
              estado: tarea.estado,
              nivel: 4, // Tarea es nivel 4
              padreId: actividad.id,
              color: '#6b7280',
              expandable: false,
              hijos: []
            }));
          });
        });

        // Agregar los EDTs virtuales al proyecto
        proyectoItem.hijos = [...(proyectoItem.hijos || []), ...edtsVirtuales];
      }

      ganttItems.push(proyectoItem);
      setItems(ganttItems);
      setDataLoaded(true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setDataLoaded(true); // Prevent retrying on error
      toast({
        title: 'Error',
        description: `No se pudieron cargar los datos del Gantt: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [proyectoId, modoVista]);

  // Reset data when cronogramaId changes
  useEffect(() => {
    setDataLoaded(false);
  }, [cronogramaId]);

  useEffect(() => {
    if (!dataLoaded) {
      loadGanttData();
    }
  }, [loadGanttData, dataLoaded]);

  // Calcular dimensiones del Gantt
  const ganttConfig = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;

    const totalDias = differenceInDays(fechaFin, fechaInicio);
    const diasVisibles = Math.max(30, Math.min(totalDias * zoom, 365)); // 1-12 meses
    const pixelsPorDia = 800 / diasVisibles; // Ancho total del área de barras

    return {
      fechaInicio,
      fechaFin,
      totalDias,
      diasVisibles,
      pixelsPorDia,
      alturaFila: 40,
      margenIzquierdo: 300, // Espacio para nombres
    };
  }, [fechaInicio, fechaFin, zoom]);

  // Función para renderizar una fila del Gantt
  const renderGanttRow = (item: GanttItem, depth = 0) => {
    if (!ganttConfig) return null;

    const indent = depth * 20;
    const esVisible = depth === 0 || (item.padreId && getItemExpanded(item.padreId));

    if (!esVisible) return null;

    // Calcular posición de la barra
    const diasDesdeInicio = differenceInDays(item.fechaInicio, ganttConfig.fechaInicio);
    const duracionDias = differenceInDays(item.fechaFin, item.fechaInicio);
    const left = Math.max(0, diasDesdeInicio * ganttConfig.pixelsPorDia);
    const width = Math.max(2, duracionDias * ganttConfig.pixelsPorDia);

    // Obtener color según tipo
    const getTipoColor = (tipo: string) => {
      switch (tipo) {
        case 'proyecto': return 'bg-blue-500';
        case 'fase': return 'bg-green-500';
        case 'edt': return 'bg-yellow-500';
        case 'zona': return 'bg-purple-500';
        case 'actividad': return 'bg-red-500';
        case 'tarea': return 'bg-gray-500';
        default: return 'bg-gray-400';
      }
    };

    return (
      <div key={item.id}>
        {/* Fila del Gantt */}
        <div
          className="flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
          style={{ height: ganttConfig.alturaFila }}
          onClick={() => onItemClick?.(item)}
        >
          {/* Columna de nombres */}
          <div
            className="flex items-center px-3 border-r border-gray-200 bg-white"
            style={{ width: ganttConfig.margenIzquierdo, paddingLeft: indent + 8 }}
          >
            {item.expandable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(item.id);
                }}
              >
                {item.expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            <div className="flex items-center gap-2 flex-1">
              <Square className={`h-3 w-3 ${getTipoColor(item.tipo).replace('bg-', 'text-')}`} />
              <span className="font-medium text-sm truncate">{item.nombre}</span>
              <Badge variant="outline" className="text-xs">
                {item.tipo}
              </Badge>
            </div>
          </div>

          {/* Área del diagrama */}
          <div className="flex-1 relative bg-gray-50">
            {/* Líneas de tiempo (opcional) */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Aquí se podrían agregar líneas verticales para meses/semanas */}
            </div>

            {/* Barra de progreso */}
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 h-6 rounded ${getTipoColor(item.tipo)} cursor-pointer hover:opacity-80 transition-opacity`}
              style={{
                left: ganttConfig.margenIzquierdo + left,
                width: width,
              }}
              title={`${item.nombre} (${item.porcentajeAvance}% completo)`}
            >
              {/* Progreso interno */}
              <div
                className="h-full bg-black bg-opacity-30 rounded"
                style={{ width: `${item.porcentajeAvance}%` }}
              />
            </div>
          </div>
        </div>

        {/* Renderizar hijos si está expandido */}
        {item.expanded && item.hijos?.map(hijo => renderGanttRow(hijo, depth + 1))}
      </div>
    );
  };

  // Función para verificar si un item está expandido
  const getItemExpanded = (itemId: string): boolean => {
    const findItem = (items: GanttItem[]): boolean => {
      for (const item of items) {
        if (item.id === itemId) return item.expanded || false;
        if (item.hijos && findItem(item.hijos)) return true;
      }
      return false;
    };
    return findItem(items);
  };

  // Función para toggle expanded
  const toggleExpanded = (itemId: string) => {
    const updateItems = (items: GanttItem[]): GanttItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, expanded: !item.expanded };
        }
        if (item.hijos) {
          return { ...item, hijos: updateItems(item.hijos) };
        }
        return item;
      });
    };
    setItems(updateItems);
  };

  // Filtrar items según tipo
  const itemsFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return items;
    return items.filter(item => item.tipo === filtroTipo);
  }, [items, filtroTipo]);

  // Función para exportar a CSV
  const exportToCSV = () => {
    if (!items.length) return;

    // Crear datos planos para CSV
    const csvData: any[] = [];

    const flattenItems = (items: GanttItem[], level = 0): void => {
      items.forEach(item => {
        csvData.push({
          'Nivel': level,
          'Tipo': item.tipo,
          'Nombre': item.nombre,
          'Fecha Inicio': format(item.fechaInicio, 'dd/MM/yyyy', { locale: es }),
          'Fecha Fin': format(item.fechaFin, 'dd/MM/yyyy', { locale: es }),
          'Progreso (%)': item.porcentajeAvance,
          'Estado': item.estado,
          'Padre': item.padreId || ''
        });

        if (item.hijos && item.hijos.length > 0) {
          flattenItems(item.hijos, level + 1);
        }
      });
    };

    flattenItems(items);

    // Convertir a CSV
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escapar comas y comillas en el valor
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gantt-${proyectoId}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exportación completada',
      description: `Se exportaron ${csvData.length} elementos del Gantt a CSV`,
    });
  };

  // Función para exportar a MS Project XML
  const exportToMSProject = () => {
    if (!items.length) return;

    // Generar XML compatible con MS Project
    const generateMSProjectXML = () => {
      let taskId = 1;
      const taskMap = new Map<string, number>();

      // Función recursiva para procesar jerarquía
      const processTasks = (items: GanttItem[], parentId: number | null = null): string => {
        let xml = '';

        items.forEach(item => {
          const currentTaskId = taskId++;
          taskMap.set(item.id, currentTaskId);

          // Convertir fechas a formato MS Project (YYYY-MM-DDTHH:mm:ss)
          const startDate = format(item.fechaInicio, "yyyy-MM-dd'T'HH:mm:ss");
          const endDate = format(item.fechaFin, "yyyy-MM-dd'T'HH:mm:ss");

          // Calcular duración en minutos (MS Project usa minutos como unidad base)
          const durationMinutes = differenceInDays(item.fechaFin, item.fechaInicio) * 8 * 60; // Asumiendo jornada de 8 horas

          xml += `
    <Task>
      <UID>${currentTaskId}</UID>
      <ID>${currentTaskId}</ID>
      <Name>${item.nombre.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')}</Name>
      <Type>1</Type>
      <IsNull>0</IsNull>
      <CreateDate>${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</CreateDate>
      <WBS>${item.nivel}.${currentTaskId}</WBS>
      <OutlineNumber>${item.nivel}.${currentTaskId}</OutlineNumber>
      <OutlineLevel>${item.nivel + 1}</OutlineLevel>
      ${parentId ? `<ParentTaskUID>${parentId}</ParentTaskUID>` : ''}
      <Start>${startDate}</Start>
      <Finish>${endDate}</Finish>
      <Duration>${durationMinutes}m</Duration>
      <DurationFormat>7</DurationFormat>
      <Work>${durationMinutes}m</Work>
      <ResumeValid>0</ResumeValid>
      <EffortDriven>0</EffortDriven>
      <Recurring>0</Recurring>
      <OverAllocated>0</OverAllocated>
      <Estimated>1</Estimated>
      <Milestone>0</Milestone>
      <FixedCostAccrual>3</FixedCostAccrual>
      <PercentComplete>${item.porcentajeAvance}</PercentComplete>
      <PercentWorkComplete>${item.porcentajeAvance}</PercentWorkComplete>
      <FixedDuration>1</FixedDuration>
      <Resume>0</Resume>
      <ConstraintType>0</ConstraintType>
      <ConstraintDate>0001-01-01T00:00:00</ConstraintDate>
      <Manual>0</Manual>
      <DisplayAsSummary>0</DisplayAsSummary>
      <Summary>${item.hijos && item.hijos.length > 0 ? '1' : '0'}</Summary>
      <Critical>0</Critical>
      <IsSubproject>0</IsSubproject>
      <IsExternalTask>0</IsExternalTask>
      <ExternalTaskProject>00000000-0000-0000-0000-000000000000</ExternalTaskProject>
      <EarlyStart>${startDate}</EarlyStart>
      <EarlyFinish>${endDate}</EarlyFinish>
      <LateStart>${startDate}</LateStart>
      <LateFinish>${endDate}</LateFinish>
      <StartVariance>0</StartVariance>
      <FinishVariance>0</FinishVariance>
      <WorkVariance>0</WorkVariance>
      <FreeSlack>0</FreeSlack>
      <TotalSlack>0</TotalSlack>
      <StartSlack>0</StartSlack>
      <FinishSlack>0</FinishSlack>
      <CanLevel>1</CanLevel>
      <IgnoreResourceCalendar>0</IgnoreResourceCalendar>
      <CalendarUID>-1</CalendarUID>
      <PredecessorLink/>
      <ExtendedAttribute>
        <FieldID>188744000</FieldID>
        <Value>${item.estado}</Value>
      </ExtendedAttribute>
    </Task>`;

          // Procesar tareas hijas
          if (item.hijos && item.hijos.length > 0) {
            xml += processTasks(item.hijos, currentTaskId);
          }
        });

        return xml;
      };

      const tasksXML = processTasks(items);

      // XML completo compatible con MS Project
      const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <SaveVersion>14</SaveVersion>
  <Build>14.0.4730.1000</Build>
  <Title>${items[0]?.nombre || 'Proyecto GYS'}</Title>
  <Subject>Gantt Export from GYS Control</Subject>
  <Author>GYS Control System</Author>
  <CreationDate>${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</CreationDate>
  <LastSaved>${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</LastSaved>
  <ScheduleFromStart>1</ScheduleFromStart>
  <StartDate>${format(items[0]?.fechaInicio || new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</StartDate>
  <FinishDate>${format(items[0]?.fechaFin || new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</FinishDate>
  <FYStartDate>1</FYStartDate>
  <CriticalSlackLimit>0</CriticalSlackLimit>
  <CurrencyDigits>2</CurrencyDigits>
  <CurrencySymbol>$</CurrencySymbol>
  <CurrencySymbolPosition>1</CurrencySymbolPosition>
  <CalendarUID>1</CalendarUID>
  <DefaultStartTime>08:00:00</DefaultStartTime>
  <DefaultFinishTime>17:00:00</DefaultFinishTime>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <DefaultTaskType>0</DefaultTaskType>
  <DefaultFixedCostAccrual>3</DefaultFixedCostAccrual>
  <DefaultStandardRate>0</DefaultStandardRate>
  <DefaultOvertimeRate>0</DefaultOvertimeRate>
  <DurationFormat>7</DurationFormat>
  <WorkFormat>3</WorkFormat>
  <EditableActualCosts>0</EditableActualCosts>
  <HonorConstraints>0</HonorConstraints>
  <InsertedProjectsLikeSummary>0</InsertedProjectsLikeSummary>
  <MultipleCriticalPaths>0</MultipleCriticalPaths>
  <NewTasksEffortDriven>0</NewTasksEffortDriven>
  <NewTasksEstimated>1</NewTasksEstimated>
  <SplitsInProgressTasks>0</SplitsInProgressTasks>
  <SpreadActualCost>0</SpreadActualCost>
  <SpreadPercentComplete>0</SpreadPercentComplete>
  <TaskUpdatesResource>1</TaskUpdatesResource>
  <FiscalYearStart>0</FiscalYearStart>
  <WeekStartDay>1</WeekStartDay>
  <MoveCompletedEndsBack>0</MoveCompletedEndsBack>
  <MoveRemainingStartsBack>0</MoveRemainingStartsBack>
  <MoveRemainingStartsForward>0</MoveRemainingStartsForward>
  <MoveCompletedEndsForward>0</MoveCompletedEndsForward>
  <BaselineForEarnedValue>0</BaselineForEarnedValue>
  <AutoAddNewResourcesAndTasks>1</AutoAddNewResourcesAndTasks>
  <CurrentDate>${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</CurrentDate>
  <MicrosoftProjectServerURL>0</MicrosoftProjectServerURL>
  <Autolink>0</Autolink>
  <NewTaskStartDate>0</NewTaskStartDate>
  <DefaultTaskEVMethod>0</DefaultTaskEVMethod>
  <ProjectExternallyEdited>0</ProjectExternallyEdited>
  <ActualsInSync>1</ActualsInSync>
  <RemoveFileProperties>0</RemoveFileProperties>
  <AdminProject>0</AdminProject>
  <UpdateManuallyScheduledTasksWhenEditingLinks>1</UpdateManuallyScheduledTasksWhenEditingLinks>
  <KeepTaskOnNearestWorkingTimeWhenLinkIsEdited>0</KeepTaskOnNearestWorkingTimeWhenLinkIsEdited>
  <DefaultCalendarName>Standard</DefaultCalendarName>
  <Calendars>
    <Calendar>
      <UID>1</UID>
      <Name>Standard</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <BaseCalendarUID>0</BaseCalendarUID>
      <WeekDays>
        <WeekDay>
          <DayType>1</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>2</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>3</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>4</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>5</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>6</DayType>
          <DayWorking>0</DayWorking>
        </WeekDay>
        <WeekDay>
          <DayType>7</DayType>
          <DayWorking>0</DayWorking>
        </WeekDay>
      </WeekDays>
    </Calendar>
  </Calendars>
  <Tasks>${tasksXML}
  </Tasks>
  <Resources/>
  <Assignments/>
  <TaskLinks/>
</Project>`;

      return xmlContent;
    };

    // Generar y descargar XML
    const xmlContent = generateMSProjectXML();
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gantt-${proyectoId}-${format(new Date(), 'yyyy-MM-dd')}.xml`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exportación MS Project completada',
      description: 'Archivo XML compatible con Microsoft Project generado',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Cargando diagrama de Gantt...</span>
        </CardContent>
      </Card>
    );
  }

  if (!ganttConfig) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <Calendar className="h-12 w-12 mx-auto mb-4" />
            <p className="font-medium">Error al cargar el diagrama</p>
            <p className="text-sm text-muted-foreground">No se pudieron calcular las dimensiones del Gantt</p>
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
            <Calendar className="h-5 w-5" />
            Diagrama de Gantt - 5 Niveles
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Filtro por tipo */}
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los niveles</SelectItem>
                <SelectItem value="fase">Solo fases</SelectItem>
                <SelectItem value="edt">Solo EDTs</SelectItem>
                <SelectItem value="zona">Solo zonas</SelectItem>
                <SelectItem value="actividad">Solo actividades</SelectItem>
                <SelectItem value="tarea">Solo tareas</SelectItem>
              </SelectContent>
            </Select>

            {/* Controles de zoom */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            {/* Exportar CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={!items.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>

            {/* Exportar MS Project */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportToMSProject}
              disabled={!items.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar MS Project
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Encabezado del Gantt */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <div
              className="px-3 py-2 font-medium text-sm border-r border-gray-200 bg-white"
              style={{ width: ganttConfig.margenIzquierdo }}
            >
              Elemento
            </div>
            <div className="flex-1 px-3 py-2 text-sm text-muted-foreground">
              Cronograma ({format(ganttConfig.fechaInicio, 'dd/MM/yyyy', { locale: es })} - {format(ganttConfig.fechaFin, 'dd/MM/yyyy', { locale: es })})
            </div>
          </div>
        </div>

        {/* Área del diagrama */}
        <div className="overflow-auto max-h-96">
          {itemsFiltrados.map(item => renderGanttRow(item))}
        </div>

        {/* Leyenda */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Square className="h-3 w-3 text-blue-500" />
              <span>Proyecto</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="h-3 w-3 text-green-500" />
              <span>Fase</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="h-3 w-3 text-yellow-500" />
              <span>EDT</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="h-3 w-3 text-red-500" />
              <span>Actividad</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="h-3 w-3 text-gray-500" />
              <span>Tarea</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}