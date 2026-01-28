/**
 * 📋 ListView Component
 * 
 * Vista de lista/tabla para el timeline de aprovisionamiento.
 * Muestra los datos en formato tabular con filtros y ordenamiento.
 * 
 * Features:
 * - Tabla responsive con datos de timeline
 * - Ordenamiento por columnas
 * - Filtros inline
 * - Estados visuales y badges
 * - Acciones por fila
 * - Paginación
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Eye,
  Edit,
  Package,
  ShoppingCart,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Types
import type { GanttItem, TimelineData } from '@/types/aprovisionamiento';

// ✅ Props interface
interface ListViewProps {
  data: TimelineData;
  loading?: boolean;
  onItemClick?: (item: GanttItem) => void;
  onItemEdit?: (item: GanttItem) => void;
  className?: string;
}

// ✅ Sort configuration
type SortField = 'codigo' | 'titulo' | 'fechaInicio' | 'fechaFin' | 'amount' | 'estado' | 'progreso';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// ✅ Get status badge variant
const getStatusBadgeVariant = (estado: string) => {
  switch (estado.toLowerCase()) {
    case 'completado':
    case 'entregado':
    case 'aprobado':
      return 'default';
    case 'en_proceso':
    case 'en_revision':
    case 'pendiente':
      return 'secondary';
    case 'retrasado':
    case 'vencido':
    case 'rechazado':
      return 'destructive';
    case 'borrador':
    case 'creado':
      return 'outline';
    default:
      return 'secondary';
  }
};

// ✅ Get type icon
const getTypeIcon = (tipo: string) => {
  switch (tipo) {
    case 'lista':
      return <Package className="w-4 h-4" />;
    case 'pedido':
      return <ShoppingCart className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

// ✅ Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// ✅ Format date
const formatDate = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return format(dateObj, 'dd/MM/yyyy', { locale: es });
};

// ✅ Main component
export const ListView: React.FC<ListViewProps> = ({
  data,
  loading = false,
  onItemClick,
  onItemEdit,
  className = '',
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'fechaInicio',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // ✅ Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.items.filter((item) => {
      const matchesSearch = 
        item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.label.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.estado === statusFilter;
      const matchesType = typeFilter === 'all' || item.tipo === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'codigo':
          aValue = a.label;
          bValue = b.label;
          break;
        case 'titulo':
          aValue = a.titulo;
          bValue = b.titulo;
          break;
        case 'fechaInicio':
          aValue = a.fechaInicio instanceof Date ? a.fechaInicio.getTime() : new Date(a.fechaInicio).getTime();
          bValue = b.fechaInicio instanceof Date ? b.fechaInicio.getTime() : new Date(b.fechaInicio).getTime();
          break;
        case 'fechaFin':
          aValue = a.fechaFin instanceof Date ? a.fechaFin.getTime() : new Date(a.fechaFin).getTime();
          bValue = b.fechaFin instanceof Date ? b.fechaFin.getTime() : new Date(b.fechaFin).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'estado':
          aValue = a.estado;
          bValue = b.estado;
          break;
        case 'progreso':
          aValue = a.progreso || 0;
          bValue = b.progreso || 0;
          break;
        default:
          aValue = a.fechaInicio.getTime();
          bValue = b.fechaInicio.getTime();
      }

      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [data.items, searchTerm, statusFilter, typeFilter, sortConfig]);

  // ✅ Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ✅ Handle sort
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ✅ Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4" /> : 
      <ArrowDown className="w-4 h-4" />;
  };

  // ✅ Get unique statuses and types for filters
  const uniqueStatuses = Array.from(new Set(data.items.map(item => item.estado)));
  const uniqueTypes = Array.from(new Set(data.items.map(item => item.tipo)));

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Vista de Lista
        </CardTitle>
        <CardDescription>
          {filteredAndSortedData.length} elementos de {data.items.length} totales
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por código o título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(type)}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('codigo')}
                    className="h-8 p-0 font-medium"
                  >
                    Código
                    {getSortIcon('codigo')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('titulo')}
                    className="h-8 p-0 font-medium"
                  >
                    Título
                    {getSortIcon('titulo')}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('fechaInicio')}
                    className="h-8 p-0 font-medium"
                  >
                    F. Inicio
                    {getSortIcon('fechaInicio')}
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('fechaFin')}
                    className="h-8 p-0 font-medium"
                  >
                    F. Fin
                    {getSortIcon('fechaFin')}
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('amount')}
                    className="h-8 p-0 font-medium"
                  >
                    Monto
                    {getSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('estado')}
                    className="h-8 p-0 font-medium"
                  >
                    Estado
                    {getSortIcon('estado')}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('progreso')}
                    className="h-8 p-0 font-medium"
                  >
                    Progreso
                    {getSortIcon('progreso')}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => {
                // Build link to entity detail page
                const detailUrl = item.tipo === 'lista'
                  ? `/finanzas/aprovisionamiento/listas/${item.id}`
                  : `/finanzas/aprovisionamiento/pedidos/${item.id}`;

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/50 cursor-pointer group"
                    onClick={() => onItemClick?.(item)}
                  >
                    <TableCell className="font-mono text-sm">
                      <Link
                        href={detailUrl}
                        className="text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.codigo || item.label}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.titulo}</div>
                        {item.descripcion && (
                          <div className="text-sm text-muted-foreground">
                            {item.descripcion}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.tipo)}
                        <span className="capitalize">{item.tipo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(item.fechaInicio)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(item.fechaFin)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.estado)}>
                        {item.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(item.progreso || 0)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {item.progreso || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={detailUrl} onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {onItemEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onItemEdit(item);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} de{' '}
              {filteredAndSortedData.length} elementos
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron elementos</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Intenta ajustar los filtros para ver más resultados'
                : 'No hay elementos disponibles en este momento'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ListView;
