'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAuditDescription, getAuditHistory } from '@/lib/services/audit-client';
import { formatDate } from '@/lib/utils';
import type { AuditLog } from '@/types/modelos';

interface ListaEquipoHistorialProps {
  listaId: string;
  className?: string;
}

const actionColors: Record<string, string> = {
  CREAR: 'bg-green-100 text-green-700',
  ACTUALIZAR: 'bg-blue-100 text-blue-700',
  ELIMINAR: 'bg-red-100 text-red-700',
  CAMBIAR_ESTADO: 'bg-purple-100 text-purple-700',
  APROBAR: 'bg-emerald-100 text-emerald-700',
  RECHAZAR: 'bg-orange-100 text-orange-700'
};

const ListaEquipoHistorial: React.FC<ListaEquipoHistorialProps> = ({
  listaId,
  className
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

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

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedItems(newExpanded);
  };

  const displayedLogs = showAll ? auditLogs : auditLogs.slice(0, 5);

  const formatChanges = (cambios: string | null | undefined) => {
    if (!cambios) return null;
    try {
      const parsed = JSON.parse(cambios);
      const entries = Object.entries(parsed);
      if (entries.length === 0) return null;
      return (
        <div className="space-y-1">
          {entries.map(([field, change]: [string, any]) => {
            const fieldNames: Record<string, string> = { nombre: 'Nombre', fechaNecesaria: 'Fecha Necesaria' };
            return (
              <div key={field} className="text-[11px] text-gray-600">
                <span className="font-medium">{fieldNames[field] || field}:</span>{' '}
                <span className="font-mono bg-red-50 px-0.5 rounded text-red-600 text-[10px]">{change.anterior || 'vacío'}</span>
                {' → '}
                <span className="font-mono bg-green-50 px-0.5 rounded text-green-600 text-[10px]">{change.nuevo || 'vacío'}</span>
              </div>
            );
          })}
        </div>
      );
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className={className}>
        <p className="text-xs text-muted-foreground text-center py-4">
          No hay cambios registrados aún
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted-foreground">{auditLogs.length} registros</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadAuditHistory}
          disabled={loading}
          className="h-6 px-2 text-[10px]"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-1">
          <AnimatePresence>
            {displayedLogs.map((log) => {
              const isExpanded = expandedItems.has(log.id);
              const actionColor = actionColors[log.accion] || 'bg-gray-100 text-gray-700';

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative flex items-start gap-2.5 group"
                >
                  {/* Dot */}
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <User className="w-2.5 h-2.5 text-gray-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={`${actionColor} text-[9px] px-1 py-0 font-normal`}>
                        {log.accion.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {log.usuario.name || log.usuario.email}
                      </span>
                      <span className="text-[10px] text-gray-300 font-mono ml-auto">
                        {formatDate(log.createdAt)}
                      </span>
                      <button
                        onClick={() => toggleExpanded(log.id)}
                        className="p-0 text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    <p className="text-xs text-gray-700 mt-0.5 line-clamp-1">
                      {formatAuditDescription(log)}
                    </p>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-1.5 pl-2 border-l-2 border-gray-100 space-y-1">
                        <p className="text-[11px] text-gray-500">{log.descripcion}</p>
                        {log.cambios && formatChanges(log.cambios)}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Show more/less */}
      {auditLogs.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-blue-600 hover:text-blue-800 mt-1"
        >
          {showAll ? 'Mostrar menos' : `Ver todos (${auditLogs.length - 5} más)`}
        </button>
      )}
    </div>
  );
};

export default ListaEquipoHistorial;
