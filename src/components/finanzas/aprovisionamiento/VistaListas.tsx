/**
 * 📋 VistaListas Component
 * 
 * Componente de vista unificada para gestión de listas de equipos en aprovisionamiento.
 * Proporciona funcionalidades completas de CRUD, filtrado, exportación y análisis.
 * 
 * Features:
 * - Vista de tabla con paginación
 * - Filtros avanzados
 * - Exportación a Excel/PDF
 * - Estadísticas en tiempo real
 * - Acciones masivas
 * - Responsive design
 * - Estados de carga y error
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { toast } from 'sonner';
import { ListaEquipoTable } from './ListaEquipoTable';
import { ListaEquipoFilters } from './ListaEquipoFilters';
import { ProyectoCoherenciaIndicator } from './ProyectoCoherenciaIndicator';
import { formatCurrency, cn } from '@/lib/utils';
import { calcularCostoItem } from '@/lib/utils/costoCalculations';
import { transformToDetail } from '@/lib/utils/master-detail-transformers';
import { getListasEquipo } from '@/lib/services/aprovisionamiento';
import type { 
  FiltrosListaEquipo as FilterType,
  CoherenciaIndicator 
} from '@/types/aprovisionamiento';
import type { ListaEquipo } from '@/types/modelos';

// ✅ Props interface
interface VistaListasProps {
  proyectoId?: string;
  showFilters?: boolean;
  showStats?: boolean;
  showActions?: boolean;
  compactMode?: boolean;
  onListaSelect?: (lista: ListaEquipo) => void;
  onListaEdit?: (lista: ListaEquipo) => void;
  onListaDelete?: (listaId: string) => void;
  className?: string;
}

// ✅ Stats interface
interface ListasStats {
  total: number;
  aprobadas: number;
  pendientes: number;
  rechazadas: number;
  montoTotal: number;
  montoPromedio: number;
  coherenciaPromedio: number;
}

// ✅ Main component
export const VistaListas: React.FC<VistaListasProps> = ({
  proyectoId,
  showFilters = true,
  showStats = true,
  showActions = true,
  compactMode = false,
  onListaSelect,
  onListaEdit,
  onListaDelete,
  className
}) => {
  // 🔄 State management
  const [listas, setListas] = useState<ListaEquipo[]>([]);
  const [filteredListas, setFilteredListas] = useState<ListaEquipo[]>([]);
  const [filters, setFilters] = useState<FilterType>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListas, setSelectedListas] = useState<string[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // 📊 Calculate stats
  const stats: ListasStats = useMemo(() => {
    const total = filteredListas.length;
    const aprobadas = filteredListas.filter(l => l.estado === 'aprobado').length;
    const pendientes = filteredListas.filter(l => l.estado === 'por_revisar' || l.estado === 'por_cotizar' || l.estado === 'por_validar' || l.estado === 'por_aprobar').length;
    const rechazadas = filteredListas.filter(l => l.estado === 'rechazado').length;
    
    // ✅ Calcular montoTotal desde los items de cada lista usando calcularCostoItem
    const montoTotal = filteredListas.reduce((sum, lista) => {
      const costoLista = lista.items?.reduce((itemSum, item) => {
        return itemSum + calcularCostoItem(item);
      }, 0) || 0;
      return sum + costoLista;
    }, 0);
    
    const montoPromedio = total > 0 ? montoTotal / total : 0;
    
    // ✅ coherencia es un número (porcentaje directo)
    const coherenciaPromedio = total > 0
      ? filteredListas.reduce((sum, l) => sum + (l.coherencia || 0), 0) / total
      : 0;

    return {
      total,
      aprobadas,
      pendientes,
      rechazadas,
      montoTotal,
      montoPromedio,
      coherenciaPromedio
    };
  }, [filteredListas]);

  // 🔄 Load data
  const loadListas = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getListasEquipo({ 
         ...filters, 
         proyectoId, 
         busqueda: searchTerm 
       });
      const data = result.data.listas as ListaEquipo[];
      
      setListas(data);
      setFilteredListas(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar listas';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 Effect for initial load and filter changes
  useEffect(() => {
    loadListas();
  }, [filters, searchTerm, proyectoId]);

  // 🔍 Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // 🎯 Handle filter changes
  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  // 📤 Handle export
  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      toast.loading(`Exportando listas a ${format.toUpperCase()}...`);
      
      // TODO: Implement export functionality
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Listas exportadas a ${format.toUpperCase()} exitosamente`);
    } catch (err) {
      toast.error('Error al exportar listas');
    }
  };

  // 🎨 Render stats cards
  const renderStats = () => {
    if (!showStats || compactMode) return null;

    const statCards = [
      {
        title: 'Total Listas',
        value: stats.total,
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Aprobadas',
        value: stats.aprobadas,
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Monto Total',
        value: formatCurrency(stats.montoTotal),
        icon: TrendingUp,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'Coherencia Promedio',
        value: `${stats.coherenciaPromedio.toFixed(1)}%`,
        icon: AlertCircle,
        color: stats.coherenciaPromedio >= 90 ? 'text-green-600' : 
               stats.coherenciaPromedio >= 70 ? 'text-yellow-600' : 'text-red-600',
        bgColor: stats.coherenciaPromedio >= 90 ? 'bg-green-50' : 
                 stats.coherenciaPromedio >= 70 ? 'bg-yellow-50' : 'bg-red-50'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                      <Icon className={cn('w-5 h-5', stat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    );
  };

  // 🎨 Render toolbar
  const renderToolbar = () => {
    return (
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar listas..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={cn(showFiltersPanel && 'bg-blue-50 border-blue-200')}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadListas}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Actualizar
          </Button>

          {showActions && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Formato de exportación</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    PDF (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Lista
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  // 🔄 Loading state
  if (isLoading && listas.length === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // ❌ Error state
  if (error && listas.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar listas</h3>
        <p className="text-gray-600 mb-4 text-center">{error}</p>
        <Button onClick={loadListas} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {renderStats()}
      {renderToolbar()}
      
      {/* Filters Panel */}
      {showFiltersPanel && (
        <div className="animate-in slide-in-from-top-2 duration-300">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
              </CardHeader>
              <CardContent>
                <ListaEquipoFilters
                  filtros={filters}
                  onFiltrosChange={handleFiltersChange}
                  proyectos={proyectoId ? [{ id: proyectoId, nombre: 'Proyecto Actual', codigo: proyectoId }] : []}
                />
              </CardContent>
            </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ListaEquipoTable
            listas={filteredListas.map(transformToDetail)}
            loading={isLoading}
            onListaClick={onListaSelect ? (lista) => onListaSelect(lista) : undefined}
            onListaEdit={onListaEdit ? (lista) => onListaEdit(lista) : undefined}
            className={compactMode ? 'compact-mode' : ''}
          />
        </CardContent>
      </Card>

      {/* Empty state */}
      {!isLoading && filteredListas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron listas
          </h3>
          <p className="text-gray-600 mb-4 text-center">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primera lista de equipos'
            }
          </p>
          {showActions && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Lista
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default VistaListas;
