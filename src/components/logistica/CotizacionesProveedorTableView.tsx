/**
 * 🎯 CotizacionesProveedorTableView Component
 *
 * Vista de tabla para mostrar cotizaciones de proveedores.
 * Incluye filtros, ordenamiento y acciones por fila.
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo } from 'react';
import { CotizacionProveedor } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Building2,
  FileText,
  Calendar,
  Eye,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  cotizaciones: CotizacionProveedor[];
  onEdit?: (cotizacion: CotizacionProveedor) => void;
  onDelete?: (cotizacion: CotizacionProveedor) => void;
}

// Función para obtener el color del estado
const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'pendiente': return 'bg-orange-100 text-orange-800';
    case 'solicitado': return 'bg-blue-100 text-blue-800';
    case 'cotizado': return 'bg-green-100 text-green-800';
    case 'rechazado': return 'bg-red-100 text-red-800';
    case 'seleccionado': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Función para formatear fecha
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const CotizacionesProveedorTableView: React.FC<Props> = ({
  cotizaciones,
  onEdit,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  // Filtrar cotizaciones
  const filteredCotizaciones = useMemo(() => {
    return cotizaciones.filter(cot => {
      const matchesSearch = searchTerm === '' ||
        cot.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cot.proveedor?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cot.proyecto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEstado = filterEstado === 'todos' || cot.estado === filterEstado;

      return matchesSearch && matchesEstado;
    });
  }, [cotizaciones, searchTerm, filterEstado]);

  // Ordenar cotizaciones
  const sortedCotizaciones = useMemo(() => {
    return [...filteredCotizaciones].sort((a, b) => {
      let aValue: any = a[sortField as keyof CotizacionProveedor];
      let bValue: any = b[sortField as keyof CotizacionProveedor];

      // Manejar campos especiales
      if (sortField === 'proveedor') {
        aValue = a.proveedor?.nombre || '';
        bValue = b.proveedor?.nombre || '';
      } else if (sortField === 'proyecto') {
        aValue = a.proyecto?.nombre || '';
        bValue = b.proyecto?.nombre || '';
      } else if (sortField === 'itemsCount') {
        aValue = a.items?.length || 0;
        bValue = b.items?.length || 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCotizaciones, sortField, sortDirection]);

  // Función para manejar ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Función para obtener ícono de ordenamiento
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, proveedor o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="solicitado">Solicitado</SelectItem>
              <SelectItem value="cotizado">Cotizado</SelectItem>
              <SelectItem value="rechazado">Rechazado</SelectItem>
              <SelectItem value="seleccionado">Seleccionado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-600">
          {sortedCotizaciones.length} de {cotizaciones.length} cotizaciones
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('codigo')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Código {getSortIcon('codigo')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('proveedor')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Proveedor {getSortIcon('proveedor')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('proyecto')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Proyecto {getSortIcon('proyecto')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('itemsCount')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Ítems {getSortIcon('itemsCount')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('estado')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Estado {getSortIcon('estado')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('createdAt')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Creado {getSortIcon('createdAt')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCotizaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron cotizaciones que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : (
                sortedCotizaciones.map((cot) => (
                  <TableRow key={cot.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm font-medium">
                      {cot.codigo}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {cot.proveedor?.nombre || 'Sin proveedor'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={cot.proyecto?.nombre}>
                        {cot.proyecto?.nombre || 'Sin proyecto'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {cot.items?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(cot.estado || 'pendiente')}>
                        {(cot.estado || 'pendiente').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(cot.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/logistica/cotizaciones/${cot.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(cot)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(cot)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CotizacionesProveedorTableView;