/**
 * 📅 CalendarView Component
 * 
 * Vista de calendario para el timeline de aprovisionamiento.
 * Muestra los datos en formato de calendario mensual con eventos.
 * 
 * Features:
 * - Calendario mensual interactivo
 * - Eventos por día con colores por estado
 * - Navegación entre meses
 * - Vista detalle de eventos
 * - Filtros por tipo y estado
 * - Responsive design
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Package,
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
} from 'lucide-react';
import { format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

// Types
import type { GanttItem, TimelineData } from '@/types/aprovisionamiento';

// ✅ Props interface
interface CalendarViewProps {
  data: TimelineData;
  loading?: boolean;
  onItemClick?: (item: GanttItem) => void;
  className?: string;
}

// ✅ Calendar event interface
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'start' | 'end' | 'milestone';
  item: GanttItem;
  color: string;
}

// ✅ Get status color
const getStatusColor = (estado: string): string => {
  switch (estado.toLowerCase()) {
    case 'completado':
    case 'entregado':
    case 'aprobado':
      return 'bg-green-500';
    case 'en_proceso':
    case 'en_revision':
      return 'bg-blue-500';
    case 'pendiente':
      return 'bg-yellow-500';
    case 'retrasado':
    case 'vencido':
    case 'rechazado':
      return 'bg-red-500';
    case 'borrador':
    case 'creado':
      return 'bg-gray-500';
    default:
      return 'bg-blue-500';
  }
};

// ✅ Get type icon
const getTypeIcon = (tipo: string) => {
  switch (tipo) {
    case 'lista':
      return <Package className="w-3 h-3" />;
    case 'pedido':
      return <ShoppingCart className="w-3 h-3" />;
    default:
      return <Package className="w-3 h-3" />;
  }
};

// ✅ Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ✅ Main component
export const CalendarView: React.FC<CalendarViewProps> = ({
  data,
  loading = false,
  onItemClick,
  className = '',
}) => {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // ✅ Generate calendar events from timeline data
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    
    data.items.forEach((item) => {
      // Filter by status and type
      if (statusFilter !== 'all' && item.estado !== statusFilter) return;
      if (typeFilter !== 'all' && item.tipo !== typeFilter) return;
      
      const color = getStatusColor(item.estado);
      
      // Start event
      events.push({
        id: `${item.id}-start`,
        title: `Inicio: ${item.titulo}`,
        date: item.fechaInicio,
        type: 'start',
        item,
        color,
      });
      
      // End event (if different from start)
      if (!isSameDay(item.fechaInicio, item.fechaFin)) {
        events.push({
          id: `${item.id}-end`,
          title: `Fin: ${item.titulo}`,
          date: item.fechaFin,
          type: 'end',
          item,
          color,
        });
      }
    });
    
    return events;
  }, [data.items, statusFilter, typeFilter]);

  // ✅ Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // ✅ Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter(event => isSameDay(event.date, day));
  };

  // ✅ Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // ✅ Get unique statuses and types for filters
  const uniqueStatuses = Array.from(new Set(data.items.map(item => item.estado)));
  const uniqueTypes = Array.from(new Set(data.items.map(item => item.tipo)));

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Vista de Calendario
        </CardTitle>
        <CardDescription>
          {calendarEvents.length} eventos en {format(currentDate, 'MMMM yyyy', { locale: es })}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold ml-4">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h3>
          </div>
          
          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(type)}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Week headers */}
          <div className="grid grid-cols-7 bg-muted">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[100px] p-2 border-r border-b relative
                    ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''}
                    ${isTodayDate ? 'bg-primary/5 border-primary/20' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className={`
                    text-sm font-medium mb-1
                    ${isTodayDate ? 'text-primary font-bold' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <Popover key={event.id}>
                        <PopoverTrigger asChild>
                          <button
                            className={`
                              w-full text-left p-1 rounded text-xs
                              ${event.color} text-white
                              hover:opacity-80 transition-opacity
                              truncate
                            `}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="flex items-center gap-1">
                              {getTypeIcon(event.item.tipo)}
                              <span className="truncate">
                                {event.type === 'start' ? '▶' : '⏹'} {event.item.label}
                              </span>
                            </div>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h4 className="font-semibold">{event.item.titulo}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {event.item.label}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {event.type === 'start' ? 'Inicio' : 'Fin'}
                              </Badge>
                            </div>
                            
                            {event.item.descripcion && (
                              <p className="text-sm">{event.item.descripcion}</p>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Estado:</span>
                                <Badge 
                                  variant="outline" 
                                  className="ml-2"
                                >
                                  {event.item.estado}
                                </Badge>
                              </div>
                              <div>
                                <span className="font-medium">Monto:</span>
                                <span className="ml-2">
                                  {formatCurrency(event.item.amount)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Inicio:</span>
                                <div className="text-muted-foreground">
                                  {format(event.item.fechaInicio, 'dd/MM/yyyy', { locale: es })}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Fin:</span>
                                <div className="text-muted-foreground">
                                  {format(event.item.fechaFin, 'dd/MM/yyyy', { locale: es })}
                                </div>
                              </div>
                            </div>
                            
                            {event.item.progreso !== undefined && (
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium">Progreso:</span>
                                  <span>{event.item.progreso}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${event.item.progreso}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {onItemClick && (
                              <Button
                                size="sm"
                                onClick={() => onItemClick(event.item)}
                                className="w-full"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalles
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                    
                    {/* More events indicator */}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        +{dayEvents.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>En Proceso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Retrasado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>Borrador</span>
          </div>
        </div>

        {/* Empty state */}
        {calendarEvents.length === 0 && (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay eventos</h3>
            <p className="text-muted-foreground">
              {statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No se encontraron eventos con los filtros seleccionados'
                : 'No hay eventos programados para este período'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarView;
