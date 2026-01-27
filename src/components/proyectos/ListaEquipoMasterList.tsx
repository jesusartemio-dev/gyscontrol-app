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
import { DebugLogger, useRenderTracker } from '@/components/debug/DebugLogger';
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
  TrendingUp,
  Trash2
} from 'lucide-react';
import ListaEquipoMasterCard from './ListaEquipoMasterCard';
import { ListaEquipoMaster } from '@/types/master-detail';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import PedidoDesdeListaModal from '@/components/equipos/PedidoDesdeListaModal';
import { getListaEquipoDetail } from '@/lib/services/listaEquipo';
import { createPedidoDesdeListaContextual } from '@/lib/services/pedidoEquipo';
import { toast } from 'sonner';
import type { ListaEquipo, EstadoListaEquipo } from '@/types';
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog';

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
  onDelete?: (listaId: string) => void;
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
const statusIcons: Record<EstadoListaEquipo, typeof Clock> = {
  borrador: Clock,
  enviada: AlertCircle,
  por_revisar: AlertCircle,
  por_cotizar: TrendingUp,
  por_validar: AlertCircle,
  por_aprobar: Clock,
  aprobada: CheckCircle2,
  rechazada: AlertCircle,
  completada: CheckCircle2
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
    onDelete,
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
    // 🐛 Debug logger to track re-renders
    const renderCount = useRenderTracker('ListaEquipoMasterList', [listas?.length, proyectoId, viewMode, selectedIds?.length]);
    
    // 📱 Responsive hooks
    const isMobile = useIsMobile();
    const isTouchDevice = useIsTouchDevice();
    
    // 🎨 Responsive grid classes
    const gridClasses = getResponsiveClasses(gridConfigs.masterList);
    const containerSpacing = getResponsiveClasses(spacing.container);
    const touchButtonClasses = isTouchDevice ? touchInteractions.button.touch : touchInteractions.button.desktop;

    // 📦 Order modal state
    const [selectedListaForOrder, setSelectedListaForOrder] = useState<ListaEquipo | null>(null);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [orderModalLoading, setOrderModalLoading] = useState(false);

    // 🗑️ Delete confirmation state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [listaToDelete, setListaToDelete] = useState<ListaEquipoMaster | null>(null);

  //  Handle select all
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

  // 📦 Handle opening order modal
  const handleOpenOrderModal = async (listaId: string) => {
    try {
      setOrderModalLoading(true);
      const fullLista = await getListaEquipoDetail(listaId);
      if (fullLista) {
        setSelectedListaForOrder(fullLista);
        setOrderModalOpen(true);
      } else {
        toast.error('No se pudo cargar la información completa de la lista');
      }
    } catch (error) {
      console.error('Error loading lista for order modal:', error);
      toast.error('Error al cargar la lista para crear pedido');
    } finally {
      setOrderModalLoading(false);
    }
  };

  // 📦 Handle order creation
  const handleOrderCreated = async (payload: any) => {
    try {
      const result = await createPedidoDesdeListaContextual(payload);
      if (result) {
        toast.success('Pedido creado exitosamente');
        // Close modal
        setOrderModalOpen(false);
        setSelectedListaForOrder(null);
        // Optionally refresh the list data
        // This would require passing a refresh callback from parent
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear el pedido');
      return null;
    }
  };

  // 🗑️ Handle delete confirmation
  const handleDeleteClick = (lista: ListaEquipoMaster) => {
    setListaToDelete(lista);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (listaToDelete && onDelete) {
      await onDelete(listaToDelete.id);
      setDeleteDialogOpen(false);
      setListaToDelete(null);
    }
  };

  
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
            onDelete={onDelete}
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
            <TableHead className="text-right">Items con Pedido</TableHead>
            <TableHead className="text-center">Estado Pedidos</TableHead>
            <TableHead className="text-right">Progreso</TableHead>
            <TableHead className="text-right">Costo Total</TableHead>
            <TableHead>Actualizado</TableHead>
            {showActions && <TableHead className="w-32">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {listas.map((lista, index) => {
              const StatusIcon = statusIcons[lista.estado] || Clock;
              const progressPercentage = lista.stats.totalItems > 0
                ? Math.round((lista.stats.itemsVerificados / lista.stats.totalItems) * 100)
                : 0;

              // 📦 Calculate order status for display
              const getOrderStatus = () => {
                const { itemsConPedido, itemsSinPedido, pedidosCompletos, pedidosParciales } = lista.stats;

                if (itemsSinPedido === lista.stats.totalItems) {
                  return { label: 'Sin Pedido', variant: 'secondary' as const, color: 'text-gray-600' };
                }
                if (pedidosCompletos === itemsConPedido) {
                  return { label: 'Completo', variant: 'default' as const, color: 'text-green-600' };
                }
                if (pedidosParciales > 0) {
                  return { label: 'Parcial', variant: 'outline' as const, color: 'text-yellow-600' };
                }
                return { label: 'En Proceso', variant: 'outline' as const, color: 'text-blue-600' };
              };

              const orderStatus = getOrderStatus();
              
              return (
                <motion.tr
                  key={lista.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'hover:bg-gray-50 transition-colors cursor-default',
                    selectedIds.includes(lista.id) && 'bg-blue-50'
                  )}
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
                      variant={lista.estado === 'aprobada' ? 'default' : 'secondary'}
                      className="flex items-center gap-1 w-fit"
                    >
                      <StatusIcon className="w-3 h-3" />
                      {lista.estado.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right font-medium">
                    {lista.stats.totalItems}
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    <span className={lista.stats.itemsConPedido > 0 ? 'text-green-600' : 'text-gray-400'}>
                      {lista.stats.itemsConPedido}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge
                      variant={orderStatus.variant}
                      className={`text-xs ${orderStatus.color}`}
                    >
                      {orderStatus.label}
                    </Badge>
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${touchButtonClasses} h-8 px-2 text-xs`}
                          onClick={() => onItemSelect?.(lista.id)}
                          title="Ver detalles completos"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>

                        {lista.stats.itemsSinPedido === lista.stats.totalItems && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`${touchButtonClasses} h-8 px-2 text-xs hover:bg-blue-50 hover:border-blue-200`}
                            onClick={() => handleOpenOrderModal(lista.id)}
                            disabled={orderModalLoading}
                            title="Crear pedido"
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Pedido
                          </Button>
                        )}

                        {lista.stats.numeroPedidos > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`${touchButtonClasses} h-8 px-2 text-xs hover:bg-green-50 hover:border-green-200`}
                            onClick={() => onItemSelect?.(lista.id)}
                            title={`Ver ${lista.stats.numeroPedidos} pedidos`}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {lista.stats.numeroPedidos} Pedidos
                          </Button>
                        )}

                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(lista);
                            }}
                            className={`${touchButtonClasses} h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600`}
                            title="Eliminar lista"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
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
    <>
      <DebugLogger componentName="ListaEquipoMasterList" props={{ listasLength: listas?.length, proyectoId, viewMode, selectedIdsLength: selectedIds?.length }} />
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

      {/* 📦 Order Creation Modal */}
      {selectedListaForOrder && (
        <PedidoDesdeListaModal
          lista={selectedListaForOrder}
          proyectoId={proyectoId}
          responsableId={selectedListaForOrder.responsableId || 'default-user'}
          onCreated={handleOrderCreated}
          onRefresh={() => {
            // TODO: Implement refresh logic if needed
            console.log('Refresh after order creation');
          }}
          open={orderModalOpen}
          onOpenChange={(open) => {
            setOrderModalOpen(open);
            if (!open) {
              setSelectedListaForOrder(null);
            }
          }}
        />
      )}

      {/* 🗑️ Delete Confirmation Dialog */}
      <DeleteAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Lista de Equipos"
        description={`¿Estás seguro de que deseas eliminar la lista "${listaToDelete?.nombre}"? Esta acción no se puede deshacer y eliminará todos los items asociados.`}
      />

    </div>
    </>
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
