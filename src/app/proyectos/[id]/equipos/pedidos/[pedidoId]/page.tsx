/**
 * 🎯 Project Pedido Detail Page
 *
 * Shows detailed view of a specific pedido with its items and audit history.
 * Displays items in table or card view, defaulting to table.
 *
 * Features:
 * - Pedido details and statistics
 * - Items list with table/card toggle
 * - Audit history timeline
 * - Status management
 * - Navigation back to pedidos list
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getProyectoById } from '@/lib/services/proyecto';
import { getPedidoEquipoById } from '@/lib/services/pedidoEquipo';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Package,
  DollarSign,
  Calendar,
  Grid3X3,
  Table,
  Edit,
  Truck,
  User,
  Target
} from 'lucide-react';
import Link from 'next/link';
import type { Proyecto, PedidoEquipo } from '@/types';
import PedidoEquipoHistorial from '@/components/equipos/PedidoEquipoHistorial';
import PedidoEstadoFlujoBanner from '@/components/equipos/PedidoEstadoFlujoBanner';
import PedidoEquipoEditModal from '@/components/equipos/PedidoEquipoEditModal';
import { formatCurrency, formatDate } from '@/lib/utils';

// ✅ Page props interface
interface PageProps {
  params: Promise<{
    id: string;
    pedidoId: string;
  }>;
}

// ✅ Loading skeleton component
function PedidoDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Pedido details skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items list skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ Main page component
export default function ProjectPedidoDetailPage({ params }: PageProps) {
  const { data: session } = useSession();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [pedido, setPedido] = useState<PedidoEquipo | null>(null);
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState<string>('');
  const [pedidoId, setPedidoId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const fetchParams = async () => {
      const resolvedParams = await params;
      setProyectoId(resolvedParams.id);
      setPedidoId(resolvedParams.pedidoId);
    };
    fetchParams();
  }, [params]);

  useEffect(() => {
    if (!proyectoId || !pedidoId) return;

    const fetchData = async () => {
      try {
        const [proyectoData, pedidoData] = await Promise.all([
          getProyectoById(proyectoId),
          getPedidoEquipoById(pedidoId)
        ]);

        if (!proyectoData || !pedidoData) {
          notFound();
          return;
        }

        setProyecto(proyectoData);
        setPedido(pedidoData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [proyectoId, pedidoId]);

  if (loading) {
    return <PedidoDetailSkeleton />;
  }

  // ✅ Handle not found
  if (!proyecto || !pedido) {
    notFound();
  }

  // ✅ Calculate pedido statistics
  const stats = {
    totalItems: pedido.items?.length || 0,
    totalCost: pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0,
    deliveredItems: pedido.items?.filter(item => item.estado === 'entregado').length || 0,
    progressPercentage: pedido.items?.length ?
      ((pedido.items.filter(item => item.estado === 'entregado').length / pedido.items.length) * 100) : 0
  };

  return (
    <div className="space-y-6">
      {/* 📋 Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/proyectos" className="hover:text-foreground transition-colors">
          Proyectos
        </Link>
        <span>/</span>
        <Link
          href={`/proyectos/${proyectoId}`}
          className="hover:text-foreground transition-colors"
        >
          {proyecto.nombre}
        </Link>
        <span>/</span>
        <Link
          href={`/proyectos/${proyectoId}/equipos/pedidos`}
          className="hover:text-foreground transition-colors"
        >
          Pedidos
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{pedido.codigo}</span>
      </div>

      {/* 🎯 Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href={`/proyectos/${proyectoId}/equipos/pedidos`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Pedidos
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {pedido.codigo}
              </h1>
              <p className="text-gray-600">
                Detalle del pedido - {proyecto.nombre}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8"
            >
              <Table className="h-4 w-4 mr-2" />
              Tabla
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="h-8"
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Cards
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* 📊 Estado del Pedido */}
      <PedidoEstadoFlujoBanner
        estado={pedido.estado || 'borrador'}
        pedidoId={pedidoId}
        pedidoNombre={pedido.codigo}
        usuarioId={session?.user?.id}
        onUpdated={(nuevoEstado: string) => {
          setPedido(prev => prev ? { ...prev, estado: nuevoEstado as any } : null);
        }}
      />

      {/* 📊 Pedido Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Resumen del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Items Totales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Costo Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalCost)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Items Entregados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deliveredItems}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Progreso</p>
              <p className="text-2xl font-bold text-gray-900">{stats.progressPercentage.toFixed(1)}%</p>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Responsable:</span>
                <span>{pedido.responsable?.name || 'Sin asignar'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Fecha Pedido:</span>
                <span>{formatDate(pedido.fechaPedido)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Fecha Necesaria:</span>
                <span>{pedido.fechaNecesaria ? formatDate(pedido.fechaNecesaria) : 'No especificada'}</span>
              </div>
            </div>
            <div className="space-y-2">
              {pedido.fechaEntregaEstimada && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Entrega Estimada:</span>
                  <span>{formatDate(pedido.fechaEntregaEstimada)}</span>
                </div>
              )}
              {pedido.fechaEntregaReal && (
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Entrega Real:</span>
                  <span>{formatDate(pedido.fechaEntregaReal)}</span>
                </div>
              )}
            </div>
          </div>

          {pedido.observacion && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">{pedido.observacion}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🎯 Pedido Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Items del Pedido
            <Badge variant="secondary" className="ml-auto">
              {pedido.items?.length || 0} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PedidoDetailSkeleton />}>
            {pedido.items && pedido.items.length > 0 ? (
              <div className="space-y-4">
                {/* Table View */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Código</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Descripción</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">Unidad</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">Cantidad Pedida</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">Cantidad Atendida</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">Estado</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">Costo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pedido.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {item.codigo}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {item.descripcion}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            {item.unidad}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-blue-600">
                            {item.cantidadPedida}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-green-600">
                            {item.cantidadAtendida || 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant={
                                item.estado === 'entregado' ? 'default' :
                                item.estado === 'parcial' ? 'secondary' :
                                item.estado === 'atendido' ? 'outline' : 'destructive'
                              }
                            >
                              {item.estado}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600">
                            {item.costoTotal ? formatCurrency(item.costoTotal) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Items</p>
                      <p className="text-xl font-bold text-gray-900">{pedido.items.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Entregados</p>
                      <p className="text-xl font-bold text-green-600">
                        {pedido.items.filter(item => item.estado === 'entregado').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Parciales</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {pedido.items.filter(item => item.estado === 'parcial').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pendientes</p>
                      <p className="text-xl font-bold text-red-600">
                        {pedido.items.filter(item => item.estado === 'pendiente').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay items en este pedido</p>
              </div>
            )}
          </Suspense>
        </CardContent>
      </Card>

      {/* 📋 Historial de Auditoría */}
      <PedidoEquipoHistorial
        pedidoId={pedidoId}
        className="w-full"
      />

      {/* ✏️ Modal de Edición */}
      <PedidoEquipoEditModal
        pedido={pedido}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdated={(pedidoActualizado) => {
          setPedido(pedidoActualizado);
        }}
        fields={['fechaNecesaria', 'observacion']}
      />
    </div>
  );
}