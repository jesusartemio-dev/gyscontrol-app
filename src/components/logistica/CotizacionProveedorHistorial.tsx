/**
 * 🎯 CotizacionProveedorHistorial Component
 *
 * Componente para mostrar el historial de auditoría de una cotización de proveedor.
 * Muestra una timeline con todos los cambios realizados.
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useEffect, useState } from 'react';
import { AuditLog } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  User,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  Calendar
} from 'lucide-react';

// Función para obtener el ícono según el tipo de acción
const getActionIcon = (accion: string) => {
  switch (accion) {
    case 'CREAR': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'ACTUALIZAR': return <FileText className="h-4 w-4 text-blue-600" />;
    case 'CAMBIAR_ESTADO': return <TrendingUp className="h-4 w-4 text-purple-600" />;
    case 'ELIMINAR': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'APROBAR': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'RECHAZAR': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'ENVIAR': return <Send className="h-4 w-4 text-blue-600" />;
    default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

// Función para obtener el color del badge según la acción
const getActionColor = (accion: string) => {
  switch (accion) {
    case 'CREAR': return 'bg-green-100 text-green-800';
    case 'ACTUALIZAR': return 'bg-blue-100 text-blue-800';
    case 'CAMBIAR_ESTADO': return 'bg-purple-100 text-purple-800';
    case 'ELIMINAR': return 'bg-red-100 text-red-800';
    case 'APROBAR': return 'bg-green-100 text-green-800';
    case 'RECHAZAR': return 'bg-red-100 text-red-800';
    case 'ENVIAR': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Función para formatear fecha
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface Props {
  cotizacionId: string;
  entidadTipo: string;
}

const CotizacionProveedorHistorial: React.FC<Props> = ({
  cotizacionId,
  entidadTipo
}) => {
  const [historial, setHistorial] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const response = await fetch(`/api/audit?entidadId=${cotizacionId}&entidadTipo=${entidadTipo}`);
        if (response.ok) {
          const data = await response.json();
          setHistorial(data);
        }
      } catch (error) {
        console.error('Error fetching audit history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (cotizacionId) {
      fetchHistorial();
    }
  }, [cotizacionId, entidadTipo]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (historial.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay historial disponible
        </h3>
        <p className="text-gray-600">
          Aún no se han registrado cambios para esta cotización.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {historial.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-sm">
              {getActionIcon(entry.accion)}
            </div>
            {index < historial.length - 1 && (
              <div className="w-px h-8 bg-gray-200 mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(entry.accion)}>
                        {entry.accion.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.descripcion}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="h-3 w-3" />
                    {entry.usuario?.name || 'Usuario desconocido'}
                  </div>
                </div>

                {/* Mostrar cambios si existen */}
                {entry.cambios && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-2">Cambios realizados:</p>
                    <div className="space-y-1">
                      {Object.entries(JSON.parse(entry.cambios)).map(([campo, cambio]: [string, any]) => (
                        <div key={campo} className="text-xs">
                          <span className="font-medium text-gray-700">{campo}:</span>
                          <span className="text-red-600 ml-1">"{cambio.anterior || 'vacío'}"</span>
                          <span className="text-gray-500 mx-1">→</span>
                          <span className="text-green-600">"{cambio.nuevo || 'vacío'}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mostrar metadata adicional si existe */}
                {entry.metadata && (
                  <div className="mt-2 text-xs text-gray-500">
                    {JSON.parse(entry.metadata).tipoEntidad && (
                      <span>Tipo: {JSON.parse(entry.metadata).tipoEntidad}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CotizacionProveedorHistorial;