/**
 * 📅 Componente Timeline de Trazabilidad - Sistema GYS
 * 
 * Timeline vertical que muestra el progreso de entregas de pedidos
 * con estados, fechas, responsables, animaciones y lazy loading.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 2.0.0
 * @since 2025-01-27
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  Package,
  Truck,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { EstadoEntregaItem } from '@/types/modelos';
import { formatearFecha } from '@/lib/utils/graficos';
import { cn } from '@/lib/utils';

// 📋 Interfaces
export interface EventoTrazabilidad {
  id: string;
  fecha: Date;
  tipo: 'creacion' | 'preparacion' | 'envio' | 'transito' | 'entrega' | 'incidencia' | 'devolucion' | 'cancelacion';
  estado: EstadoEntregaItem;
  titulo: string;
  descripcion?: string;
  responsable?: string;
  ubicacion?: string;
  observaciones?: string;
  metadata?: Record<string, any>;
  esHito?: boolean;
  duracion?: number; // en minutos
  adjuntos?: Array<{
    id: string;
    nombre: string;
    url: string;
    tipo: string;
  }>;
}

export interface TrazabilidadTimelineProps {
  eventos: EventoTrazabilidad[];
  pedidoId?: string;
  className?: string;
  mostrarDetalles?: boolean;
  compacto?: boolean;
  animaciones?: boolean;
  lazyLoading?: boolean;
  itemsPorPagina?: number;
  filtroTipo?: EventoTrazabilidad['tipo'][];
  onEventoClick?: (evento: EventoTrazabilidad) => void;
  onCargarMas?: () => void;
  cargando?: boolean;
}

// 🎨 Configuración de colores por estado
const COLORES_ESTADO: Record<EstadoEntregaItem, {
  bg: string;
  border: string;
  icon: string;
  badge: string;
}> = {
  [EstadoEntregaItem.ENTREGADO]: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    badge: 'bg-green-100 text-green-800'
  },
  [EstadoEntregaItem.PENDIENTE]: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  [EstadoEntregaItem.EN_PROCESO]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-800'
  },
  [EstadoEntregaItem.PARCIAL]: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-800'
  },
  [EstadoEntregaItem.RETRASADO]: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-800'
  },
  [EstadoEntregaItem.CANCELADO]: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-800'
  }
};

/**
 * 🎨 Obtener ícono según tipo de evento
 */
