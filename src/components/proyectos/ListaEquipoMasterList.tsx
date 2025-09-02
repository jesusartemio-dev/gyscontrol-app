/**
 * 🎯 ListaEquipoMasterList Component
 * 
 * Master list component for displaying equipment lists in grid/table view.
 * Features:
 * - Grid and table view modes
 * - Pagination and infinite scroll support
 * - Empty states and loading states
 * - Bulk selection capabilities
 * - Responsive design
 * - Search and filter integration
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useIsMobile,
  useIsTouchDevice,
  gridConfigs,
  spacing,
  touchInteractions,
  getResponsiveClasses
} from '@/lib/responsive/breakpoints';
import { 
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverVariants
} from '@/lib/animations/masterDetailAnimations';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Grid3X3,
  List,
  Package,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import ListaEquipoMasterCard from './ListaEquipoMasterCard';
import { ListaEquipoMaster } from '@/types/master-detail';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

// ✅ Props interface
interface ListaEquipoMasterListProps {
  listas: ListaEquipoMaster[];
  proyectoId: string;
  loading?: boolean;
  viewMode?: 'grid' | 'table';
  onViewModeChange?: (mode: 'grid' | 'table') => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onItemSelect?: (listaId: string) => void;
  showSelection?: boolean;
  showActions?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
}

// ✅ Status icons mapping
const statusIcons = {
  borrador: Clock,
  por_revisar: AlertCircle,
  por_cotizar: TrendingUp,
  por_validar: AlertCircle,
  por_aprobar: Clock,
  aprobado: CheckCircle2,
  rechazado: AlertCircle
};

// ✅ Using centralized animation variants from masterDetailAnimations.ts
// Removed local animation variants in favor of standardized ones

const ListaEquipoMasterList: React.FC<ListaEquipoMasterListProps> = ({
    listas,
    proyectoId,
    loading = false,
    viewMode = 'grid',
    onViewModeChange,
    selectedIds = [],
    onSelectionChange,
    onItemSelect,
    showSelection = false,
    showActions = true,
    emptyMessage = 'No hay listas de equipos',
    emptyDescription = 'Crea tu primera lista de equipos para comenzar',
    className,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    itemsPerPage = 12
  }) => {
    // 📱 Responsive hooks
    const isMobile = useIsMobile();
    const isTouchDevice = useIsTouchDevice();
    
    // 🎨 Responsive grid classes
    const gridClasses = getResponsiveClasses(gridConfigs.masterList);
    const containerSpacing = getResponsiveClasses(spacing.container);
    const touchButtonClasses = isTouchDevice ? touchInteractions.button.touch : touchInteractions.button.desktop;
  // 🔁 Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      const allIds = listas.map(lista => lista.id);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };
  
  // 🔁 Handle individual selection
  const handleItemSelection = (listaId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedIds, listaId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== listaId));
    }
  };
  
  // 📊 Calculate selection state
  const isAllSelected = listas.length > 0 && selectedIds.length === listas.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < listas.length;
  
  // 🎯 Render empty state
  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {emptyMessage}
      </h3>
      <p className="text-gray-500 text-center max-w-md">
        {emptyDescription}
      </p>
    </motion.div>
  );
  
  // 🎯 Render grid view
  const renderGridView = () => (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={gridClasses}
    >
      {listas.map((lista) => (
        <motion.div key={lista.id} variants={staggerItemVariants}>
          <ListaEquipoMasterCard
            lista={lista}
            proyectoId={proyectoId}
            onSelect={onItemSelect}
            isSelected={selectedIds.includes(lista.id)}
            viewMode="grid"
            showActions={showActions}
          />
        </motion.div>
      ))}
    </motion.div>
  );
  
  // 🎯 Render table view
  const renderTableView = () => (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {showSelection && (
              <TableHead className="w-12">
                <IndeterminateCheckbox
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todas las listas"
                />
              </TableHead>
            )}
            <TableHead>Lista</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Progreso</TableHead>
            <TableHead className="text-right">Costo Total</TableHead>
            <TableHead>Actualizado</TableHead>
            {showActions && <TableHead className="w-20">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {listas.map((lista, index) => {
              const StatusIcon = statusIcons[lista.estado] || Clock;
              const progressPercentage = lista.stats.totalItems > 0 
                ? Math.round((lista.stats.itemsVerificados / lista.stats.totalItems) * 100)
                : 0;
              
              return (
                <motion.tr
                  key={lista.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'hover:bg-gray-50 cursor-pointer transition-colors',
                    selectedIds.includes(lista.id) && 'bg-blue-50'
                  )}
                  onClick={() => onItemSelect?.(lista.id)}
                >
                  {showSelection && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(lista.id)}
                        onCheckedChange={(checked) => 
                          handleItemSelection(lista.id, checked as boolean)
                        }
                        aria-label={`Seleccionar ${lista.nombre}`}
                      />
                    </TableCell>
                  )}
                  
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {lista.nombre}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        Código: {lista.codigo}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={lista.estado === 'aprobado' ? 'default' : 'secondary'}
                      className="flex items-center gap-1 w-fit"
                    >
                      <StatusIcon className="w-3 h-3" />
                      {lista.estado.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right font-medium">
                    {lista.stats.totalItems}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2">
                      <Progress value={progressPercentage} className="w-16 h-2" />
                      <span className="text-sm font-medium min-w-[3rem]">
                        {progressPercentage}%
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right font-medium">
                    {formatCurrency(lista.stats.costoTotal)}
                  </TableCell>
                  
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(lista.updatedAt)}
                  </TableCell>
                  
                  {showActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`${touchButtonClasses} h-8 w-8 p-0`}
                        onClick={() => onItemSelect?.(lista.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
  
  // 🎯 Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-500">
          Página {currentPage} de {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Siguiente
          </Button>
        </div>
      </div>
    );
  };
  
  // 🎯 Main render
  return (
    <div className={cn('space-y-6', className)}>
      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="w-4 h-4" />
            Tarjetas
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            Tabla
          </Button>
        </div>
      )}
      
      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : listas.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {viewMode === 'grid' ? renderGridView() : renderTableView()}
          {renderPagination()}
        </>
      )}
    </div>
  );
};

// ✅ IndeterminateCheckbox Component
// Custom checkbox component that supports indeterminate state
interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onCheckedChange: (checked: boolean) => void;
  'aria-label'?: string;
}

const IndeterminateCheckbox: React.FC<IndeterminateCheckboxProps> = ({
  checked,
  indeterminate,
  onCheckedChange,
  'aria-label': ariaLabel
}) => {
  const checkboxRef = useRef<HTMLButtonElement>(null);

  // 🔁 Update indeterminate state on DOM element
  useEffect(() => {
    if (checkboxRef.current) {
      // Find the underlying input element within the checkbox
      const inputElement = checkboxRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (inputElement) {
        inputElement.indeterminate = indeterminate;
      }
    }
  }, [indeterminate]);

  return (
    <Checkbox
      ref={checkboxRef}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
    />
  );
};

export default ListaEquipoMasterList;
export type { ListaEquipoMasterListProps };