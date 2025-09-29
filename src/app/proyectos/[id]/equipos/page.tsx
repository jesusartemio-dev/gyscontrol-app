/**
 * 🎯 Project Equipment Page
 * 
 * Displays equipment from commercial quotes (ProyectoEquipo, ProyectoEquipoItem).
 * This follows the Template -> Quote -> Project flow.
 * 
 * Features:
 * - Equipment groups from quotes
 * - Editable items within groups
 * - Cost tracking and progress
 * - Integration with technical lists creation
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getProyectoById } from '@/lib/services/proyecto';
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo';
import EquiposTableView from '@/components/proyectos/equipos/EquiposTableView';
import EquiposCardView from '@/components/proyectos/equipos/EquiposCardView';
import CrearListaMultipleModal from '@/components/proyectos/equipos/CrearListaMultipleModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Package,
  DollarSign,
  Calendar,
  ArrowLeft,
  Settings,
  Download,
  Share2,
  List,
  BarChart3,
  Plus,
  Grid3X3,
  Table
} from 'lucide-react';
import Link from 'next/link';
import type { Proyecto, ProyectoEquipoCotizado } from '@/types';
import { useDebugPanel, DebugPanel } from '@/components/debug/DebugPanel';

// ✅ Page props interface
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// ✅ Loading skeleton component
function EquipmentPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Equipment list skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* 🐛 Debug Panel for monitoring re-renders */}
      <DebugPanel position="top-right" />
    </div>
  );
}

// ✅ Main page component
export default function ProjectEquipmentPage({ params }: PageProps) {
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [equipos, setEquipos] = useState<ProyectoEquipoCotizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<ProyectoEquipoCotizado | null>(null);

  // 🐛 Debug panel for monitoring re-renders
  const { DebugPanel } = useDebugPanel();

  useEffect(() => {
    const fetchParams = async () => {
      const resolvedParams = await params;
      setProyectoId(resolvedParams.id);
    };
    fetchParams();
  }, [params]);

  useEffect(() => {
    if (!proyectoId) return;

    const fetchData = async () => {
      try {
        const [proyectoData, equiposData] = await Promise.all([
          getProyectoById(proyectoId),
          getProyectoEquipos(proyectoId)
        ]);
        
        if (!proyectoData) {
          notFound();
          return;
        }
        
        setProyecto(proyectoData);
        setEquipos(equiposData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [proyectoId]);

  if (loading) {
    return <EquipmentPageSkeleton />;
  }

  // ✅ Handle not found
  if (!proyecto) {
    notFound();
  }

  // ✅ Handle modal opening
  const handleOpenModal = (equipo: ProyectoEquipoCotizado) => {
    setSelectedEquipo(equipo);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEquipo(null);
  };

  const handleDistribucionCompletada = (listaId: string) => {
    console.log('Lista creada:', listaId);
    // TODO: Refresh data or navigate to list
  };

  // ✅ Calculate statistics
  const stats = {
    totalGroups: equipos.length,
    totalItems: equipos.reduce((sum, equipo) => sum + (equipo.items?.length || 0), 0),
    totalCost: equipos.reduce((sum, equipo) => 
      sum + (equipo.items?.reduce((itemSum, item) => 
        itemSum + (item.precioCliente * item.cantidad), 0
      ) || 0), 0
    ),
    avgProgress: equipos.length > 0 
      ? equipos.reduce((sum, equipo) => {
          const totalItems = equipo.items?.length || 0;
          const itemsCompletados = equipo.items?.filter(item => 
            item.estado === 'en_lista' || item.estado === 'reemplazado'
          ).length || 0;
          const progreso = totalItems > 0 ? (itemsCompletados / totalItems) * 100 : 0;
          return sum + progreso;
        }, 0) / equipos.length 
      : 0
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
        <span className="text-foreground font-medium">Equipos</span>
      </div>

      {/* 🎯 Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Equipos del Proyecto
              </h1>
              <p className="text-gray-600">
                Equipos provenientes de la cotización comercial
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
          <Button asChild>
            <Link href={`/proyectos/${proyectoId}/equipos/listas`}>
              <List className="h-4 w-4 mr-2" />
              Ver Listas Técnicas
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* 📊 Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Grupos de Equipos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalGroups}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalItems}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Costo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${stats.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Progreso Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgProgress.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🎯 Equipment List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Equipos Técnicos del Proyecto
            <Badge variant="secondary" className="ml-auto">
              {viewMode === 'table' ? 'Vista Tabla' : 'Vista Cards'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<EquipmentPageSkeleton />}>
            {viewMode === 'table' ? (
              <EquiposTableView
                equipos={equipos}
                proyectoId={proyectoId}
                onCreateList={handleOpenModal}
                onEquipoChange={(equipoId, changes) => {
                  console.log('Equipo changed:', equipoId, changes);
                  // TODO: Implement equipment update logic
                }}
                onEquipoDelete={(equipoId) => {
                  console.log('Equipo deleted:', equipoId);
                  // TODO: Implement equipment delete logic
                }}
              />
            ) : (
              <EquiposCardView
                equipos={equipos}
                proyectoId={proyectoId}
                onCreateList={handleOpenModal}
                onEquipoChange={(equipoId, changes) => {
                  console.log('Equipo changed:', equipoId, changes);
                  // TODO: Implement equipment update logic
                }}
                onEquipoDelete={(equipoId) => {
                  console.log('Equipo deleted:', equipoId);
                  // TODO: Implement equipment delete logic
                }}
              />
            )}
          </Suspense>
        </CardContent>
      </Card>

      {/* Modal for creating lists */}
      {selectedEquipo && (
        <CrearListaMultipleModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          proyectoEquipo={selectedEquipo}
          proyectoId={proyectoId}
          onDistribucionCompletada={handleDistribucionCompletada}
        />
      )}
    </div>
  );
}
