/**
 * 📊 TimelineFiltersWrapper Component
 * 
 * Client component wrapper para manejar los filtros del timeline.
 * Permite interactividad en server components mediante URL search params.
 * 
 * Features:
 * - Manejo de filtros mediante URL search params
 * - Navegación programática con Next.js router
 * - Sincronización de estado con URL
 * - Compatibilidad con server components
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TimelineFilters } from './TimelineFilters';
import type { FiltrosTimeline } from '@/types/aprovisionamiento';

interface TimelineFiltersWrapperProps {
  filtros: FiltrosTimeline;
  proyectos?: Array<{ id: string; nombre: string; codigo: string }>;
  loading?: boolean;
  className?: string;
  showQuickFilters?: boolean;
  showAdvancedConfig?: boolean;
  compact?: boolean;
}

export const TimelineFiltersWrapper: React.FC<TimelineFiltersWrapperProps> = ({
  filtros,
  proyectos = [],
  loading = false,
  className = '',
  showQuickFilters = true,
  showAdvancedConfig = true,
  compact = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ Handle filter changes by updating URL search params
  const handleFiltrosChange = (nuevosFiltros: FiltrosTimeline) => {
    const params = new URLSearchParams(searchParams.toString());

    // 🔁 Update URL parameters based on new filters
    if (nuevosFiltros.fechaInicio) {
      params.set('fechaInicio', new Date(nuevosFiltros.fechaInicio).toISOString().split('T')[0]);
    } else {
      params.delete('fechaInicio');
    }

    if (nuevosFiltros.fechaFin) {
      params.set('fechaFin', new Date(nuevosFiltros.fechaFin).toISOString().split('T')[0]);
    } else {
      params.delete('fechaFin');
    }

    if (nuevosFiltros.proyectoIds && nuevosFiltros.proyectoIds.length > 0) {
      params.set('proyecto', nuevosFiltros.proyectoIds[0]); // Solo el primer proyecto por simplicidad
    } else {
      params.delete('proyecto');
    }

    if (nuevosFiltros.tipoVista !== 'gantt') {
      params.set('vista', nuevosFiltros.tipoVista);
    } else {
      params.delete('vista');
    }

    if (nuevosFiltros.agrupacion !== 'proyecto') {
      params.set('agrupacion', nuevosFiltros.agrupacion);
    } else {
      params.delete('agrupacion');
    }

    if (nuevosFiltros.validarCoherencia) {
      params.set('coherencia', 'true');
    } else {
      params.delete('coherencia');
    }

    if (nuevosFiltros.soloAlertas) {
      params.set('alertas', 'true');
    } else {
      params.delete('alertas');
    }

    // 📡 Navigate to updated URL
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.push(newUrl);
  };

  return (
    <TimelineFilters
      filtros={filtros}
      onFiltrosChange={handleFiltrosChange}
      proyectos={proyectos}
      compact={compact}
      loading={loading}
      className={className}
      showQuickFilters={showQuickFilters}
      showAdvancedConfig={showAdvancedConfig}
    />
  );
};

export default TimelineFiltersWrapper;
