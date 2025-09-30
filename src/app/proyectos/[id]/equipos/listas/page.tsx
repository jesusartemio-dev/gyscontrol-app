/**
 * 🎯 Equipment Lists Master View Page - Enhanced UX/UI
 * 
 * Modern Master-Detail pattern implementation with enhanced UX/UI:
 * - Professional design with Framer Motion animations
 * - Responsive layout with modern components
 * - Enhanced breadcrumb navigation
 * - Real-time statistics with visual indicators
 * - Professional loading states and error handling
 * - Accessibility and performance optimizations
 * 
 * @author GYS Team
 * @version 3.0.0 - UX/UI Enhanced
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getProyectoById } from '@/lib/services/proyecto';
import { getListaEquiposPorProyecto } from '@/lib/services/listaEquipo';
import { transformToMasterList, calculateMasterListStats } from '@/lib/transformers/master-detail-transformers';
import { ListaEquipoMasterView } from '@/components/proyectos/ListaEquipoMasterView';
import { MasterStatsHeader } from '@/components/proyectos/MasterStatsHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronRight, 
  Package, 
  Settings,
  Download,
  Share2,
  List,
  Grid3X3,
  Home,
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import type { Proyecto } from '@/types';

// ✅ Animation variants for Framer Motion
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};



// ✅ Page props interface
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// ✅ Enhanced loading skeleton component
const EnhancedSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-32" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// ✅ Error component
const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-12 space-y-4"
  >
    <AlertCircle className="h-12 w-12 text-red-500" />
    <h3 className="text-lg font-semibold">Error al cargar los datos</h3>
    <p className="text-muted-foreground text-center max-w-md">
      No se pudieron cargar los datos del proyecto. Por favor, verifica tu conexión e intenta nuevamente.
    </p>
    <Button onClick={onRetry} variant="outline">
      <RefreshCw className="h-4 w-4 mr-2" />
      Reintentar
    </Button>
  </motion.div>
);

// ✅ Main page component
export default function EquipmentListsPage({ params }: PageProps) {
  const router = useRouter();
  const [proyectoId, setProyectoId] = useState<string>('');
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [listasEquipo, setListasEquipo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Initialize params
  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params;
      setProyectoId(resolvedParams.id);
    };
    initParams();
  }, [params]);

  // ✅ Fetch data
  const fetchData = async () => {
    if (!proyectoId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [proyectoData, listasData] = await Promise.all([
        getProyectoById(proyectoId),
        getListaEquiposPorProyecto(proyectoId)
      ]);
      
      setProyecto(proyectoData);
      setListasEquipo(listasData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyectoId) {
      fetchData();
    }
  }, [proyectoId]);

  // ✅ Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <EnhancedSkeleton />
      </div>
    );
  }

  // ✅ Error state
  if (error || !proyecto) {
    return <ErrorState onRetry={fetchData} />;
  }

  // 🔄 Transform data to Master format
  const masterLists = transformToMasterList(listasEquipo);
  const masterStats = calculateMasterListStats(masterLists);

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 🧭 Enhanced Breadcrumb Navigation */}
      <motion.nav 
        variants={itemVariants}
        className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-4 py-3 border"
      >
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/proyectos')}
          className="h-auto p-1 hover:bg-background/80"
        >
          <Home className="h-4 w-4 mr-1" />
          Proyectos
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/proyectos/${proyectoId}`)}
          className="h-auto p-1 hover:bg-background/80"
        >
          <Building2 className="h-4 w-4 mr-1" />
          {proyecto.nombre}
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/proyectos/${proyectoId}/equipos`)}
          className="h-auto p-1 hover:bg-background/80"
        >
          <Package className="h-4 w-4 mr-1" />
          Equipos
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground flex items-center gap-1">
          <List className="h-4 w-4" />
          Listas Técnicas
        </span>
      </motion.nav>

      {/* 📋 Enhanced Header Section */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 border"
      >
        <div className="space-y-2">
          <motion.h1 
            className="text-3xl font-bold tracking-tight flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="p-2 bg-blue-600 rounded-lg">
              <List className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {proyecto.codigo} - Listas de Equipos
            </span>
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            Gestión centralizada de listas técnicas para{' '}
            <span className="font-semibold text-foreground">{proyecto.nombre}</span>
          </motion.p>
        </div>
        
        <motion.div 
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button 
            variant="outline" 
            size="sm"
            className="hover:bg-green-50 hover:border-green-200 transition-all duration-200"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="hover:bg-purple-50 hover:border-purple-200 transition-all duration-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button 
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </motion.div>
      </motion.div>



      {/* 📊 Consolidated Master Statistics */}
      <motion.div variants={itemVariants}>
        <MasterStatsHeader 
          stats={masterStats}
          loading={loading}
          showProgress={true}
          className="mb-6"
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Separator className="my-8" />
      </motion.div>

      {/* 🎯 Enhanced Master View Component */}
      <motion.div variants={itemVariants}>
        <Suspense
          fallback={
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-muted-foreground">Cargando vista maestra...</span>
              </div>
              <EnhancedSkeleton />
            </div>
          }
        >
          <ListaEquipoMasterView
            proyectoId={proyectoId}
            proyectoCodigo={proyecto.codigo}
            initialLists={masterLists}
            initialStats={masterStats}
          />
        </Suspense>
      </motion.div>
    </motion.div>
  );
}