function getEventIcon(tipo: EventoTrazabilidad['tipo'], esHito: boolean = false) {
  const iconClass = cn('w-4 h-4', esHito && 'w-5 h-5');
  
  switch (tipo) {
    case 'creacion':
      return <Package className={iconClass} />;
    case 'preparacion':
      return <Clock className={iconClass} />;
    case 'envio':
      return <Truck className={iconClass} />;
    case 'transito':
      return <MapPin className={iconClass} />;
    case 'entrega':
      return <CheckCircle className={iconClass} />;
    case 'incidencia':
      return <AlertTriangle className={iconClass} />;
    case 'devolucion':
      return <XCircle className={iconClass} />;
    case 'cancelacion':
      return <XCircle className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
}

/**
 * 🎨 Obtener color del badge según estado
 */
function getBadgeVariant(estado: EstadoEntregaItem) {
  switch (estado) {
    case EstadoEntregaItem.ENTREGADO:
      return 'default';
    case EstadoEntregaItem.PENDIENTE:
      return 'secondary';
    case EstadoEntregaItem.EN_PROCESO:
      return 'default';
    case EstadoEntregaItem.PARCIAL:
      return 'secondary';
    case EstadoEntregaItem.RETRASADO:
      return 'destructive';
    case EstadoEntregaItem.CANCELADO:
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * 🔄 Componente de Skeleton para carga
 */
function TimelineSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="relative flex items-start space-x-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 📋 Componente de evento individual
 */
function EventoItem({ 
  evento, 
  index, 
  mostrarDetalles, 
  compacto, 
  animaciones, 
  onEventoClick 
}: {
  evento: EventoTrazabilidad;
  index: number;
  mostrarDetalles: boolean;
  compacto: boolean;
  animaciones: boolean;
  onEventoClick?: (evento: EventoTrazabilidad) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  // ✅ Validación para evitar errores si el estado no existe en COLORES_ESTADO
  const colores = COLORES_ESTADO[evento.estado] || COLORES_ESTADO[EstadoEntregaItem.PENDIENTE];
  
  const contenidoEvento = (
    <div className="relative flex items-start space-x-4">
      {/* 🎯 Punto del timeline */}
      <div className={cn(
        'relative z-10 flex items-center justify-center rounded-full border-2 transition-all duration-300',
        evento.esHito ? 'w-14 h-14' : 'w-12 h-12',
        colores.bg,
        colores.border,
        'hover:scale-110'
      )}>
        <div className={colores.icon}>
          {getEventIcon(evento.tipo, evento.esHito)}
        </div>
        {evento.esHito && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>
      
      {/* 📄 Contenido del evento */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          'p-4 rounded-lg border transition-all duration-200',
          colores.bg,
          colores.border,
          'hover:shadow-md cursor-pointer',
          compacto && 'p-3'
        )}
        onClick={() => {
          onEventoClick?.(evento);
          if (evento.descripcion || evento.observaciones) {
            setExpandido(!expandido);
          }
        }}>
          {/* 🏷️ Header del evento */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={cn(
                  'font-semibold text-gray-900',
                  compacto ? 'text-sm' : 'text-base'
                )}>
                  {evento.titulo}
                </h4>
                {evento.esHito && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    Hito
                  </Badge>
                )}
              </div>
              
              <div className={cn(
                'flex items-center space-x-2 text-gray-600',
                compacto ? 'text-xs' : 'text-sm'
              )}>
                <Calendar className="w-3 h-3" />
                <span>{formatearFecha(evento.fecha, 'completo')}</span>
                
                {evento.responsable && (
                  <>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{evento.responsable}</span>
                    </div>
                  </>
                )}
                
                {evento.duracion && (
                  <>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{evento.duracion}min</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={getBadgeVariant(evento.estado)} className={cn(
                compacto && 'text-xs px-2 py-0'
              )}>
                {evento.estado}
              </Badge>
              
              {(evento.descripcion || evento.observaciones) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandido(!expandido);
                  }}
                >
                  {expandido ? 
                    <ChevronUp className="w-3 h-3" /> : 
                    <ChevronDown className="w-3 h-3" />
                  }
                </Button>
              )}
            </div>
          </div>
          
          {/* 📝 Descripción rápida */}
          {!compacto && evento.descripcion && !expandido && (
            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
              {evento.descripcion}
            </p>
          )}
          
          {/* 📍 Ubicación */}
          {!compacto && evento.ubicacion && (
            <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
              <MapPin className="w-3 h-3" />
              <span>{evento.ubicacion}</span>
            </div>
          )}
          
          {/* 📂 Detalles expandibles */}
          <AnimatePresence>
            {expandido && mostrarDetalles && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  {/* 📝 Descripción completa */}
                  {evento.descripcion && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 mb-1">DESCRIPCIÓN</h5>
                      <p className="text-sm text-gray-700">{evento.descripcion}</p>
                    </div>
                  )}
                  
                  {/* 💬 Observaciones */}
                  {evento.observaciones && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 mb-1">OBSERVACIONES</h5>
                      <div className="p-2 bg-white/50 rounded text-sm text-gray-600">
                        {evento.observaciones}
                      </div>
                    </div>
                  )}
                  
                  {/* 📎 Adjuntos */}
                  {evento.adjuntos && evento.adjuntos.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 mb-1">ADJUNTOS</h5>
                      <div className="flex flex-wrap gap-2">
                        {evento.adjuntos.map(adjunto => (
                          <Badge key={adjunto.id} variant="outline" className="text-xs">
                            {adjunto.nombre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 🔍 Metadata */}
                  {evento.metadata && Object.keys(evento.metadata).length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 mb-1">DETALLES TÉCNICOS</h5>
                      <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                        {JSON.stringify(evento.metadata, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
  
  if (!animaciones) {
    return contenidoEvento;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.1,
        ease: 'easeOut'
      }}
      whileHover={{ scale: 1.01 }}
      className="transform-gpu"
    >
      {contenidoEvento}
    </motion.div>
  );
}

/**
 * 📅 Componente principal TrazabilidadTimeline
 */
export default function TrazabilidadTimeline({
  eventos,
  pedidoId,
  className,
  mostrarDetalles = true,
  compacto = false,
  animaciones = true,
  lazyLoading = false,
  itemsPorPagina = 10,
  filtroTipo,
  onEventoClick,
  onCargarMas,
  cargando = false
}: TrazabilidadTimelineProps) {
  const [paginaActual, setPaginaActual] = useState(1);
  const [eventosVisibles, setEventosVisibles] = useState<EventoTrazabilidad[]>([]);
  
  // 🔍 Filtrar eventos por tipo si se especifica
  const eventosFiltrados = useMemo(() => {
    let resultado = eventos;
    
    if (filtroTipo && filtroTipo.length > 0) {
      resultado = resultado.filter(evento => filtroTipo.includes(evento.tipo));
    }
    
    // 📊 Ordenar eventos por fecha descendente
    return resultado.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [eventos, filtroTipo]);
  
  // 📄 Manejar paginación lazy loading
  const cargarMasEventos = useCallback(() => {
    if (lazyLoading) {
      const inicio = (paginaActual - 1) * itemsPorPagina;
      const fin = inicio + itemsPorPagina;
      const nuevosEventos = eventosFiltrados.slice(inicio, fin);
      
      setEventosVisibles(prev => [...prev, ...nuevosEventos]);
      setPaginaActual(prev => prev + 1);
      
      onCargarMas?.();
    }
  }, [eventosFiltrados, paginaActual, itemsPorPagina, lazyLoading, onCargarMas]);
  
  // 🔄 Inicializar eventos visibles
  React.useEffect(() => {
    if (lazyLoading) {
      const inicial = eventosFiltrados.slice(0, itemsPorPagina);
      setEventosVisibles(inicial);
      setPaginaActual(2);
    } else {
      setEventosVisibles(eventosFiltrados);
    }
  }, [eventosFiltrados, lazyLoading, itemsPorPagina]);
  
  const hayMasEventos = lazyLoading && eventosVisibles.length < eventosFiltrados.length;
  
  return (
    <Card className={className}>
      {!compacto && (
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Timeline de Trazabilidad</span>
            {pedidoId && (
              <Badge variant="outline" className="ml-auto">
                {pedidoId}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={cn('p-6', compacto && 'p-4')}>
        <div className="relative">
          {/* 📏 Línea vertical del timeline */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-gray-200 to-transparent" />
          
          {/* 🔄 Estado de carga */}
          {cargando && <TimelineSkeleton />}
          
          {/* 📋 Lista de eventos */}
          {!cargando && (
            <AnimatePresence mode="popLayout">
              <div className="space-y-6">
                {eventosVisibles.map((evento, index) => (
                  <EventoItem
                    key={evento.id}
                    evento={evento}
                    index={index}
                    mostrarDetalles={mostrarDetalles}
                    compacto={compacto}
                    animaciones={animaciones}
                    onEventoClick={onEventoClick}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
          
          {/* 🔄 Botón cargar más */}
          {hayMasEventos && (
            <motion.div 
              className="flex justify-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="outline"
                onClick={cargarMasEventos}
                disabled={cargando}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Cargar más eventos</span>
              </Button>
            </motion.div>
          )}
          
          {/* 📭 Estado vacío */}
          {!cargando && eventosVisibles.length === 0 && (
            <motion.div 
              className="text-center py-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin eventos de trazabilidad
              </h3>
              <p className="text-gray-600">
                {filtroTipo && filtroTipo.length > 0 
                  ? 'No hay eventos que coincidan con los filtros aplicados.'
                  : 'No hay eventos registrados para este pedido.'
                }
              </p>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
