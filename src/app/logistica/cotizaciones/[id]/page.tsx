/**
 * 🎯 Cotizacion Proveedor Detail Page
 *
 * Shows detailed view of a specific cotizacion proveedor with its items and audit history.
 * Displays items in table or card view, defaulting to table.
 *
 * Features:
 * - Cotizacion details and statistics
 * - Items list with table/card toggle
 * - Audit history timeline
 * - Status management
 * - Navigation back to cotizaciones list
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getCotizacionProveedorById } from '@/lib/services/cotizacionProveedor';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Building2,
  FileText,
  Calendar,
  Grid3X3,
  Table,
  Edit,
  Package,
  DollarSign,
  TrendingUp,
  Mail
} from 'lucide-react';
import Link from 'next/link';
import type { CotizacionProveedor } from '@/types';
import CotizacionProveedorHistorial from '@/components/logistica/CotizacionProveedorHistorial';
import CotizacionEstadoFlujoBanner from '@/components/logistica/CotizacionEstadoFlujoBanner';
import CotizacionProveedorTabla from '@/components/logistica/CotizacionProveedorTabla';
import ModalAgregarItemCotizacionProveedor from '@/components/logistica/ModalAgregarItemCotizacionProveedor';

// ✅ Page props interface
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// ✅ Loading skeleton component
function CotizacionDetailSkeleton() {
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

      {/* Cotizacion details skeleton */}
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
export default function CotizacionProveedorDetailPage({ params }: PageProps) {
  const { data: session } = useSession();
  const [cotizacion, setCotizacion] = useState<CotizacionProveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [cotizacionId, setCotizacionId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showAgregarItems, setShowAgregarItems] = useState(false);

  useEffect(() => {
    const fetchParams = async () => {
      const resolvedParams = await params;
      setCotizacionId(resolvedParams.id);
    };
    fetchParams();
  }, [params]);

  useEffect(() => {
    if (!cotizacionId) return;

    const fetchData = async () => {
      try {
        const cotizacionData = await getCotizacionProveedorById(cotizacionId);

        if (!cotizacionData) {
          notFound();
          return;
        }

        setCotizacion(cotizacionData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cotizacionId]);

  if (loading) {
    return <CotizacionDetailSkeleton />;
  }

  // ✅ Handle not found
  if (!cotizacion) {
    notFound();
  }

  // ✅ Calculate cotizacion statistics
  const stats = {
    totalItems: cotizacion.items?.length || 0,
    totalCost: cotizacion.items?.reduce((sum, item) =>
      sum + ((item.costoTotal || 0)), 0
    ) || 0,
    selectedItems: cotizacion.items?.filter(item => item.esSeleccionada).length || 0,
    progressPercentage: cotizacion.items?.length ?
      ((cotizacion.items.filter(item => item.esSeleccionada).length / cotizacion.items.length) * 100) : 0
  };

  // ✅ Generate email for quotation request
  const handleSolicitarCotizacion = () => {
    if (!cotizacion.proveedor?.correo) {
      toast.error('El proveedor no tiene correo electrónico registrado');
      return;
    }

    // Generate email content
    const subject = `Solicitud de Cotización - ${cotizacion.codigo}`;

    // Format items as a clean bullet list
    const formatItemsAsTable = (items: any[]) => {
      if (!items || items.length === 0) return 'No hay ítems en esta cotización.';

      return items.map((item) => {
        return `• ${item.descripcion} (${item.codigo}) - ${item.cantidad} ${item.unidad}`;
      }).join('\n');
    };

    const body = `Estimado proveedor ${cotizacion.proveedor.nombre},

Le solicitamos cotización para los siguientes ítems del proyecto ${cotizacion.proyecto?.nombre || 'Proyecto'}:

${formatItemsAsTable(cotizacion.items)}

Proyecto: ${cotizacion.proyecto?.codigo} - ${cotizacion.proyecto?.nombre}
Cotización: ${cotizacion.codigo}

Por favor, envíenos su cotización lo antes posible.

Atentamente,
Equipo de Compras
GYS Control`;

    // Create Gmail compose URL
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cotizacion.proveedor.correo)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open Gmail in new tab
    window.open(gmailUrl, '_blank');
  };

  // ✅ Refresh cotizacion data
  const handleRefreshCotizacion = async () => {
    if (!cotizacionId) return;
    
    try {
      const updated = await getCotizacionProveedorById(cotizacionId);
      if (updated) {
        setCotizacion(updated);
        toast.success('Cotización actualizada');
      }
    } catch (error) {
      console.error('Error refreshing cotizacion:', error);
      toast.error('Error al actualizar la cotización');
    }
  };

  return (
    <div className="space-y-6">
      {/* 📋 Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/logistica" className="hover:text-foreground transition-colors">
          Logística
        </Link>
        <span>/</span>
        <Link href="/logistica/cotizaciones" className="hover:text-foreground transition-colors">
          Cotizaciones
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{cotizacion.codigo}</span>
      </div>

      {/* 🎯 Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/logistica/cotizaciones">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Cotizaciones
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {cotizacion.codigo}
              </h1>
              <p className="text-gray-600">
                Cotización de proveedor - {cotizacion.proyecto?.nombre || 'Proyecto no especificado'}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAgregarItems(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Package className="h-4 w-4 mr-2" />
            Agregar Items
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSolicitarCotizacion}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Mail className="h-4 w-4 mr-2" />
            Solicitar Cotización
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar Cotización
          </Button>
        </div>
      </div>

      {/* 📊 Cotizacion Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Resumen de la Cotización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Proveedor
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {cotizacion.proveedor?.nombre || 'No especificado'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Ítems
              </p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalItems}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Costo Total
              </p>
              <p className="text-lg font-semibold text-gray-900">
                ${stats.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Ítems Seleccionados
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.selectedItems} ({stats.progressPercentage.toFixed(1)}%)
              </p>
            </div>
          </div>
          {cotizacion.proyecto && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Proyecto:</span> {cotizacion.proyecto.nombre}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 📊 Estado del flujo de la cotización */}
      <CotizacionEstadoFlujoBanner
        estado={cotizacion.estado || 'pendiente'}
        cotizacionId={cotizacionId}
        cotizacionNombre={cotizacion.codigo}
        usuarioId={session?.user?.id}
        onUpdated={(nuevoEstado: string) => {
          setCotizacion(prev => prev ? { ...prev, estado: nuevoEstado as any } : null);
        }}
      />

      {/* 🎯 Cotizacion Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Ítems de la Cotización
            <Badge variant="secondary" className="ml-auto">
              {viewMode === 'table' ? 'Vista Tabla' : 'Vista Cards'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<CotizacionDetailSkeleton />}>
            {cotizacion.items && cotizacion.items.length > 0 ? (
              <CotizacionProveedorTabla
                items={cotizacion.items}
                onItemUpdated={(updatedItem) => {
                  setCotizacion(prev => prev ? {
                    ...prev,
                    items: prev.items?.map(item =>
                      item.id === updatedItem.id ? updatedItem : item
                    ) || []
                  } : null);
                }}
                onUpdated={() => {
                  // Refetch cotizacion data
                  if (cotizacionId) {
                    getCotizacionProveedorById(cotizacionId).then(updated => {
                      if (updated) setCotizacion(updated);
                    });
                  }
                }}
              />
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay ítems en esta cotización
                </h3>
                <p className="text-gray-600">
                  Esta cotización aún no tiene ítems asociados.
                </p>
              </div>
            )}
          </Suspense>
        </CardContent>
      </Card>

      {/* 📋 Historial de Auditoría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CotizacionProveedorHistorial
            cotizacionId={cotizacionId}
            entidadTipo="COTIZACION_PROVEEDOR"
          />
        </CardContent>
      </Card>

      {/* 🎯 Modal para Agregar Items */}
      <ModalAgregarItemCotizacionProveedor
        open={showAgregarItems}
        onClose={() => setShowAgregarItems(false)}
        cotizacion={cotizacion}
        proyectoId={cotizacion.proyectoId || ''}
        onAdded={handleRefreshCotizacion}
      />
    </div>
  );
}