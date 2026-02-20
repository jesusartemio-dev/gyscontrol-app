/**
 * 🛒 PedidoEquipoTable Component
 * 
 * Tabla avanzada para gestión de pedidos de equipos con funcionalidades
 * de seguimiento, validación de coherencia y gestión de proveedores.
 * 
 * Features:
 * - Tabla responsive con seguimiento de estados
 * - Indicadores de coherencia con listas
 * - Gestión de fechas de entrega
 * - Seguimiento de proveedores
 * - Alertas de retrasos y inconsistencias
 * - Acciones de seguimiento y validación
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Package,
  ShoppingCart,
  Truck,
  User,
  X,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts
import { toast } from 'sonner';

// Types
import type { PedidoEquipo, EstadoPedido } from '@/types/modelos';
import type { FiltrosPedidoEquipo } from '@/types/aprovisionamiento';

// ✅ Props interface
interface PedidoEquipoTableProps {
  data: PedidoEquipo[];
  loading?: boolean;
  filtros?: FiltrosPedidoEquipo;
  allowEdit?: boolean;
  allowBulkActions?: boolean;
  showCoherenceIndicators?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  onEdit?: (pedido: PedidoEquipo) => void;
  onDelete?: (pedido: PedidoEquipo) => void;
  onUpdateStatus?: (pedido: PedidoEquipo, newStatus: EstadoPedido) => void;
  onViewTracking?: (pedido: PedidoEquipo) => void;
  onContactSupplier?: (pedido: PedidoEquipo) => void;
  onPedidoClick?: (pedido: PedidoEquipo) => void;
  onPedidoEdit?: (pedido: PedidoEquipo) => void;
  onPedidoUpdate?: (id: string, updates: Partial<PedidoEquipo>) => Promise<void>;
  onBulkAction?: (action: string, pedidoIds: string[]) => Promise<void>;
  onExport?: (format: 'excel' | 'pdf') => void;
  className?: string;
}

// ✅ Column configuration
type ColumnKey =
  | 'codigo'
  | 'proyecto'
  | 'creadoPor'
  | 'lista'
  | 'descripcion'
  | 'fechaPedido'
  | 'fechaNecesaria'
  | 'fechaEntregaEstimada'
  | 'fechaEntregaReal'
  | 'estado'
  | 'montoTotal'
  | 'coherencia'
  | 'proveedor'
  | 'alertas'
  | 'acciones';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  visible?: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'codigo', label: 'Código', sortable: true, width: '100px' },
  { key: 'proyecto', label: 'Proyecto', sortable: true, width: '140px' },
  { key: 'creadoPor', label: 'Creado por', sortable: true, width: '130px' },
  { key: 'fechaPedido', label: 'F. Pedido', sortable: true, width: '90px', align: 'center' },
  { key: 'fechaEntregaEstimada', label: 'F. Entrega', sortable: true, width: '90px', align: 'center' },
  { key: 'estado', label: 'Estado', sortable: true, width: '100px', align: 'center' },
  { key: 'montoTotal', label: 'Monto', sortable: true, width: '90px', align: 'right' },
  { key: 'coherencia', label: 'Coherencia', sortable: true, width: '80px', align: 'center' },
  { key: 'acciones', label: 'Acciones', sortable: false, width: '70px', align: 'center' },
];

// ✅ Status badge component - compact version
const StatusBadge: React.FC<{ estado: EstadoPedido }> = ({ estado }) => {
  const variants: Record<string, { color: string; label: string; icon: React.ElementType }> = {
    borrador: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Borrador', icon: Edit },
    enviado: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Enviado', icon: Package },
    confirmado: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmado', icon: CheckCircle },
    parcial: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Parcial', icon: Package },
    en_transito: { color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'En Tránsito', icon: Truck },
    entregado: { color: 'bg-green-50 text-green-700 border-green-200', label: 'Entregado', icon: CheckCircle },
    atendido: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Atendido', icon: CheckCircle },
    cancelado: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelado', icon: X },
    retrasado: { color: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Retrasado', icon: Clock },
  };

  const config = variants[estado] || variants.borrador;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// ✅ Delivery status indicator
const DeliveryStatusIndicator: React.FC<{
  fechaEntregaEstimada?: string;
  fechaEntregaReal?: string;
  estado: EstadoPedido;
}> = ({ fechaEntregaEstimada, fechaEntregaReal, estado }) => {
  if (!fechaEntregaEstimada) return null;

  const now = new Date();
  const estimatedDate = new Date(fechaEntregaEstimada);
  const realDate = fechaEntregaReal ? new Date(fechaEntregaReal) : null;

  // If delivered
  if (estado === 'entregado' && realDate) {
    const isLate = realDate > estimatedDate;
    return (
    <Tooltip>
      <TooltipTrigger>
        <div className={`w-3 h-3 rounded-full ${isLate ? 'bg-red-500' : 'bg-green-500'}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p>{isLate ? 'Entregado con retraso' : 'Entregado a tiempo'}</p>
      </TooltipContent>
    </Tooltip>
  );
  }

  // If not delivered yet
  const daysUntilDelivery = Math.ceil((estimatedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let color = 'bg-green-500';
  let tooltip = 'A tiempo';
  
  if (daysUntilDelivery < 0) {
    color = 'bg-red-500';
    tooltip = `Retrasado ${Math.abs(daysUntilDelivery)} día${Math.abs(daysUntilDelivery) > 1 ? 's' : ''}`;
  } else if (daysUntilDelivery <= 3) {
    color = 'bg-yellow-500';
    tooltip = `${daysUntilDelivery} día${daysUntilDelivery > 1 ? 's' : ''} restante${daysUntilDelivery > 1 ? 's' : ''}`;
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className={`w-3 h-3 rounded-full ${color}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// ✅ Coherence indicator
const CoherenceIndicator: React.FC<{ coherencia?: number }> = ({ coherencia }) => {
  if (coherencia === undefined) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="w-3 h-3 rounded-full bg-gray-300" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Sin validar</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const getColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLabel = (value: number) => {
    if (value >= 80) return 'Buena coherencia';
    if (value >= 60) return 'Coherencia regular';
    return 'Baja coherencia';
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getColor(coherencia)}`} />
          <span className="text-xs">{coherencia}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getLabel(coherencia)}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// ✅ Alerts indicator
const AlertsIndicator: React.FC<{ alertas?: number }> = ({ alertas = 0 }) => {
  if (alertas === 0) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <CheckCircle className="w-4 h-4 text-green-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Sin alertas</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs">{alertas}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{alertas} alerta{alertas > 1 ? 's' : ''} activa{alertas > 1 ? 's' : ''}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// ✅ Inline edit cell
const InlineEditCell: React.FC<{
  value: string | number;
  type?: 'text' | 'number' | 'date';
  onSave: (newValue: string | number) => void;
  disabled?: boolean;
}> = ({ value, type = 'text', onSave, disabled = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  const handleSave = () => {
    const finalValue = type === 'number' ? Number(editValue) : editValue;
    onSave(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  if (disabled || !isEditing) {
    return (
      <div
        className={`cursor-pointer hover:bg-gray-50 p-1 rounded ${disabled ? 'opacity-50' : ''}`}
        onClick={() => !disabled && setIsEditing(true)}
      >
        {type === 'date' && value ? new Date(String(value)).toLocaleDateString('es-PE') : String(value)}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="h-8 text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
      />
      <Button size="sm" variant="ghost" onClick={handleSave}>
        <CheckCircle className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleCancel}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};

// 🚀 OPTIMIZED: Table row component with React.memo
interface PedidoTableRowProps {
  pedido: PedidoEquipo;
  index: number;
  visibleColumns: ColumnKey[];
  allowEdit: boolean;
  allowBulkActions: boolean;
  showCoherenceIndicators: boolean;
  isSelected: boolean;
  onPedidoClick?: (pedido: PedidoEquipo) => void;
  onPedidoEdit?: (pedido: PedidoEquipo) => void;
  onSelectItem: (id: string, checked: boolean) => void;
  onInlineEdit: (id: string, field: keyof PedidoEquipo, value: string | number) => void;
  onViewTracking?: (pedido: PedidoEquipo) => void;
  onContactSupplier?: (pedido: PedidoEquipo) => void;
}

const PedidoEquipoTableRow = memo<PedidoTableRowProps>(({ 
  pedido, 
  index, 
  visibleColumns, 
  allowEdit, 
  allowBulkActions, 
  showCoherenceIndicators, 
  isSelected,
  onPedidoClick, 
  onPedidoEdit, 
  onSelectItem, 
  onInlineEdit,
  onViewTracking,
  onContactSupplier 
}) => {
  // 🎯 Memoized handlers
  const handleRowClick = useCallback(() => {
    onPedidoClick?.(pedido);
  }, [onPedidoClick, pedido]);

  const handleSelectChange = useCallback((checked: boolean) => {
    onSelectItem(pedido.id, checked);
  }, [onSelectItem, pedido.id]);

  const handleEditClick = useCallback(() => {
    onPedidoEdit?.(pedido);
  }, [onPedidoEdit, pedido]);

  // 🎯 Memoized inline edit handlers
  const handleCodigoEdit = useCallback((value: string | number) => {
    onInlineEdit(pedido.id, 'codigo', value);
  }, [onInlineEdit, pedido.id]);

  const handleFechaNecesariaEdit = useCallback((value: string | number) => {
    onInlineEdit(pedido.id, 'fechaNecesaria', value);
  }, [onInlineEdit, pedido.id]);

  // 🎯 Memoized computed values
  const montoTotal = useMemo(() => {
    return pedido.items?.reduce((sum, item) => {
      return sum + (item.costoTotal || 0);
    }, 0) || 0;
  }, [pedido.items]);

  const montoDisplay = useMemo(() => {
    return montoTotal > 0 
      ? `$ ${montoTotal.toLocaleString()}`
      : '-';
  }, [montoTotal]);

  const fechaPedidoDisplay = useMemo(() => {
    return pedido.fechaPedido 
      ? new Date(pedido.fechaPedido).toLocaleDateString('es-PE') 
      : '-';
  }, [pedido.fechaPedido]);

  const fechaNecesariaDisplay = useMemo(() => {
    return pedido.fechaNecesaria 
      ? new Date(pedido.fechaNecesaria).toLocaleDateString('es-PE') 
      : '-';
  }, [pedido.fechaNecesaria]);

  const fechaEntregaDisplay = useMemo(() => {
    return pedido.fechaEntregaEstimada 
      ? new Date(pedido.fechaEntregaEstimada).toLocaleDateString('es-PE') 
      : '-';
  }, [pedido.fechaEntregaEstimada]);

  return (
    <TableRow
      className="hover:bg-blue-50/50 cursor-pointer text-xs"
      onClick={handleRowClick}
    >
      {allowBulkActions && (
        <TableCell className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelectChange}
          />
        </TableCell>
      )}

      {visibleColumns.includes('codigo') && (
        <TableCell className="px-2 py-1.5 font-mono text-xs font-medium">
          {pedido.codigo}
        </TableCell>
      )}

      {visibleColumns.includes('proyecto') && (
        <TableCell className="px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-xs block truncate">{(pedido as any).proyecto?.codigo || 'N/A'}</span>
              <span className="text-[10px] text-muted-foreground truncate block max-w-[100px]">
                {(pedido as any).proyecto?.nombre || ''}
              </span>
            </div>
          </div>
        </TableCell>
      )}

      {visibleColumns.includes('creadoPor') && (
        <TableCell className="px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-700 truncate max-w-[110px]">
              {(pedido as any).user?.name || (pedido as any).user?.email || '-'}
            </span>
          </div>
        </TableCell>
      )}

      {visibleColumns.includes('fechaPedido') && (
        <TableCell className="px-2 py-1.5 text-center text-xs">
          <span className={!pedido.fechaPedido ? 'text-muted-foreground' : ''}>
            {fechaPedidoDisplay}
          </span>
        </TableCell>
      )}

      {visibleColumns.includes('fechaEntregaEstimada') && (
        <TableCell className="px-2 py-1.5 text-center text-xs">
          {pedido.fechaEntregaEstimada ? (
            <span className="text-green-700">{fechaEntregaDisplay}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {visibleColumns.includes('estado') && (
        <TableCell className="px-2 py-1.5 text-center">
          <StatusBadge estado={pedido.estado} />
        </TableCell>
      )}

      {visibleColumns.includes('montoTotal') && (
        <TableCell className="px-2 py-1.5 text-right font-mono text-xs">
          <span className={!montoTotal ? 'text-muted-foreground' : 'font-medium'}>
            {montoDisplay}
          </span>
        </TableCell>
      )}

      {visibleColumns.includes('coherencia') && showCoherenceIndicators && (
        <TableCell className="px-2 py-1.5 text-center">
          <CoherenceIndicator coherencia={(pedido as any).coherencia} />
        </TableCell>
      )}

      {visibleColumns.includes('acciones') && (
        <TableCell className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRowClick}>
                <Eye className="w-3.5 h-3.5 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              {allowEdit && (
                <DropdownMenuItem onClick={handleEditClick}>
                  <Edit className="w-3.5 h-3.5 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Package className="w-3.5 h-3.5 mr-2" />
                Seguimiento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
});

// Set display name for debugging
PedidoEquipoTableRow.displayName = 'PedidoEquipoTableRow';

// ✅ Main component
export const PedidoEquipoTable: React.FC<PedidoEquipoTableProps> = ({
  data,
  loading = false,
  filtros,
  allowEdit = false,
  allowBulkActions = false,
  showCoherenceIndicators = true,
  pagination,
  sorting,
  onEdit,
  onDelete,
  onUpdateStatus,
  onViewTracking,
  onContactSupplier,
  onPedidoClick,
  onPedidoEdit,
  onPedidoUpdate,
  onBulkAction,
  onExport,
  className = '',
}) => {
  // State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: ColumnKey;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    DEFAULT_COLUMNS.filter(col => col.visible !== false).map(col => col.key)
  );

  // 🔁 Sort data
  const sortedPedidos = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle special cases for calculated properties
      if (sortConfig.key === 'lista') {
        aValue = a.lista?.codigo || '';
        bValue = b.lista?.codigo || '';
      } else if (sortConfig.key === 'proyecto') {
        // Usar el nombre del proyecto desde la relación
        aValue = (a as any).proyecto?.nombre || '';
        bValue = (b as any).proyecto?.nombre || '';
      } else if (sortConfig.key === 'descripcion') {
        // Usar observacion como descripción
        aValue = a.observacion || '';
        bValue = b.observacion || '';
      } else if (sortConfig.key === 'montoTotal') {
        // Calcular monto total desde items
        aValue = a.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0;
        bValue = b.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0;
      } else if (sortConfig.key === 'alertas') {
        // Calcular alertas basado en fechas y coherencia
        const aAlertas = (a.coherencia && a.coherencia < 90 ? 1 : 0) + 
                        (a.fechaEntregaReal && new Date(a.fechaEntregaReal) > new Date(a.fechaNecesaria) ? 1 : 0);
        const bAlertas = (b.coherencia && b.coherencia < 90 ? 1 : 0) + 
                        (b.fechaEntregaReal && new Date(b.fechaEntregaReal) > new Date(b.fechaNecesaria) ? 1 : 0);
        aValue = aAlertas;
        bValue = bAlertas;
      } else {
        aValue = a[sortConfig.key as keyof PedidoEquipo];
        bValue = b[sortConfig.key as keyof PedidoEquipo];
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // 🔁 Handle sort
  const handleSort = useCallback((key: ColumnKey) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // 🔁 Handle selection
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? data.map(pedido => pedido.id) : []);
  }, [data]);

  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    setSelectedIds(current => 
      checked 
        ? [...current, id]
        : current.filter(selectedId => selectedId !== id)
    );
  }, []);

  // 🔁 Handle inline edit
  const handleInlineEdit = useCallback(async (id: string, field: keyof PedidoEquipo, value: string | number) => {
    try {
      await onPedidoUpdate?.(id, { [field]: value });
      toast.success('Pedido actualizado correctamente');
    } catch (error) {
      console.error('Error updating pedido:', error);
      toast.error('Error al actualizar pedido');
    }
  }, [onPedidoUpdate]);

  // 🔁 Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos un pedido');
      return;
    }

    try {
      await onBulkAction?.(action, selectedIds);
      setSelectedIds([]);
      toast.success(`Acción "${action}" aplicada a ${selectedIds.length} pedido${selectedIds.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Error al ejecutar acción masiva');
    }
  }, [selectedIds, onBulkAction]);

  // 🔁 Get column config
  const getColumnConfig = useCallback((key: ColumnKey) => {
    return DEFAULT_COLUMNS.find(col => col.key === key);
  }, []);

  if (loading) {
    return (
      <div className={`border rounded-lg bg-white ${className}`}>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`border rounded-lg bg-white p-8 text-center ${className}`}>
        <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-400" />
        <h3 className="text-base font-medium mb-1">No hay pedidos</h3>
        <p className="text-sm text-muted-foreground">
          {filtros ? 'No se encontraron pedidos con los filtros aplicados' : 'Aún no se han creado pedidos'}
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-white overflow-hidden ${className}`}>
      {/* Header with bulk actions */}
      {allowBulkActions && selectedIds.length > 0 && (
        <div className="px-3 py-2 bg-blue-50 border-b flex items-center justify-between">
          <span className="text-xs font-medium text-blue-700">
            {selectedIds.length} seleccionado{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleBulkAction('confirmar')}>
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleBulkAction('exportar')}>
              Exportar
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              {allowBulkActions && (
                <TableHead className="w-10 px-2">
                  <Checkbox
                    checked={selectedIds.length === data.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {visibleColumns.map(columnKey => {
                const config = getColumnConfig(columnKey);
                if (!config) return null;

                return (
                  <TableHead
                    key={columnKey}
                    className={`px-2 py-2 text-xs font-semibold text-gray-700 ${config.align === 'center' ? 'text-center' : config.align === 'right' ? 'text-right' : ''}`}
                    style={{ width: config.width }}
                  >
                    {config.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1 text-xs font-semibold"
                        onClick={() => handleSort(columnKey)}
                      >
                        {config.label}
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    ) : (
                      config.label
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPedidos.map((pedido, index) => (
              <PedidoEquipoTableRow
                key={pedido.id}
                pedido={pedido}
                index={index}
                visibleColumns={visibleColumns}
                allowEdit={allowEdit}
                allowBulkActions={allowBulkActions}
                showCoherenceIndicators={showCoherenceIndicators}
                isSelected={selectedIds.includes(pedido.id)}
                onPedidoClick={onPedidoClick}
                onPedidoEdit={onEdit}
                onSelectItem={handleSelectItem}
                onInlineEdit={handleInlineEdit}
                onViewTracking={onViewTracking}
                onContactSupplier={onContactSupplier}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PedidoEquipoTable;
