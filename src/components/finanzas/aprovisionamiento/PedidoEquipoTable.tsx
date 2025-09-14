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
  { key: 'codigo', label: 'Código', sortable: true, width: '120px' },
  { key: 'proyecto', label: 'Proyecto', sortable: true, width: '150px' },
  { key: 'fechaPedido', label: 'F. Pedido', sortable: true, width: '110px', align: 'center' },
  { key: 'fechaNecesaria', label: 'F. Necesaria', sortable: true, width: '120px', align: 'center' }, // ✅ Critical for procurement planning
  { key: 'fechaEntregaEstimada', label: 'F. Entrega Est.', sortable: true, width: '130px', align: 'center' },
  { key: 'fechaEntregaReal', label: 'F. Entrega Real', sortable: true, width: '130px', align: 'center' },
  { key: 'estado', label: 'Estado', sortable: true, width: '120px', align: 'center' },
  { key: 'montoTotal', label: 'Monto Total', sortable: true, width: '130px', align: 'right' },
  { key: 'coherencia', label: 'Coherencia', sortable: true, width: '100px', align: 'center' },
  { key: 'alertas', label: 'Alertas', sortable: false, width: '80px', align: 'center' },
  { key: 'acciones', label: 'Acciones', sortable: false, width: '100px', align: 'center' },
];

// ✅ Status badge component
const StatusBadge: React.FC<{ estado: EstadoPedido }> = ({ estado }) => {
  const variants = {
    borrador: { variant: 'secondary' as const, label: 'Borrador', icon: Edit },
    enviado: { variant: 'outline' as const, label: 'Enviado', icon: Package },
    confirmado: { variant: 'default' as const, label: 'Confirmado', icon: CheckCircle },
    parcial: { variant: 'secondary' as const, label: 'Parcial', icon: Package },
    en_transito: { variant: 'secondary' as const, label: 'En Tránsito', icon: Truck },
    entregado: { variant: 'default' as const, label: 'Entregado', icon: CheckCircle },
    atendido: { variant: 'default' as const, label: 'Atendido', icon: CheckCircle },
    cancelado: { variant: 'destructive' as const, label: 'Cancelado', icon: X },
    retrasado: { variant: 'destructive' as const, label: 'Retrasado', icon: Clock },
  };

  const config = variants[estado] || variants.borrador;
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
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
        {type === 'date' && value ? new Date(String(value)).toLocaleDateString() : String(value)}
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
      ? `PEN ${montoTotal.toLocaleString()}`
      : '-';
  }, [montoTotal]);

  const fechaPedidoDisplay = useMemo(() => {
    return pedido.fechaPedido 
      ? new Date(pedido.fechaPedido).toLocaleDateString() 
      : '-';
  }, [pedido.fechaPedido]);

  const fechaNecesariaDisplay = useMemo(() => {
    return pedido.fechaNecesaria 
      ? new Date(pedido.fechaNecesaria).toLocaleDateString() 
      : '-';
  }, [pedido.fechaNecesaria]);

  const fechaEntregaDisplay = useMemo(() => {
    return pedido.fechaEntregaEstimada 
      ? new Date(pedido.fechaEntregaEstimada).toLocaleDateString() 
      : '-';
  }, [pedido.fechaEntregaEstimada]);

  return (
    <TableRow
      className="hover:bg-gray-50 cursor-pointer"
      onClick={handleRowClick}
    >
      {allowBulkActions && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelectChange}
          />
        </TableCell>
      )}
      
      {visibleColumns.includes('codigo') && (
        <TableCell className="font-mono text-sm">
          {allowEdit ? (
            <InlineEditCell
              value={pedido.codigo}
              onSave={handleCodigoEdit}
            />
          ) : (
            pedido.codigo
          )}
        </TableCell>
      )}
      
      {visibleColumns.includes('proyecto') && (
        <TableCell>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <div className="flex flex-col">
              <span className="font-medium text-sm">{(pedido as any).proyecto?.codigo || 'N/A'}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={(pedido as any).proyecto?.nombre}>
                {(pedido as any).proyecto?.nombre || 'Sin proyecto'}
              </span>
            </div>
          </div>
        </TableCell>
      )}
      
      {visibleColumns.includes('descripcion') && (
        <TableCell>
          <div className="max-w-xs truncate" title={pedido.observacion}>
            {pedido.observacion || 'Sin descripción'}
          </div>
        </TableCell>
      )}
      
      {visibleColumns.includes('fechaPedido') && (
        <TableCell className="text-center">
          <span className={!pedido.fechaPedido ? 'text-muted-foreground' : ''}>
            {fechaPedidoDisplay}
          </span>
        </TableCell>
      )}
      
      {visibleColumns.includes('fechaNecesaria') && (
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            {pedido.fechaNecesaria ? (
              <>
                <Calendar className="w-4 h-4 text-orange-500" />
                {allowEdit ? (
                  <InlineEditCell
                    value={pedido.fechaNecesaria}
                    type="date"
                    onSave={handleFechaNecesariaEdit}
                  />
                ) : (
                  <span className="font-medium text-orange-700">
                    {fechaNecesariaDisplay}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>
      )}
      
      {visibleColumns.includes('fechaEntregaEstimada') && (
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            {pedido.fechaEntregaEstimada ? (
              <>
                <Truck className="w-4 h-4 text-green-500" />
                <span className="font-medium text-green-700">
                  {fechaEntregaDisplay}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>
      )}
      
      {visibleColumns.includes('estado') && (
        <TableCell className="text-center">
          <StatusBadge estado={pedido.estado} />
        </TableCell>
      )}
      
      {visibleColumns.includes('montoTotal') && (
        <TableCell className="text-right font-mono">
          <span className={!montoTotal ? 'text-muted-foreground' : ''}>
            {montoDisplay}
          </span>
        </TableCell>
      )}
      
      {visibleColumns.includes('proveedor') && (
        <TableCell>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-500" />
            <span className="font-medium">
              {(pedido as any).proveedor?.nombre || 'Sin asignar'}
            </span>
          </div>
        </TableCell>
      )}
      
      {visibleColumns.includes('coherencia') && showCoherenceIndicators && (
        <TableCell className="text-center">
          <CoherenceIndicator coherencia={(pedido as any).coherencia} />
        </TableCell>
      )}
      
      {visibleColumns.includes('acciones') && (
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRowClick}>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              {allowEdit && (
                <DropdownMenuItem onClick={handleEditClick}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Package className="w-4 h-4 mr-2" />
                Ver seguimiento
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Generar reporte
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
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No hay pedidos de equipos</h3>
          <p className="text-muted-foreground mb-4">
            {filtros ? 'No se encontraron pedidos con los filtros aplicados' : 'Aún no se han creado pedidos de equipos'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header with bulk actions */}
      {allowBulkActions && selectedIds.length > 0 && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedIds.length} pedido{selectedIds.length > 1 ? 's' : ''} seleccionado{selectedIds.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('confirmar')}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('cancelar')}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('exportar')}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {allowBulkActions && (
                  <TableHead className="w-12">
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
                      className={`${config.align === 'center' ? 'text-center' : config.align === 'right' ? 'text-right' : ''}`}
                      style={{ width: config.width }}
                    >
                      {config.sortable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 p-0 font-medium"
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
      </CardContent>
    </Card>
  );
};

export default PedidoEquipoTable;
