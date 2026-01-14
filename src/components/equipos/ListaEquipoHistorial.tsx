/**
 * 🎯 ListaEquipoHistorial Component
 *
 * Componente para mostrar el historial de cambios de una lista de equipos.
 * Incluye timeline visual y detalles de cada cambio realizado.
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAuditDescription, getAuditHistory } from '@/lib/services/audit-client';
import { formatDate } from '@/lib/utils';
import type { AuditLog } from '@/types/modelos';

// ✅ Props interface
interface ListaEquipoHistorialProps {
  listaId: string;
  className?: string;
}

// ✅ Configuración de colores por tipo de acción
const actionColors = {
  CREAR: 'bg-green-100 text-green-800 border-green-200',
  ACTUALIZAR: 'bg-blue-100 text-blue-800 border-blue-200',
  ELIMINAR: 'bg-red-100 text-red-800 border-red-200',
  CAMBIAR_ESTADO: 'bg-purple-100 text-purple-800 border-purple-200',
  APROBAR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECHAZAR: 'bg-orange-100 text-orange-800 border-orange-200'
};

// ✅ Componente principal
const ListaEquipoHistorial: React.FC<ListaEquipoHistorialProps> = ({
  listaId,
  className
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // ✅ Cargar historial al montar
  useEffect(() => {
    loadAuditHistory();
  }, [listaId]);

  const loadAuditHistory = async () => {
    try {
      setLoading(true);
      const logs = await getAuditHistory('LISTA_EQUIPO', listaId, 100);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit history:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Toggle expanded item
  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedItems(newExpanded);
  };

  // ✅ Mostrar solo primeros 5 inicialmente
  const displayedLogs = showAll ? auditLogs : auditLogs.slice(0, 5);

  // ✅ Función para formatear cambios de manera legible
  const formatChanges = (cambios: string | null | undefined) => {
    if (!cambios) return null;

    try {
      const parsed = JSON.parse(cambios);
      const entries = Object.entries(parsed);

      if (entries.length === 0) return null;

      return (
        <div className="space-y-2">
          {entries.map(([field, change]: [string, any]) => {
            const fieldNames: Record<string, string> = {
              nombre: 'Nombre',
              fechaNecesaria: 'Fecha Necesaria'
            };

            const displayName = fieldNames[field] || field;
            const anterior = change.anterior || 'vacío';
            const nuevo = change.nuevo || 'vacío';

            return (
              <div key={field} className="flex items-start gap-2 text-sm">
                <span className="font-medium text-gray-700 min-w-0 flex-shrink-0">
                  {displayName}:
                </span>
                <span className="text-gray-600">
                  cambió de <span className="font-mono bg-red-50 px-1 rounded text-red-700">"{anterior}"</span> a <span className="font-mono bg-green-50 px-1 rounded text-green-700">"{nuevo}"</span>
                </span>
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      return <div className="text-sm text-gray-500">Error al formatear cambios</div>;
    }
  };

  // ✅ Función para formatear metadata de manera legible
  const formatMetadata = (metadata: string | null | undefined) => {
    if (!metadata) return null;

    try {
      const parsed = JSON.parse(metadata);

      return (
        <div className="space-y-1 text-sm">
          {parsed.proyectoNombre && (
            <div><span className="font-medium">Proyecto:</span> {parsed.proyectoNombre}</div>
          )}
          {parsed.responsableNombre && (
            <div><span className="font-medium">Responsable:</span> {parsed.responsableNombre}</div>
          )}
        </div>
      );
    } catch (error) {
      return <div className="text-sm text-gray-500">Error al formatear información adicional</div>;
    }
  };

  // ✅ Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ✅ Empty state
  if (auditLogs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay cambios registrados aún</p>
            <p className="text-sm">Los cambios en esta lista aparecerán aquí</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Cambios
            <Badge variant="secondary" className="ml-2">
              {auditLogs.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAuditHistory}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            <AnimatePresence>
              {displayedLogs.map((log, index) => {
                const isExpanded = expandedItems.has(log.id);
                const actionColor = actionColors[log.accion as keyof typeof actionColors] ||
                  'bg-gray-100 text-gray-800 border-gray-200';

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start gap-4"
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={actionColor}>
                                {log.accion.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatAuditDescription(log)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(log.id)}
                            className="ml-2"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* User info */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <User className="w-4 h-4" />
                          <span>{log.usuario.name || log.usuario.email}</span>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t pt-3 mt-3 space-y-3">
                                {/* Raw description */}
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    Descripción
                                  </label>
                                  <p className="text-sm text-gray-800 mt-1">
                                    {log.descripcion}
                                  </p>
                                </div>

                                {/* Changes details */}
                                {log.cambios && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                      Cambios Realizados
                                    </label>
                                    <div className="mt-1 p-3 bg-white rounded border">
                                      {formatChanges(log.cambios)}
                                    </div>
                                  </div>
                                )}

                                {/* Metadata */}
                                {log.metadata && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                      Información Adicional
                                    </label>
                                    <div className="mt-1 p-3 bg-white rounded border">
                                      {formatMetadata(log.metadata)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Show more/less button */}
          {auditLogs.length > 5 && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="gap-2"
              >
                {showAll ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Ver todos ({auditLogs.length - 5} más)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ListaEquipoHistorial;