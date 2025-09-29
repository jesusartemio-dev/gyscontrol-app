/**
 * 🎯 Project Equipment Detail Page
 *
 * Shows detailed view of a specific equipment group with its items.
 * Displays items in table or card view, defaulting to table.
 *
 * Features:
 * - Equipment group details
 * - Items list with table/card toggle
 * - Filters and search
 * - Navigation back to equipment list
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getProyectoById } from '@/lib/services/proyecto';
import { getProyectoEquipoById } from '@/lib/services/proyectoEquipo';
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
  Eye,
  Edit,
  Trash2,
  List
} from 'lucide-react';
import Link from 'next/link';
import type { Proyecto, ProyectoEquipoCotizado } from '@prisma/client';

// Extended type that includes items relation
type ProyectoEquipoCotizadoWithItems = ProyectoEquipoCotizado & {
  items: import('@prisma/client').ProyectoEquipoCotizadoItem[]
}
import EquipoItemsTableView from '@/components/proyectos/equipos/EquipoItemsTableView';
import EquipoItemsCardView from '@/components/proyectos/equipos/EquipoItemsCardView';
import CrearListaMultipleModal from '@/components/proyectos/equipos/CrearListaMultipleModal';

// ✅ Page props interface
interface PageProps {
  params: Promise<{
    id: string;
    equipoId: string;
  }>;
}

// ✅ Loading skeleton component
function EquipmentDetailSkeleton() {
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

      {/* Equipment details skeleton */}
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
export default function ProjectEquipmentDetailPage({ params }: PageProps) {
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [equipo, setEquipo] = useState<ProyectoEquipoCotizadoWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState<string>('');
  const [equipoId, setEquipoId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showCreateListModal, setShowCreateListModal] = useState(false);

  useEffect(() => {
    const fetchParams = async () => {
      const resolvedParams = await params;
      setProyectoId(resolvedParams.id);
      setEquipoId(resolvedParams.equipoId);
    };
    fetchParams();
  }, [params]);

  useEffect(() => {
    if (!proyectoId || !equipoId) return;

    const fetchData = async () => {
      try {
        const [proyectoData, equipoData] = await Promise.all([
          getProyectoById(proyectoId),
          getProyectoEquipoById(equipoId)
        ]);

        if (!proyectoData || !equipoData) {
          notFound();
          return;
        }

        setProyecto(proyectoData as any); // TODO: Fix Proyecto type mismatch
        setEquipo(equipoData as unknown as ProyectoEquipoCotizadoWithItems);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [proyectoId, equipoId]);

  if (loading) {
    return <EquipmentDetailSkeleton />;
  }

  // ✅ Handle not found
  if (!proyecto || !equipo) {
    notFound();
  }

  // ✅ Handle list creation completion
  const handleListCreationCompleted = (listaId: string) => {
    console.log('Lista creada desde detalle:', listaId);
    // TODO: Refresh data or navigate to list
    setShowCreateListModal(false);
  };

  // ✅ Calculate equipment statistics
  const stats = {
    totalItems: equipo.items?.length || 0,
    totalCost: equipo.items?.reduce((sum, item) =>
      sum + (item.precioCliente * item.cantidad), 0
    ) || 0,
    completedItems: equipo.items?.filter(item =>
      item.estado === 'en_lista' || item.estado === 'reemplazado'
    ).length || 0,
    progressPercentage: equipo.items?.length ?
      ((equipo.items.filter(item =>
        item.estado === 'en_lista' || item.estado === 'reemplazado'
      ).length / equipo.items.length) * 100) : 0
  };

  return (
    <>
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
          href={`/proyectos/${proyectoId}/equipos`}
          className="hover:text-foreground transition-colors"
        >
          Equipos
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{equipo.nombre}</span>
      </div>

      {/* 🎯 Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href={`/proyectos/${proyectoId}/equipos`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Equipos
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {equipo.nombre}
              </h1>
              <p className="text-gray-600">
                Detalle del equipo - {proyecto.nombre}
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
            onClick={() => setShowCreateListModal(true)}
          >
            <List className="h-4 w-4 mr-2" />
            Crear Lista
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar Equipo
          </Button>
        </div>
      </div>

      {/* 📊 Equipment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Resumen del Equipo
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
                ${stats.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Items Completados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedItems}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Progreso</p>
              <p className="text-2xl font-bold text-gray-900">{stats.progressPercentage.toFixed(1)}%</p>
            </div>
          </div>
          {equipo.descripcion && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">{equipo.descripcion}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🎯 Equipment Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Items del Equipo
            <Badge variant="secondary" className="ml-auto">
              {viewMode === 'table' ? 'Vista Tabla' : 'Vista Cards'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<EquipmentDetailSkeleton />}>
            {viewMode === 'table' ? (
              <EquipoItemsTableView
                equipo={equipo}
                onItemChange={(items) => {
                  console.log('Item change:', items);
                  // TODO: Implement item update logic
                }}
              />
            ) : (
              <EquipoItemsCardView
                equipo={equipo}
                onItemChange={(items) => {
                  console.log('Item change:', items);
                  // TODO: Implement item update logic
                }}
              />
            )}
          </Suspense>
        </CardContent>
      </Card>

      {/* Modal for creating lists */}
      <CrearListaMultipleModal
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        proyectoEquipo={equipo}
        proyectoId={proyectoId}
        onDistribucionCompletada={handleListCreationCompleted}
      />
    </div>
  </>
  );
}