/**
 * 🎯 ListaEquipoMasterView Component
 * 
 * Main Master view component that orchestrates all Master-Detail functionality.
 * Features:
 * - Integration of all Master components
 * - State management with custom hooks
 * - View mode switching (cards/table)
 * - Advanced filtering and search
 * - Real-time data synchronization
 * - Responsive design with animations
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { useState, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  pageTransitionVariants,
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverVariants,
  buttonInteractionVariants,
  loadingVariants
} from '@/lib/animations/masterDetailAnimations';
import { 
  useIsMobile,
  useIsTouchDevice,
  gridConfigs,
  spacing,
  touchInteractions,
  getResponsiveClasses
} from '@/lib/responsive/breakpoints';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteListaEquipo } from '@/lib/services/listaEquipo';
import { ListaEquipoMaster } from '@/types/master-detail';
import { calculateMasterListStats } from '@/lib/transformers/master-detail-transformers';
import { useListaEquipoMaster } from '@/hooks/useListaEquipoMaster';
import { useListaEquipoFilters } from '@/hooks/useListaEquipoFilters';
import ListaEquipoMasterList from './ListaEquipoMasterList';
import ListaEquipoMasterFilters from './ListaEquipoMasterFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  MasterGridSkeleton,
  MasterTableSkeleton,
  FiltersSkeleton,
  DetailViewSkeleton,
  MasterViewSkeleton
} from '@/components/ui/skeletons/MasterViewSkeletons';
import { 
  Search,
  Filter,
  Grid3X3,
  List,
  Plus,
  RefreshCw,
  Download,
  Settings,
  BarChart3,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import ModalCrearListaEquipo from '@/components/equipos/ModalCrearListaEquipo';

// ✅ Component props interface
interface ListaEquipoMasterViewProps {
  proyectoId: string;
  initialLists?: ListaEquipoMaster[];
  initialStats?: ReturnType<typeof calculateMasterListStats>;
}

// ✅ View mode type
type ViewMode = 'grid' | 'table';

// ✅ Animation variants
// ✅ Using centralized animation variants from masterDetailAnimations.ts
// Removed local variants in favor of standardized animations

// ✅ Main component
export const ListaEquipoMasterView: React.FC<ListaEquipoMasterViewProps> = ({
  proyectoId,
  initialLists = [],
  initialStats
}) => {
  const router = useRouter();
  
  // 📱 Responsive hooks
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  
  // 🔄 State management
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'table' : 'grid');
  const [showFilters, setShowFilters] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  
  // 📱 Responsive classes
  const gridClasses = getResponsiveClasses(gridConfigs.statsCards);
  const containerSpacing = getResponsiveClasses(spacing.container);
  const touchButtonClasses = getResponsiveClasses(touchInteractions.button);
  
  // 🎣 Custom hooks
  const {
    listas: lists,
    filteredListas,
    stats,
    loading,
    error,
    filters,
    setFilters,
    clearFilters: clearAllFilters,
    sortBy,
    setSortBy,
    viewMode: hookViewMode,
    setViewMode: setHookViewMode,
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    selectedIds,
    setSelectedIds,
    selectAll,
    clearSelection,
    refresh: refreshData,
    navigateToDetail,
    isFiltered,
    hasSelection
  } = useListaEquipoMaster({
    proyectoId,
    initialFilters: {},
    initialViewMode: viewMode,
    itemsPerPage: viewMode === 'grid' ? 12 : 20,
    enableRealTime: true,
    enableSelection: true
  });
  
  const {
    filters: advancedFilters,
    updateFilter,
    setFilters: setAdvancedFilters,
    clearFilters: clearAdvancedFilters,
    hasActiveFilters,
    getFilterSummary,
    quickFilters,
    applyQuickFilter
  } = useListaEquipoFilters({
    proyectoId,
    initialFilters: filters,
    enableHistory: true,
    enablePresets: true
  });
  
  // 🔄 Wrapper function to handle filter changes
  const handleFiltersChange = (newFilters: typeof advancedFilters) => {
    setAdvancedFilters(newFilters);
  };
  
  // 🔍 Apply quick search to filters
  const handleQuickSearch = (value: string) => {
    setQuickSearch(value);
    setFilters({ ...filters, search: value });
  };
  
  // 🔄 Refresh data
  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      toast.error('Error al actualizar los datos');
    }
  };
  
  // ✅ Early return for complete loading state
  if (loading && lists.length === 0) {
    return <MasterViewSkeleton />;
  }

  // 📊 Use filtered lists from hook (server-side + client-side filtering)
  const processedLists = filteredListas;
  
  // 📈 Use stats from hook (already calculated)
  const filteredStats = stats;
  
  // 🎯 Navigation to detail view (use hook function)
  const handleViewDetail = navigateToDetail;
  
  // 🗑️ Handle delete action
  const handleDelete = async (listaId: string) => {
    try {
      const success = await deleteListaEquipo(listaId);
      if (success) {
        toast.success('Lista eliminada correctamente');
        await refreshData(); // Refresh the data after deletion
      } else {
        toast.error('Error al eliminar la lista');
      }
    } catch (error) {
      console.error('Error deleting lista:', error);
      toast.error('Error al eliminar la lista');
    }
  };

  // 📱 Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos una lista');
      return;
    }
    
    switch (action) {
      case 'export':
        toast.success(`Exportando ${selectedIds.length} listas...`);
        break;
      case 'duplicate':
        toast.success(`Duplicando ${selectedIds.length} listas...`);
        break;
      case 'delete':
        toast.error('Funcionalidad de eliminación masiva no implementada');
        break;
      default:
        toast.info(`Acción "${action}" no implementada`);
    }
  };
  
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={containerSpacing}
    >
     
      {/* 🎛️ Controls Section */}
      <motion.div variants={staggerItemVariants} className="space-y-4">
        {/* Search and Actions Bar */}
        <Suspense fallback={<DetailViewSkeleton />}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar listas de equipos..."
                  value={quickSearch}
                  onChange={(e) => handleQuickSearch(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`${touchButtonClasses} ${isFiltered ? 'border-blue-500 text-blue-600' : ''}`}
                disabled={loading}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {isFiltered && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                    {Object.values(filters).filter(v => 
                      v !== '' && v !== 'all' && 
                      !(Array.isArray(v) && v.length === 0) &&
                      v !== undefined
                    ).length}
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className={touchButtonClasses}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              
              <div className="flex border rounded-md">
                <Button
                  variant={hookViewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setHookViewMode('grid')}
                  className={`${touchButtonClasses} rounded-r-none`}
                  disabled={loading}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={hookViewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setHookViewMode('table')}
                  className={`${touchButtonClasses} rounded-l-none`}
                  disabled={loading}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <ModalCrearListaEquipo
                proyectoId={proyectoId}
                onCreated={() => {
                  refreshData();
                  toast.success('✅ Lista técnica creada exitosamente');
                }}
                triggerClassName={`${touchButtonClasses} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
        </Suspense>
        
        {/* Quick Filters */}
        <Suspense fallback={
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        }>
          <div className="flex flex-wrap gap-2">
            {quickFilters.slice(0, 5).map((quickFilter) => (
              <Button
                key={quickFilter.id}
                variant="outline"
                size="sm"
                onClick={() => applyQuickFilter(quickFilter.id)}
                className={`${touchButtonClasses} text-xs`}
                disabled={loading}
              >
                {quickFilter.icon && <span className="mr-1">{quickFilter.icon}</span>}
                {quickFilter.name}
              </Button>
            ))}
          </div>
        </Suspense>
        
        {/* Active Filters Summary */}
        {isFiltered && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {getFilterSummary()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className={`${touchButtonClasses} ml-auto text-blue-600 hover:text-blue-700`}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </motion.div>
      
      {/* 🔍 Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            variants={loadingVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Suspense fallback={<FiltersSkeleton />}>
              <ListaEquipoMasterFilters
                filters={advancedFilters}
                onFiltersChange={handleFiltersChange}
                listas={lists}
                loading={loading}
                onClose={() => setShowFilters(false)}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Separator />
      
      {/* 📋 Lists Display */}
      <motion.div variants={staggerItemVariants}>
        <Suspense fallback={
          viewMode === 'table' ? <MasterTableSkeleton /> : <MasterGridSkeleton />
        }>
          <ListaEquipoMasterList
            listas={processedLists}
            proyectoId={proyectoId}
            loading={loading}
            viewMode={hookViewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onItemSelect={handleViewDetail}
            onDelete={handleDelete}
            showSelection={hasSelection}
            showActions={true}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
          />
        </Suspense>
        
        {/* Pagination Skeleton */}
        {loading && totalPages > 1 && (
          <div className="mt-4">
            <DetailViewSkeleton />
          </div>
        )}
      </motion.div>
      
      {/* 📊 Status distribution is now handled by MasterStatsHeader in the parent page */}
    </motion.div>
  );
};

export default ListaEquipoMasterView;
export type { ListaEquipoMasterViewProps, ViewMode };
