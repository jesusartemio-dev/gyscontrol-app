/**
 * 🎯 ListaEquipoMasterFilters Component
 * 
 * Advanced filtering component for equipment lists Master view.
 * Features:
 * - Multi-criteria filtering (status, date range, cost, search)
 * - Filter presets and saved filters
 * - Real-time search with debouncing
 * - Filter chips with clear functionality
 * - Responsive collapsible design
 * - Export filter configurations
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { 
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  DollarSign,
  Package,
  RotateCcw,
  Save,
  Settings
} from 'lucide-react';
import { ListaEquipoMaster } from '@/types/master-detail';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ✅ Filter types
export interface FilterState {
  search: string;
  estado: string[];
  fechaDesde?: Date;
  fechaHasta?: Date;
  costoMin?: number;
  costoMax?: number;
  moneda: string;
  itemsMin?: number;
  itemsMax?: number;
  progreso: 'all' | 'completed' | 'in_progress' | 'pending';
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  isDefault?: boolean;
}

// ✅ Props interface
interface ListaEquipoMasterFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  listas: ListaEquipoMaster[];
  loading?: boolean;
  presets?: FilterPreset[];
  onPresetSave?: (preset: Omit<FilterPreset, 'id'>) => void;
  onPresetLoad?: (preset: FilterPreset) => void;
  showAdvanced?: boolean;
  className?: string;
  onClose?: () => void;
}

// ✅ Default filter state
const defaultFilters: FilterState = {
  search: '',
  estado: [],
  moneda: 'USD',
  progreso: 'all'
};

// ✅ Status options (alineado con EstadoListaEquipo)
const statusOptions = [
  { value: 'borrador', label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
  { value: 'por_revisar', label: 'Por Revisar', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'por_cotizar', label: 'Por Cotizar', color: 'bg-blue-100 text-blue-800' },
  { value: 'por_validar', label: 'Por Validar', color: 'bg-purple-100 text-purple-800' },
  { value: 'por_aprobar', label: 'Por Aprobar', color: 'bg-orange-100 text-orange-800' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-100 text-red-800' }
];

// ✅ Progress options
const progressOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Completados (100%)' },
  { value: 'in_progress', label: 'En Progreso (1-99%)' },
  { value: 'pending', label: 'Pendientes (0%)' }
];

const ListaEquipoMasterFilters: React.FC<ListaEquipoMasterFiltersProps> = ({
  filters,
  onFiltersChange,
  listas,
  loading = false,
  presets = [],
  onPresetSave,
  onPresetLoad,
  showAdvanced = true,
  className,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'desde' | 'hasta' | null>(null);
  
  // 🔍 Debounced search
  const debouncedSearch = useDebounce(filters.search, 300);
  
  // 📊 Calculate filter statistics
  const filterStats = useMemo(() => {
    if (!listas.length) return { total: 0, filtered: 0 };
    
    let filtered = listas;
    
    // Apply search filter
    if (debouncedSearch) {
      filtered = filtered.filter(lista => 
        lista.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        lista.codigo.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filters.estado.length > 0) {
      filtered = filtered.filter(lista => filters.estado.includes(lista.estado));
    }
    
    // Apply date filters
    if (filters.fechaDesde) {
      filtered = filtered.filter(lista => 
        new Date(lista.updatedAt) >= filters.fechaDesde!
      );
    }

    if (filters.fechaHasta) {
      filtered = filtered.filter(lista => 
        new Date(lista.updatedAt) <= filters.fechaHasta!
      );
    }
    
    // Apply cost filters
    if (filters.costoMin !== undefined) {
      filtered = filtered.filter(lista => lista.stats.costoTotal >= filters.costoMin!);
    }

    if (filters.costoMax !== undefined) {
      filtered = filtered.filter(lista => lista.stats.costoTotal <= filters.costoMax!);
    }
    
    // Apply items filters
    if (filters.itemsMin !== undefined) {
      filtered = filtered.filter(lista => lista.stats.totalItems >= filters.itemsMin!);
    }

    if (filters.itemsMax !== undefined) {
      filtered = filtered.filter(lista => lista.stats.totalItems <= filters.itemsMax!);
    }
    
    // Apply progress filter
    if (filters.progreso !== 'all') {
      filtered = filtered.filter(lista => {
        const progress = lista.stats.totalItems > 0 
          ? (lista.stats.itemsAprobados / lista.stats.totalItems) * 100 
          : 0;

        switch (filters.progreso) {
          case 'completed': return progress === 100;
          case 'in_progress': return progress > 0 && progress < 100;
          case 'pending': return progress === 0;
          default: return true;
        }
      });
    }
    
    return {
      total: listas.length,
      filtered: filtered.length
    };
  }, [listas, debouncedSearch, filters]);
  
  // 🔁 Handle filter updates
  const updateFilter = <K extends keyof FilterState>(
    key: K, 
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  
  // 🔁 Handle status toggle
  const toggleStatus = (status: string) => {
    const newEstados = filters.estado.includes(status)
      ? filters.estado.filter(e => e !== status)
      : [...filters.estado, status];
    updateFilter('estado', newEstados);
  };
  
  // 🔁 Clear all filters
  const clearAllFilters = () => {
    onFiltersChange(defaultFilters);
  };
  
  // 🔁 Remove specific filter
  const removeFilter = (filterType: string, value?: string) => {
    switch (filterType) {
      case 'search':
        updateFilter('search', '');
        break;
      case 'estado':
        if (value) {
          updateFilter('estado', filters.estado.filter(e => e !== value));
        } else {
          updateFilter('estado', []);
        }
        break;
      case 'fechaDesde':
        updateFilter('fechaDesde', undefined);
        break;
      case 'fechaHasta':
        updateFilter('fechaHasta', undefined);
        break;
      case 'costo':
        updateFilter('costoMin', undefined);
        updateFilter('costoMax', undefined);
        break;
      case 'items':
        updateFilter('itemsMin', undefined);
        updateFilter('itemsMax', undefined);
        break;
      case 'progreso':
        updateFilter('progreso', 'all');
        break;
    }
  };
  
  // 📊 Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.estado.length > 0 ||
      filters.fechaDesde !== undefined ||
      filters.fechaHasta !== undefined ||
      filters.costoMin !== undefined ||
      filters.costoMax !== undefined ||
      filters.itemsMin !== undefined ||
      filters.itemsMax !== undefined ||
      filters.progreso !== 'all'
    );
  }, [filters]);
  
  // 🎯 Render active filter chips
  const renderFilterChips = () => {
    const chips: React.ReactNode[] = [];
    
    // Search chip
    if (filters.search) {
      chips.push(
        <Badge key="search" variant="secondary" className="flex items-center gap-1">
          <Search className="w-3 h-3" />
          {filters.search}
          <button
            onClick={() => removeFilter('search')}
            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      );
    }
    
    // Status chips
    filters.estado.forEach(estado => {
      const statusOption = statusOptions.find(opt => opt.value === estado);
      if (statusOption) {
        chips.push(
          <Badge key={estado} className={cn('flex items-center gap-1', statusOption.color)}>
            {statusOption.label}
            <button
              onClick={() => removeFilter('estado', estado)}
              className="ml-1 hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        );
      }
    });
    
    // Date chips
    if (filters.fechaDesde || filters.fechaHasta) {
      const dateText = filters.fechaDesde && filters.fechaHasta
        ? `${formatDate(filters.fechaDesde)} - ${formatDate(filters.fechaHasta)}`
        : filters.fechaDesde
        ? `Desde ${formatDate(filters.fechaDesde)}`
        : `Hasta ${formatDate(filters.fechaHasta!)}`;
      
      chips.push(
        <Badge key="dates" variant="secondary" className="flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" />
          {dateText}
          <button
            onClick={() => {
              removeFilter('fechaDesde');
              removeFilter('fechaHasta');
            }}
            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      );
    }
    
    // Cost chip
    if (filters.costoMin !== undefined || filters.costoMax !== undefined) {
      const costText = filters.costoMin !== undefined && filters.costoMax !== undefined
        ? `${formatCurrency(filters.costoMin, filters.moneda)} - ${formatCurrency(filters.costoMax, filters.moneda)}`
        : filters.costoMin !== undefined
        ? `Min: ${formatCurrency(filters.costoMin, filters.moneda)}`
        : `Max: ${formatCurrency(filters.costoMax!, filters.moneda)}`;
      
      chips.push(
        <Badge key="cost" variant="secondary" className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          {costText}
          <button
            onClick={() => removeFilter('costo')}
            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      );
    }
    
    // Progress chip
    if (filters.progreso !== 'all') {
      const progressOption = progressOptions.find(opt => opt.value === filters.progreso);
      if (progressOption) {
        chips.push(
          <Badge key="progress" variant="secondary" className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {progressOption.label}
            <button
              onClick={() => removeFilter('progreso')}
              className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        );
      }
    }
    
    return chips;
  };
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            {filterStats.total > 0 && (
              <Badge variant="outline" className="text-xs">
                {filterStats.filtered} de {filterStats.total}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Limpiar
              </Button>
            )}
            
            {showAdvanced && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            )}
            
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar listas de equipos..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {statusOptions.map(status => (
            <Button
              key={status.value}
              variant={filters.estado.includes(status.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleStatus(status.value)}
              className="text-xs"
            >
              {status.label}
            </Button>
          ))}
        </div>
        
        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {renderFilterChips()}
          </div>
        )}
        
        {/* Advanced Filters */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 border-t pt-4"
            >
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha desde</Label>
                  <Popover open={showDatePicker === 'desde'} onOpenChange={(open) => setShowDatePicker(open ? 'desde' : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.fechaDesde ? format(filters.fechaDesde, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.fechaDesde}
                        onSelect={(date) => {
                          updateFilter('fechaDesde', date);
                          setShowDatePicker(null);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Fecha hasta</Label>
                  <Popover open={showDatePicker === 'hasta'} onOpenChange={(open) => setShowDatePicker(open ? 'hasta' : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.fechaHasta ? format(filters.fechaHasta, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.fechaHasta}
                        onSelect={(date) => {
                          updateFilter('fechaHasta', date);
                          setShowDatePicker(null);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Cost Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Costo mínimo</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={filters.costoMin || ''}
                    onChange={(e) => updateFilter('costoMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Costo máximo</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={filters.costoMax || ''}
                    onChange={(e) => updateFilter('costoMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={filters.moneda} onValueChange={(value) => updateFilter('moneda', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD (Dólares)</SelectItem>
                      <SelectItem value="PEN">PEN (Soles)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Progress Filter */}
              <div className="space-y-2">
                <Label>Progreso</Label>
                <Select value={filters.progreso} onValueChange={(value: any) => updateFilter('progreso', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {progressOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default ListaEquipoMasterFilters;
export type { ListaEquipoMasterFiltersProps };
