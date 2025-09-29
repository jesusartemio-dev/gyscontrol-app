/**
 * 🎯 CotizacionesProveedorCardView Component
 *
 * Vista de cards para mostrar cotizaciones de proveedores.
 * Diseño moderno con información resumida y acciones rápidas.
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo } from 'react';
import { CotizacionProveedor } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Filter,
  Building2,
  FileText,
  Calendar,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Send
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
    case 'pendiente': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'solicitado': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cotizado': return 'bg-green-100 text-green-800 border-green-200';
    case 'rechazado': return 'bg-red-100 text-red-800 border-red-200';
    case 'seleccionado': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Función para obtener el ícono del estado
const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case 'pendiente': return <Clock className="h-4 w-4" />;
    case 'solicitado': return <Send className="h-4 w-4" />;
    case 'cotizado': return <CheckCircle className="h-4 w-4" />;
    case 'rechazado': return <XCircle className="h-4 w-4" />;
    case 'seleccionado': return <CheckCircle className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
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

const CotizacionesProveedorCardView: React.FC<Props> = ({
  cotizaciones,
  onEdit,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
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

  return (
    <div className="space-y-6">
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
          {filteredCotizaciones.length} de {cotizaciones.length} cotizaciones
        </div>
      </div>

      {/* Grid de cards */}
      {filteredCotizaciones.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron cotizaciones
          </h3>
          <p className="text-gray-600">
            No hay cotizaciones que coincidan con los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCotizaciones.map((cot) => (
            <Card key={cot.id} className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      {cot.codigo}
                    </CardTitle>
                    <Badge
                      className={`${getEstadoColor(cot.estado || 'pendiente')} flex items-center gap-1 w-fit`}
                    >
                      {getEstadoIcon(cot.estado || 'pendiente')}
                      {(cot.estado || 'pendiente').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Proveedor */}
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {cot.proveedor?.nombre || 'Sin proveedor'}
                  </span>
                </div>

                {/* Proyecto */}
                <div className="flex items-start gap-2 text-sm">
                  <Package className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-900">Proyecto:</span>
                    <p className="text-gray-600 truncate" title={cot.proyecto?.nombre}>
                      {cot.proyecto?.nombre || 'Sin proyecto'}
                    </p>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {cot.items?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Ítems</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">
                      {formatDate(cot.createdAt)}
                    </div>
                    <div className="text-xs text-gray-500">Creado</div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between pt-2 border-t">
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

                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={`/logistica/cotizaciones/${cot.id}`}>
                      Ver Detalle
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CotizacionesProveedorCardView;