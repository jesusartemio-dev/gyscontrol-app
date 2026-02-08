/**
 * 🎯 ListaEquipoDetailView Component - Minimalist Version
 * Focuses on showing equipment list items clearly
 */

'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ListaEquipo, ListaEquipoItem, Proyecto, EstadoListaEquipo } from '@/types/modelos'
import { useListaEquipoDetail } from '@/hooks/useListaEquipoDetail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Package,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  FileText,
  ShoppingCart,
  Target,
  User,
  X,
  ChevronRight,
  History
} from 'lucide-react';
import ListaEquipoItemList from '@/components/equipos/ListaEquipoItemList';
import ListaEquipoEditModal from '@/components/equipos/ListaEquipoEditModal';
import ListaEquipoTimeline from '@/components/equipos/ListaEquipoTimeline';
import ListaEstadoFlujoBanner from '@/components/equipos/ListaEstadoFlujoBanner';
import ListaEquipoHistorial from '@/components/equipos/ListaEquipoHistorial';
import PedidoDesdeListaModal from '@/components/equipos/PedidoDesdeListaModal';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { createPedidoDesdeListaContextual } from '@/lib/services/pedidoEquipo';

interface ListaEquipoDetailViewProps {
  proyectoId: string;
  listaId: string;
  initialLista?: ListaEquipo;
  initialItems?: ListaEquipoItem[];
  initialProyecto?: Proyecto;
}

const statusConfig: Record<EstadoListaEquipo, { label: string; className: string; icon: typeof Clock }> = {
  borrador: { label: 'Borrador', className: 'bg-gray-100 text-gray-700', icon: Clock },
  enviada: { label: 'Enviada', className: 'bg-indigo-100 text-indigo-700', icon: FileText },
  por_revisar: { label: 'Por Revisar', className: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  por_cotizar: { label: 'Por Cotizar', className: 'bg-orange-100 text-orange-700', icon: DollarSign },
  por_validar: { label: 'Por Validar', className: 'bg-purple-100 text-purple-700', icon: FileText },
  por_aprobar: { label: 'Por Aprobar', className: 'bg-amber-100 text-amber-700', icon: User },
  aprobada: { label: 'Aprobada', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-700', icon: X },
  completada: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle }
};

// Skeleton minimalista
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-20 ml-auto" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="border rounded-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-2 border-b last:border-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

const ListaEquipoDetailView: React.FC<ListaEquipoDetailViewProps> = ({
  proyectoId,
  listaId,
  initialLista,
  initialItems = [],
  initialProyecto
}) => {
  const router = useRouter();

  const {
    lista,
    items,
    proyecto,
    loading,
    refreshItems,
    error
  } = useListaEquipoDetail({
    listaId,
    proyectoId,
    initialLista,
    initialItems,
    initialProyecto
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleListaUpdated = async () => {
    try {
      await refreshItems();
      toast.success('Lista actualizada');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Error al actualizar');
    }
  };

  const handleRefreshItems = useCallback(async () => {
    try {
      await refreshItems();
      toast.success('Items actualizados');
    } catch (error) {
      console.error('Error refreshing items:', error);
      toast.error('Error al actualizar');
    }
  }, [refreshItems]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.estado === 'aprobado').length;
    const verificados = items.filter(item => item.verificado).length;
    const totalCost = items.reduce((sum, item) => sum + (item.costoElegido || 0), 0);
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return { totalItems, completedItems, verificados, totalCost, progress };
  }, [items]);

  if (loading) return <LoadingSkeleton />;

  if (error || (!loading && (!lista || !proyecto))) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
        <h2 className="text-base font-semibold mb-1">Error al cargar datos</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {error || 'No se pudo cargar la lista'}
        </p>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="h-7 text-xs">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Volver
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[lista?.estado || 'borrador'] || statusConfig.borrador;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div className="space-y-1">
          {/* Navegación mínima */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Volver
          </button>

          {/* Título con icono */}
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <h1 className="text-lg font-semibold">{lista?.nombre || 'Lista de Equipos'}</h1>
            {lista?.codigo && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                {lista.codigo}
              </Badge>
            )}
          </div>

          {/* Stats inline */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge className={cn('text-[10px] px-1.5 py-0 font-normal', statusInfo.className)}>
              <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
              {statusInfo.label}
            </Badge>
            <span className="text-gray-300">|</span>
            <span>{stats.totalItems} items</span>
            <span className="text-gray-300">|</span>
            <span className={stats.verificados === stats.totalItems ? 'text-green-600' : ''}>{stats.verificados}/{stats.totalItems} verificados</span>
            <span className="text-gray-300">|</span>
            <span className="text-green-600">{stats.completedItems} aprobados</span>
            <span className="text-gray-300">|</span>
            <span className="font-mono text-green-600 font-medium">{formatCurrency(stats.totalCost)}</span>
            {lista?.fechaNecesaria && (
              <>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {formatDate(lista.fechaNecesaria)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            className="h-7 text-xs"
          >
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>

          {lista && (
            <PedidoDesdeListaModal
              lista={{ ...lista, listaEquipoItem: items }}
              proyectoId={proyectoId}
              responsableId={lista.responsableId || 'default-user'}
              onCreated={async (payload) => {
                try {
                  const result = await createPedidoDesdeListaContextual(payload);
                  if (result) {
                    toast.success('Pedido creado');
                    await refreshItems();
                    router.push(`/proyectos/${proyectoId}/equipos/pedidos/${result.id}`);
                    return result;
                  }
                  return null;
                } catch (error) {
                  console.error('Error creating pedido:', error);
                  toast.error('Error al crear pedido');
                  return null;
                }
              }}
              onRefresh={refreshItems}
              trigger={
                <Button size="sm" className="h-7 text-xs bg-orange-600 hover:bg-orange-700" disabled={items.length === 0}>
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Crear Pedido
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Status Flow Banner - Compacto */}
      {lista && (
        <ListaEstadoFlujoBanner
          estado={lista.estado}
          listaId={lista.id}
          totalItems={items.length}
          itemsVerificados={items.filter(i => i.verificado).length}
          onUpdated={() => handleRefreshItems()}
        />
      )}

      {/* Items List - El foco principal */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ListaEquipoItemList
          listaId={listaId}
          proyectoId={proyectoId}
          listaCodigo={lista?.codigo || ''}
          listaNombre={lista?.nombre || ''}
          items={items}
          editable={true}
          onCreated={handleRefreshItems}
          onDeleted={handleRefreshItems}
        />
      </Suspense>

      {/* Información Adicional - Colapsable */}
      <div className="space-y-1 pt-3 border-t">
        {/* Timeline Colapsable */}
        <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2 text-xs">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-orange-600" />
                Timeline
              </span>
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', showTimeline && 'rotate-90')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {lista && <ListaEquipoTimeline lista={lista} className="w-full" />}
          </CollapsibleContent>
        </Collapsible>

        {/* Historial Colapsable */}
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2 text-xs">
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-orange-600" />
                Historial de Cambios
              </span>
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', showHistory && 'rotate-90')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ListaEquipoHistorial listaId={listaId} className="w-full" />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Modal de Edición */}
      <ListaEquipoEditModal
        lista={lista}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdated={handleListaUpdated}
      />
    </div>
  );
};

export default ListaEquipoDetailView;
