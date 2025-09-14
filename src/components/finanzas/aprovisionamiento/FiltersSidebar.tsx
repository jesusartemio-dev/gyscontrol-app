/**
 * 🎛️ FiltersSidebar Component
 * 
 * Sidebar minimalista y colapsible para filtros del timeline de aprovisionamiento.
 * Diseño optimizado para maximizar el espacio del timeline principal.
 * 
 * Features:
 * - Sidebar colapsible con animaciones suaves
 * - Filtros compactos y organizados por categorías
 * - Estados visuales minimalistas
 * - Responsive design
 * - Acceso rápido a filtros principales
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid,
  List,
  Settings,
  X,
  BarChart3,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import type { FiltrosTimeline } from '@/types/aprovisionamiento';

// ✅ Props interface
interface FiltersSidebarProps {
  filtros: FiltrosTimeline;
  onFiltrosChange: (filtros: FiltrosTimeline) => void;
  proyectos?: Array<{ id: string; nombre: string; codigo: string }>;
  loading?: boolean;
  className?: string;
}

// ✅ Quick filter presets
const QUICK_FILTERS = [
  {
    id: 'hoy',
    label: 'Hoy',
    icon: <Clock className="w-3 h-3" />,
    apply: () => {
      const today = new Date();
      return {
        fechaInicio: today.toISOString().split('T')[0],
        fechaFin: today.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'semana',
    label: 'Esta Semana',
    icon: <Calendar className="w-3 h-3" />,
    apply: () => {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      return {
        fechaInicio: startOfWeek.toISOString().split('T')[0],
        fechaFin: endOfWeek.toISOString().split('T')[0],
      };
    },
  },
  {
    id: 'alertas',
    label: 'Solo Alertas',
    icon: <AlertTriangle className="w-3 h-3" />,
    apply: () => ({ soloAlertas: true }),
  },
];

// ✅ View type options
const VIEW_TYPES = [
  { value: 'gantt', label: 'Gantt', icon: <BarChart3 className="w-3 h-3" /> },
  { value: 'lista', label: 'Lista', icon: <List className="w-3 h-3" /> },
  { value: 'calendario', label: 'Calendario', icon: <Calendar className="w-3 h-3" /> },
];

// ✅ Grouping options
const GROUPING_OPTIONS = [
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'estado', label: 'Estado' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'responsable', label: 'Responsable' },
];

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  filtros,
  onFiltrosChange,
  proyectos = [],
  loading = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    dates: true,
    view: true,
    advanced: false,
  });

  // 🔁 Handle filter changes
  const handleFilterChange = (updates: Partial<FiltrosTimeline>) => {
    onFiltrosChange({ ...filtros, ...updates });
  };

  // 🔁 Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    handleFilterChange({
      fechaInicio: range?.from?.toISOString().split('T')[0],
      fechaFin: range?.to?.toISOString().split('T')[0],
    });
  };

  // 🔁 Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 🔁 Apply quick filter
  const applyQuickFilter = (filter: typeof QUICK_FILTERS[0]) => {
    const updates = filter.apply();
    handleFilterChange(updates);
  };

  // 🔁 Clear all filters
  const clearFilters = () => {
    onFiltrosChange({
      tipoVista: 'gantt',
      agrupacion: 'proyecto',
      validarCoherencia: true,
      margenDias: 7,
      alertaAnticipacion: 15,
    });
  };

  // 🔁 Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filtros.fechaInicio || filtros.fechaFin) count++;
    if (filtros.proyectoIds?.length) count++;
    if (filtros.soloAlertas) count++;
    if (filtros.validarCoherencia) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <>
      {/* Mobile Sheet */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </SheetTitle>
              <SheetDescription>
                Configura los filtros para el timeline
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent
                filtros={filtros}
                onFilterChange={handleFilterChange}
                onDateRangeChange={handleDateRangeChange}
                onQuickFilter={applyQuickFilter}
                onClearFilters={clearFilters}
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
                proyectos={proyectos}
                loading={loading}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block ${className}`}>
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </div>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterContent
              filtros={filtros}
              onFilterChange={handleFilterChange}
              onDateRangeChange={handleDateRangeChange}
              onQuickFilter={applyQuickFilter}
              onClearFilters={clearFilters}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              proyectos={proyectos}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// ✅ Filter content component
interface FilterContentProps {
  filtros: FiltrosTimeline;
  onFilterChange: (updates: Partial<FiltrosTimeline>) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onQuickFilter: (filter: typeof QUICK_FILTERS[0]) => void;
  onClearFilters: () => void;
  expandedSections: { dates: boolean; view: boolean; advanced: boolean };
  onToggleSection: (section: 'dates' | 'view' | 'advanced') => void;
  proyectos: Array<{ id: string; nombre: string; codigo: string }>;
  loading: boolean;
}

const FilterContent: React.FC<FilterContentProps> = ({
  filtros,
  onFilterChange,
  onDateRangeChange,
  onQuickFilter,
  onClearFilters,
  expandedSections,
  onToggleSection,
  proyectos,
  loading,
}) => {
  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Filtros Rápidos</Label>
        <div className="flex flex-wrap gap-1">
          {QUICK_FILTERS.map((filter) => (
            <Button
              key={filter.id}
              variant="outline"
              size="sm"
              onClick={() => onQuickFilter(filter)}
              className="h-7 px-2 text-xs"
              disabled={loading}
            >
              {filter.icon}
              <span className="ml-1">{filter.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* View Type */}
      <Collapsible 
        open={expandedSections.view} 
        onOpenChange={() => onToggleSection('view')}
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-8 px-2">
            <span className="text-xs font-medium">Vista</span>
            {expandedSections.view ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <div className="grid grid-cols-3 gap-1">
            {VIEW_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={filtros.tipoVista === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange({ tipoVista: type.value as any })}
                className="h-8 px-1 text-xs flex-col gap-1"
                disabled={loading}
              >
                {type.icon}
                <span className="hidden sm:inline">{type.label}</span>
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Date Range */}
      <Collapsible 
        open={expandedSections.dates} 
        onOpenChange={() => onToggleSection('dates')}
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-8 px-2">
            <span className="text-xs font-medium">Fechas</span>
            {expandedSections.dates ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <DatePickerWithRange 
             date={{ 
               from: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined, 
               to: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined, 
             }} 
             onDateChange={onDateRangeChange} 
             className="w-full" 
           />
        </CollapsibleContent>
      </Collapsible>

      {/* Advanced Filters */}
      <Collapsible 
        open={expandedSections.advanced} 
        onOpenChange={() => onToggleSection('advanced')}
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-8 px-2">
            <span className="text-xs font-medium">Avanzado</span>
            {expandedSections.advanced ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">
          {/* Grouping */}
          <div className="space-y-1">
            <Label className="text-xs">Agrupar por</Label>
            <Select
              value={filtros.agrupacion}
              onValueChange={(value) => onFilterChange({ agrupacion: value as any })}
              disabled={loading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUPING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Filter */}
          {proyectos.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Proyecto</Label>
              <Select
                value={filtros.proyectoIds?.[0] || ''}
                onValueChange={(value) => 
                  onFilterChange({ proyectoIds: value ? [value] : undefined })
                }
                disabled={loading}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos los proyectos</SelectItem>
                  {proyectos.map((proyecto) => (
                    <SelectItem key={proyecto.id} value={proyecto.id} className="text-xs">
                      {proyecto.codigo} - {proyecto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Switches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Solo Alertas</Label>
              <Switch
                checked={filtros.soloAlertas || false}
                onCheckedChange={(checked) => onFilterChange({ soloAlertas: checked })}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Validar Coherencia</Label>
              <Switch
                checked={filtros.validarCoherencia || false}
                onCheckedChange={(checked) => onFilterChange({ validarCoherencia: checked })}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Incluir Sugerencias</Label>
              <Switch
                checked={filtros.incluirSugerencias || false}
                onCheckedChange={(checked) => onFilterChange({ incluirSugerencias: checked })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Numeric inputs */}
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Margen (días)</Label>
              <Input
                type="number"
                min="0"
                max="365"
                value={filtros.margenDias || 7}
                onChange={(e) => onFilterChange({ margenDias: parseInt(e.target.value) || 7 })}
                className="h-8 text-xs"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Anticipación (días)</Label>
              <Input
                type="number"
                min="0"
                max="90"
                value={filtros.alertaAnticipacion || 15}
                onChange={(e) => onFilterChange({ alertaAnticipacion: parseInt(e.target.value) || 15 })}
                className="h-8 text-xs"
                disabled={loading}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Clear Filters */}
      <Button
        variant="outline"
        size="sm"
        onClick={onClearFilters}
        className="w-full h-8 text-xs"
        disabled={loading}
      >
        <X className="w-3 h-3 mr-1" />
        Limpiar Filtros
      </Button>
    </div>
  );
};

export default FiltersSidebar;
