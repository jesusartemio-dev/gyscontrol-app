/**
 * 📋 ListaEquipoTable Component - OPTIMIZED with React.memo
 * 
 * Tabla avanzada para gestión de listas de equipos con funcionalidades
 * de filtrado, ordenamiento, edición inline y acciones masivas.
 * 
 * 🚀 FASE 2 Optimizations:
 * - React.memo en componentes principales
 * - useMemo para cálculos pesados
 * - useCallback para funciones estables
 * - Memoización de componentes de fila
 * - Separación de estado UI vs datos
 * 
 * Features:
 * - Tabla responsive con ordenamiento
 * - Edición inline de campos clave
 * - Indicadores de coherencia y alertas
 * - Acciones masivas (aprobar, rechazar, etc.)
 * - Drill-down a pedidos relacionados
 * - Exportación y configuración de columnas
 * 
 * @author GYS Team
 * @version 2.0.0 - Performance Optimized
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
  Calendar,
  CheckCircle,
  ChevronDown,
  Download,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Package,
  ShoppingCart,
  TrendingUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
import type { ListaEquipo, EstadoListaEquipo } from '@/types/modelos';
import type { ListaEquipoDetail } from '@/types/master-detail';
import type { FiltrosListaEquipo } from '@/types/aprovisionamiento';

// ✅ Props interface
interface ListaEquipoTableProps {
  listas: ListaEquipoDetail[];
  loading?: boolean;
  filtros?: FiltrosListaEquipo;
  allowEdit?: boolean;
  allowBulkActions?: boolean;
  showCoherenceIndicators?: boolean;
  onListaClick?: (lista: ListaEquipoDetail) => void;
  onListaEdit?: (lista: ListaEquipoDetail) => void;
  onListaUpdate?: (id: string, updates: Partial<ListaEquipo>) => Promise<void>;
  onBulkAction?: (action: string, listaIds: string[]) => Promise<void>;
  onExport?: (format: 'excel' | 'pdf') => void;
  className?: string;
}

// ✅ Column configuration
type ColumnKey = 
  | 'codigo'
  | 'proyecto'
  | 'descripcion'
  | 'fechaNecesaria'
  | 'fechaAprobacionFinal'
  | 'estado'
  | 'montoTotal'
  | 'coherencia'
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

// 🎯 Memoized constants - evita recreación en cada render
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'codigo', label: 'Código', sortable: true, width: '120px' },
  { key: 'proyecto', label: 'Proyecto', sortable: true, width: '200px' },
  { key: 'descripcion', label: 'Descripción', sortable: false, width: '250px' },
  { key: 'fechaNecesaria', label: 'Fecha Necesaria', sortable: true, width: '140px', align: 'center' },
  { key: 'fechaAprobacionFinal', label: 'Fecha Aprobación', sortable: true, width: '140px', align: 'center' },
  { key: 'estado', label: 'Estado', sortable: true, width: '120px', align: 'center' },
  { key: 'montoTotal', label: 'Monto Total', sortable: true, width: '130px', align: 'right' },
  { key: 'coherencia', label: 'Coherencia', sortable: true, width: '100px', align: 'center' },
  { key: 'alertas', label: 'Alertas', sortable: false, width: '80px', align: 'center' },
  { key: 'acciones', label: 'Acciones', sortable: false, width: '100px', align: 'center' },
];

// 🎯 Memoized status variants - evita recreación
const STATUS_VARIANTS = {
  borrador: { variant: 'secondary' as const, label: 'Borrador' },
  por_revisar: { variant: 'outline' as const, label: 'Por Revisar' },
  por_cotizar: { variant: 'outline' as const, label: 'Por Cotizar' },
  por_validar: { variant: 'outline' as const, label: 'Por Validar' },
  por_aprobar: { variant: 'outline' as const, label: 'Por Aprobar' },
  aprobado: { variant: 'default' as const, label: 'Aprobado' },
  rechazado: { variant: 'destructive' as const, label: 'Rechazado' },
} as const;

// 🚀 OPTIMIZED: Status badge component with React.memo
const StatusBadge = memo<{ estado: EstadoListaEquipo }>(({ estado }) => {
  const config = STATUS_VARIANTS[estado] || STATUS_VARIANTS.borrador;
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
});
StatusBadge.displayName = 'StatusBadge';

// 🚀 OPTIMIZED: Coherence indicator with React.memo
const CoherenceIndicator = memo<{ coherencia?: number }>(({ coherencia }) => {
  // 🎯 Memoized color calculation
  const colorConfig = useMemo(() => {
    if (coherencia === undefined) {
      return { color: 'bg-gray-300', label: 'Sin validar' };
    }
    
    if (coherencia >= 80) return { color: 'bg-green-500', label: 'Buena coherencia' };
    if (coherencia >= 60) return { color: 'bg-yellow-500', label: 'Coherencia regular' };
    return { color: 'bg-red-500', label: 'Baja coherencia' };
  }, [coherencia]);

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

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${colorConfig.color}`} />
          <span className="text-xs">{coherencia}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{colorConfig.label}</p>
      </TooltipContent>
    </Tooltip>
  );
});
CoherenceIndicator.displayName = 'CoherenceIndicator';

// 🚀 OPTIMIZED: Alerts indicator with React.memo
const AlertsIndicator = memo<{ alertas?: number }>(({ alertas = 0 }) => {
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
});
AlertsIndicator.displayName = 'AlertsIndicator';

// 🚀 OPTIMIZED: Inline edit cell with React.memo
interface InlineEditCellProps {
  value: string | number;
  type?: 'text' | 'number' | 'date';
  onSave: (newValue: string | number) => void;
  disabled?: boolean;
}

const InlineEditCell = memo<InlineEditCellProps>(({ value, type = 'text', onSave, disabled = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  // 🎯 Memoized handlers
  const handleSave = useCallback(() => {
    const finalValue = type === 'number' ? Number(editValue) : editValue;
    onSave(finalValue);
    setIsEditing(false);
  }, [editValue, type, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(String(value));
    setIsEditing(false);
  }, [value]);

  const handleClick = useCallback(() => {
    if (!disabled) setIsEditing(true);
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  }, [handleSave, handleCancel]);

  // 🎯 Memoized display value
  const displayValue = useMemo(() => {
    if (type === 'date' && value) {
      return new Date(String(value)).toLocaleDateString();
    }
    return String(value);
  }, [value, type]);

  if (disabled || !isEditing) {
    return (
      <div
        className={`cursor-pointer hover:bg-gray-50 p-1 rounded ${disabled ? 'opacity-50' : ''}`}
        onClick={handleClick}
      >
        {displayValue}
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
        onKeyDown={handleKeyDown}
      />
      <Button size="sm" variant="ghost" onClick={handleSave}>
        <CheckCircle className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleCancel}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
});
InlineEditCell.displayName = 'InlineEditCell';

// 🚀 OPTIMIZED: Table row component with React.memo
interface TableRowProps {
  lista: ListaEquipoDetail;
  index: number;
  visibleColumns: ColumnKey[];
  allowEdit: boolean;
  allowBulkActions: boolean;
  showCoherenceIndicators: boolean;
  isSelected: boolean;
  onListaClick?: (lista: ListaEquipoDetail) => void;
  onListaEdit?: (lista: ListaEquipoDetail) => void;
  onSelectItem: (id: string, checked: boolean) => void;
  onInlineEdit: (id: string, field: keyof ListaEquipoDetail, value: string | number) => void;
}

const ListaEquipoTableRow = memo<TableRowProps>(({ 
  lista, 
  index, 
  visibleColumns, 
  allowEdit, 
  allowBulkActions, 
  showCoherenceIndicators, 
  isSelected,
  onListaClick, 
  onListaEdit, 
  onSelectItem, 
  onInlineEdit 
}) => {
  // 🎯 Memoized handlers
  const handleRowClick = useCallback(() => {
    onListaClick?.(lista);
  }, [onListaClick, lista]);

  const handleSelectChange = useCallback((checked: boolean) => {
    onSelectItem(lista.id, checked);
  }, [onSelectItem, lista.id]);

  const handleEditClick = useCallback(() => {
    onListaEdit?.(lista);
  }, [onListaEdit, lista]);

  // 🎯 Memoized inline edit handlers
  const handleCodigoEdit = useCallback((value: string | number) => {
    onInlineEdit(lista.id, 'codigo', value);
  }, [onInlineEdit, lista.id]);

  const handleFechaEdit = useCallback((value: string | number) => {
    onInlineEdit(lista.id, 'fechaNecesaria', value);
  }, [onInlineEdit, lista.id]);

  // 🎯 Memoized computed values
  const montoDisplay = useMemo(() => {
    // Calculate total from items if available
    const montoTotal = lista.items?.reduce((total, item) => {
      const precio = item.precioElegido || item.presupuesto || 0;
      const cantidad = item.cantidad || 0;
      return total + (precio * cantidad);
    }, 0) || lista.stats?.costoTotal || 0;
    
    return montoTotal > 0
      ? `USD ${montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '-';
  }, [lista.items, lista.stats?.costoTotal]);

  const fechaNecesariaDisplay = useMemo(() => {
    return lista.fechaNecesaria 
      ? new Date(lista.fechaNecesaria).toLocaleDateString() 
      : '-';
  }, [lista.fechaNecesaria]);

  const fechaAprobacionDisplay = useMemo(() => {
    return lista.fechaAprobacionFinal 
      ? new Date(lista.fechaAprobacionFinal).toLocaleDateString() 
      : '-';
  }, [lista.fechaAprobacionFinal]);

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
              value={lista.codigo}
              onSave={handleCodigoEdit}
            />
          ) : (
            lista.codigo
          )}
        </TableCell>
      )}
      
      {visibleColumns.includes('proyecto') && (
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-medium">{lista.proyecto?.nombre}</span>
          </div>
        </TableCell>
      )}
      
      {visibleColumns.includes('descripcion') && (
        <TableCell>
          <div className="max-w-xs truncate" title={lista.nombre}>
            {lista.nombre}
          </div>
        </TableCell>
      )}
      
      {visibleColumns.includes('fechaNecesaria') && (
        <TableCell className="text-center">
          {allowEdit ? (
            <InlineEditCell
              value={lista.fechaNecesaria || ''}
              type="date"
              onSave={handleFechaEdit}
            />
          ) : (
            fechaNecesariaDisplay
          )}
        </TableCell>
      )}
      
      {visibleColumns.includes('fechaAprobacionFinal') && (
        <TableCell className="text-center">
          <span className={!lista.fechaAprobacionFinal ? 'text-muted-foreground' : ''}>
            {fechaAprobacionDisplay}
          </span>
        </TableCell>
      )}
      
      {visibleColumns.includes('estado') && (
        <TableCell className="text-center">
          <StatusBadge estado={lista.estado} />
        </TableCell>
      )}
      
      {visibleColumns.includes('montoTotal') && (
        <TableCell className="text-right font-mono">
          <span className={montoDisplay === '-' ? 'text-muted-foreground' : ''}>
            {montoDisplay}
          </span>
        </TableCell>
      )}
      
      {visibleColumns.includes('coherencia') && showCoherenceIndicators && (
        <TableCell className="text-center">
          <CoherenceIndicator coherencia={lista.coherencia} />
        </TableCell>
      )}
      
      {visibleColumns.includes('alertas') && (
        <TableCell className="text-center">
          <AlertsIndicator alertas={lista.stats?.itemsRechazados || 0} />
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
                <ShoppingCart className="w-4 h-4 mr-2" />
                Ver pedidos
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Generar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
});
ListaEquipoTableRow.displayName = 'ListaEquipoTableRow';

// 🚀 OPTIMIZED: Main component with React.memo
export const ListaEquipoTable = memo<ListaEquipoTableProps>(({ 
  listas,
  loading = false,
  filtros,
  allowEdit = false,
  allowBulkActions = false,
  showCoherenceIndicators = true,
  onListaClick,
  onListaEdit,
  onListaUpdate,
  onBulkAction,
  onExport,
  className = '',
}) => {
  // 🎯 UI State (separado de datos según FASE 2)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: ColumnKey;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    DEFAULT_COLUMNS.filter(col => col.visible !== false).map(col => col.key)
  );

  // 🚀 OPTIMIZED: Memoized sorted data
  const sortedListas = useMemo(() => {
    if (!sortConfig) return listas;

    return [...listas].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle special cases
      switch (sortConfig.key) {
        case 'proyecto':
          aValue = a.proyecto?.nombre || '';
          bValue = b.proyecto?.nombre || '';
          break;
        case 'descripcion':
          aValue = a.nombre || '';
          bValue = b.nombre || '';
          break;
        case 'montoTotal':
          aValue = a.stats?.costoTotal || 0;
          bValue = b.stats?.costoTotal || 0;
          break;
        case 'alertas':
          aValue = a.stats?.itemsRechazados || 0;
          bValue = b.stats?.itemsRechazados || 0;
          break;
        default:
          aValue = a[sortConfig.key as keyof ListaEquipoDetail];
          bValue = b[sortConfig.key as keyof ListaEquipoDetail];
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [listas, sortConfig]);

  // 🚀 OPTIMIZED: Memoized selection state
  const selectionState = useMemo(() => {
    const isAllSelected = listas.length > 0 && selectedIds.length === listas.length;
    const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < listas.length;
    return { isAllSelected, isPartiallySelected };
  }, [listas.length, selectedIds.length]);

  // 🚀 OPTIMIZED: Stable callbacks
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

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? listas.map(lista => lista.id) : []);
  }, [listas]);

  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    setSelectedIds(current => 
      checked 
        ? [...current, id]
        : current.filter(selectedId => selectedId !== id)
    );
  }, []);

  const handleInlineEdit = useCallback(async (id: string, field: keyof ListaEquipoDetail, value: string | number) => {
    try {
      await onListaUpdate?.(id, { [field]: value });
      toast.success('Lista actualizada correctamente');
    } catch (error) {
      console.error('Error updating lista:', error);
      toast.error('Error al actualizar lista');
    }
  }, [onListaUpdate]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos una lista');
      return;
    }

    try {
      await onBulkAction?.(action, selectedIds);
      setSelectedIds([]);
      toast.success(`Acción "${action}" aplicada a ${selectedIds.length} lista${selectedIds.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Error al ejecutar acción masiva');
    }
  }, [selectedIds, onBulkAction]);

  // 🚀 OPTIMIZED: Memoized column config getter
  const getColumnConfig = useCallback((key: ColumnKey) => {
    return DEFAULT_COLUMNS.find(col => col.key === key);
  }, []);

  // 🎯 Loading state
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

  // 🎯 Empty state
  if (listas.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No hay listas de equipos</h3>
          <p className="text-muted-foreground mb-4">
            {filtros ? 'No se encontraron listas con los filtros aplicados' : 'Aún no se han creado listas de equipos'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        {/* Header with bulk actions */}
        {allowBulkActions && selectedIds.length > 0 && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedIds.length} lista{selectedIds.length > 1 ? 's' : ''} seleccionada{selectedIds.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('aprobar')}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('rechazar')}
                >
                  Rechazar
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
                        checked={selectionState.isAllSelected}
                        ref={undefined}
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
                        className={`${
                          config.align === 'center' 
                            ? 'text-center' 
                            : config.align === 'right' 
                            ? 'text-right' 
                            : ''
                        }`}
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
                {sortedListas.map((lista, index) => (
                  <ListaEquipoTableRow
                    key={lista.id}
                    lista={lista}
                    index={index}
                    visibleColumns={visibleColumns}
                    allowEdit={allowEdit}
                    allowBulkActions={allowBulkActions}
                    showCoherenceIndicators={showCoherenceIndicators}
                    isSelected={selectedIds.includes(lista.id)}
                    onListaClick={onListaClick}
                    onListaEdit={onListaEdit}
                    onSelectItem={handleSelectItem}
                    onInlineEdit={handleInlineEdit}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

ListaEquipoTable.displayName = 'ListaEquipoTable';

export default ListaEquipoTable;
