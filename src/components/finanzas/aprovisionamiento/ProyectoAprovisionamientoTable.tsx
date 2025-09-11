/**
 * 📊 ProyectoAprovisionamientoTable Component
 * 
 * Tabla consolidada de todos los proyectos con resumen financiero para aprovisionamiento.
 * Incluye indicadores de coherencia, KPIs y drill-down a listas y pedidos.
 * 
 * Features:
 * - Vista consolidada de proyectos con datos financieros
 * - Indicadores de coherencia listas vs pedidos
 * - Filtros avanzados y ordenamiento
 * - Drill-down navigation
 * - Responsive design
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils';
import type { ProyectoAprovisionamiento, CoherenciaIndicator } from '@/types/aprovisionamiento';

// ✅ Props interface
interface ProyectoAprovisionamientoTableProps {
  proyectos: ProyectoAprovisionamiento[];
  loading?: boolean;
  onProyectoClick?: (proyectoId: string) => void;
  onVerListas?: (proyectoId: string) => void;
  onVerPedidos?: (proyectoId: string) => void;
  onExportar?: (proyectoId: string) => void;
  className?: string;
}

// ✅ Coherencia indicator component - Fixed to avoid TooltipProvider nesting
const CoherenciaIndicatorBadge: React.FC<{ coherencia: CoherenciaIndicator }> = ({ coherencia }) => {
  const getVariant = () => {
    switch (coherencia.estado) {
      case 'critica': return 'destructive';
      case 'advertencia': return 'secondary';
      case 'ok': return 'default';
      default: return 'outline';
    }
  };

  const getIcon = () => {
    switch (coherencia.estado) {
      case 'critica': return <AlertCircle className="w-3 h-3" />;
      case 'advertencia': return <Clock className="w-3 h-3" />;
      case 'ok': return <CheckCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={getVariant()} className="flex items-center gap-1">
          {getIcon()}
          {coherencia.porcentaje || 0}%
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">{coherencia.mensaje || 'Sin información'}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// ✅ Financial indicator component
const FinancialIndicator: React.FC<{
  label: string;
  value: number;
  budget: number;
  currency?: 'PEN' | 'USD';
}> = ({ label, value, budget, currency = 'USD' }) => {
  const percentage = budget > 0 ? (value / budget) * 100 : 0;
  const deviation = value - budget;
  const isPositive = deviation >= 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={`flex items-center gap-1 ${
          isPositive ? 'text-red-600' : 'text-green-600'
        }`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {formatPercentage(percentage)}
        </span>
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{formatCurrency(value, currency)}</span>
          <span className="text-muted-foreground">{formatCurrency(budget, currency)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ✅ Main component
export const ProyectoAprovisionamientoTable: React.FC<ProyectoAprovisionamientoTableProps> = ({
  proyectos,
  loading = false,
  onProyectoClick,
  onVerListas,
  onVerPedidos,
  onExportar,
  className = '',
}) => {
  const router = useRouter();
  const [sortField, setSortField] = useState<keyof ProyectoAprovisionamiento>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 🔁 Memoized sorted data
  const sortedProyectos = useMemo(() => {
    return [...proyectos].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [proyectos, sortField, sortDirection]);

  // 🔁 Handle sort
  const handleSort = (field: keyof ProyectoAprovisionamiento) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 🔁 Handle actions
  const handleVerListas = (proyectoId: string) => {
    if (onVerListas) {
      onVerListas(proyectoId);
    } else {
      router.push(`/finanzas/aprovisionamiento/listas?proyecto=${proyectoId}`);
    }
  };

  const handleVerPedidos = (proyectoId: string) => {
    if (onVerPedidos) {
      onVerPedidos(proyectoId);
    } else {
      router.push(`/finanzas/aprovisionamiento/pedidos?proyecto=${proyectoId}`);
    }
  };

  const handleVerDetalle = (proyectoId: string) => {
    if (onProyectoClick) {
      onProyectoClick(proyectoId);
    } else {
      router.push(`/proyectos/${proyectoId}`);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Proyectos de Aprovisionamiento
          </CardTitle>
          <CardDescription>
            Vista consolidada de proyectos con indicadores financieros y de coherencia
          </CardDescription>
        </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('nombre')}
                >
                  Proyecto
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('fechaInicio')}
                >
                  Fechas
                </TableHead>
                <TableHead>Responsables</TableHead>
                <TableHead>Financiero</TableHead>
                <TableHead>Listas</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Coherencia</TableHead>
                <TableHead className="w-[50px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProyectos.map((proyecto, index) => (
                <TableRow
                  key={proyecto.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleVerDetalle(proyecto.id)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{proyecto.nombre}</div>
                      <div className="text-xs text-muted-foreground">{proyecto.codigo}</div>
                      <Badge variant="outline" className="text-xs">
                        {proyecto.estado}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div>Inicio: {formatDate(proyecto.fechaInicio ?? new Date())}</div>
                      {proyecto.fechaFin && (
                          <div>Fin: {formatDate(proyecto.fechaFin)}</div>
                        )}
                      {proyecto.fechaFin && proyecto.fechaInicio && (
                        <div className="text-xs text-muted-foreground">
                          {Math.ceil((new Date(proyecto.fechaFin).getTime() - new Date(proyecto.fechaInicio).getTime()) / (1000 * 60 * 60 * 24))} días
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {proyecto.comercialNombre || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Gestor: {proyecto.gestorNombre || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <FinancialIndicator
                      label="Ejecutado vs Presupuesto"
                      value={proyecto.totalReal || 0}
                      budget={proyecto.totalInterno || 0}
                      currency="USD"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{proyecto.totalListas || 0}</Badge>
                        <span className="text-sm">listas</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(proyecto.montoTotalListas || 0, 'USD')}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerListas(proyecto.id);
                        }}
                      >
                        Ver listas
                      </Button>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{proyecto.totalPedidos || 0}</Badge>
                        <span className="text-sm">pedidos</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(proyecto.montoTotalPedidos || 0, 'USD')}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerPedidos(proyecto.id);
                        }}
                      >
                        Ver pedidos
                      </Button>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <CoherenciaIndicatorBadge coherencia={{
                      estado: proyecto.coherenciaEstado || 'ok',
                      mensaje: proyecto.coherenciaMensaje,
                      porcentaje: proyecto.porcentajeEjecucion
                    }} />
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleVerDetalle(proyecto.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVerListas(proyecto.id)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Ver listas
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVerPedidos(proyecto.id)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Ver pedidos
                        </DropdownMenuItem>
                        {onExportar && (
                          <DropdownMenuItem onClick={() => onExportar(proyecto.id)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Exportar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {sortedProyectos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No se encontraron proyectos</p>
            <p className="text-sm">Ajusta los filtros para ver más resultados</p>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};

export default ProyectoAprovisionamientoTable;
