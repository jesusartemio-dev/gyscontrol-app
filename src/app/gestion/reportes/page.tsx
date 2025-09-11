/**
 * 📊 Página Principal de Reportes - Hub de Análisis y Métricas
 * 
 * Página principal que centraliza todos los reportes disponibles
 * con navegación rápida y resumen de métricas principales.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import {
  BarChart3,
  Package,
  TrendingUp,
  Clock,
  FileText,
  Download,
  Eye,
  ArrowRight,
  Activity,
  Target,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import logger from '@/lib/logger';

// ✅ Metadata de la página
export const metadata: Metadata = {
  title: 'Reportes y Análisis | GYS - Sistema de Gestión',
  description: 'Hub central de reportes, métricas y análisis del sistema GYS. Accede a dashboards ejecutivos, reportes de trazabilidad y análisis de performance.',
  keywords: ['reportes', 'análisis', 'métricas', 'dashboard', 'trazabilidad', 'KPIs'],
  openGraph: {
    title: 'Reportes y Análisis - GYS',
    description: 'Hub central de reportes y análisis del sistema GYS',
    type: 'website'
  }
};

// 🔧 Configuración de la página
export const dynamic = 'force-dynamic';

// 🎯 Tipos para reportes disponibles
interface ReporteDisponible {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  href: string;
  categoria: 'dashboard' | 'reporte' | 'analisis';
  roles: string[];
  estado: 'disponible' | 'desarrollo' | 'mantenimiento';
  metricas?: {
    label: string;
    valor: string;
    tendencia?: 'up' | 'down' | 'stable';
  }[];
}

// 📊 Configuración de reportes disponibles
const reportesDisponibles: ReporteDisponible[] = [
  {
    id: 'dashboard-pedidos',
    titulo: 'Dashboard de Pedidos',
    descripcion: 'Métricas ejecutivas de trazabilidad, entregas y performance de pedidos en tiempo real.',
    icono: <BarChart3 className="h-6 w-6" />,
    href: '/gestion/reportes/pedidos',
    categoria: 'dashboard',
    roles: ['admin', 'gerente', 'comercial', 'proyectos', 'logistica', 'gestor'],
    estado: 'disponible',
    metricas: [
      { label: 'Pedidos Activos', valor: '127', tendencia: 'up' },
      { label: 'Entregas Hoy', valor: '23', tendencia: 'stable' },
      { label: 'Eficiencia', valor: '94.2%', tendencia: 'up' }
    ]
  },
  {
    id: 'reporte-trazabilidad',
    titulo: 'Reporte de Trazabilidad',
    descripcion: 'Timeline detallado de entregas, análisis de retrasos y comparativas por proyecto.',
    icono: <Activity className="h-6 w-6" />,
    href: '/gestion/reportes/trazabilidad',
    categoria: 'reporte',
    roles: ['admin', 'gerente', 'proyectos', 'logistica'],
    estado: 'desarrollo',
    metricas: [
      { label: 'Eventos Hoy', valor: '45', tendencia: 'up' },
      { label: 'Retrasos', valor: '3', tendencia: 'down' }
    ]
  },
  {
    id: 'analisis-performance',
    titulo: 'Análisis de Performance',
    descripcion: 'KPIs de rendimiento, tendencias temporales y análisis predictivo de entregas.',
    icono: <TrendingUp className="h-6 w-6" />,
    href: '/gestion/reportes/performance',
    categoria: 'analisis',
    roles: ['admin', 'gerente', 'gestor'],
    estado: 'desarrollo',
    metricas: [
      { label: 'Score General', valor: '8.7/10', tendencia: 'up' },
      { label: 'Mejora vs Mes Anterior', valor: '+12%', tendencia: 'up' }
    ]
  },
  {
    id: 'reporte-financiero',
    titulo: 'Reporte Financiero',
    descripcion: 'Análisis de costos, presupuestos y impacto financiero de pedidos y proyectos.',
    icono: <DollarSign className="h-6 w-6" />,
    href: '/gestion/reportes/financiero',
    categoria: 'reporte',
    roles: ['admin', 'gerente', 'comercial'],
    estado: 'desarrollo',
    metricas: [
      { label: 'Valor Total', valor: '$2.4M', tendencia: 'up' },
      { label: 'Ahorro vs Presupuesto', valor: '8.3%', tendencia: 'up' }
    ]
  }
];

// 🔁 Componente de Tarjeta de Reporte
const TarjetaReporte: React.FC<{
  reporte: ReporteDisponible;
  tienePermiso: boolean;
}> = ({ reporte, tienePermiso }) => {
  const obtenerColorEstado = (estado: ReporteDisponible['estado']) => {
    switch (estado) {
      case 'disponible':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'desarrollo':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mantenimiento':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const obtenerTextoEstado = (estado: ReporteDisponible['estado']) => {
    switch (estado) {
      case 'disponible':
        return 'Disponible';
      case 'desarrollo':
        return 'En Desarrollo';
      case 'mantenimiento':
        return 'Mantenimiento';
      default:
        return 'Desconocido';
    }
  };

  const obtenerIconoTendencia = (tendencia?: 'up' | 'down' | 'stable') => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      default:
        return <Activity className="h-3 w-3 text-gray-600" />;
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      tienePermiso && reporte.estado === 'disponible' 
        ? 'hover:border-blue-200 cursor-pointer' 
        : 'opacity-60'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              reporte.categoria === 'dashboard' ? 'bg-blue-100 text-blue-600' :
              reporte.categoria === 'reporte' ? 'bg-green-100 text-green-600' :
              'bg-purple-100 text-purple-600'
            }`}>
              {reporte.icono}
            </div>
            <div>
              <CardTitle className="text-lg">{reporte.titulo}</CardTitle>
              <Badge 
                variant="outline" 
                className={`mt-1 ${obtenerColorEstado(reporte.estado)}`}
              >
                {obtenerTextoEstado(reporte.estado)}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed mt-2">
          {reporte.descripcion}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Métricas rápidas */}
        {reporte.metricas && reporte.metricas.length > 0 && (
          <div className="space-y-2 mb-4">
            {reporte.metricas.map((metrica, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{metrica.label}</span>
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{metrica.valor}</span>
                  {metrica.tendencia && obtenerIconoTendencia(metrica.tendencia)}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Botones de acción */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {reporte.categoria.charAt(0).toUpperCase() + reporte.categoria.slice(1)}
            </Badge>
          </div>
          
          {tienePermiso ? (
            reporte.estado === 'disponible' ? (
              <Link href={reporte.href}>
                <Button size="sm" className="group">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Reporte
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            )
          ) : (
            <Button size="sm" variant="outline" disabled>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Sin Permisos
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// 📊 Componente principal
export default async function ReportesPage() {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions);
    
    if (!session) {
      notFound();
    }
    
    // 📝 Log de acceso
    logger.info('Página de reportes accedida', {
      userId: session.user?.id,
      userRole: session.user?.role,
      timestamp: new Date().toISOString()
    });
    
    const userRole = session.user?.role || '';
    
    // 🎯 Filtrar reportes por permisos
    const reportesPermitidos = reportesDisponibles.filter(reporte => 
      reporte.roles.includes(userRole)
    );
    
    const reportesDisponiblesCount = reportesPermitidos.filter(r => r.estado === 'disponible').length;
    const reportesDesarrolloCount = reportesPermitidos.filter(r => r.estado === 'desarrollo').length;
    
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* 🧭 Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/gestion">Gestión</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Reportes</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* 📊 Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reportes y Análisis</h1>
            <p className="text-muted-foreground">
              Hub central de métricas, dashboards y análisis del sistema GYS
            </p>
          </div>
          
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Reportes Disponibles</p>
                    <p className="text-2xl font-bold text-blue-600">{reportesDisponiblesCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">En Desarrollo</p>
                    <p className="text-2xl font-bold text-yellow-600">{reportesDesarrolloCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Tu Rol</p>
                    <p className="text-lg font-bold text-green-600 capitalize">{userRole}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Última Actualización</p>
                    <p className="text-sm font-medium text-purple-600">Hace 5 min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* 📋 Grid de Reportes */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Reportes Disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportesPermitidos.map((reporte) => (
                <TarjetaReporte
                  key={reporte.id}
                  reporte={reporte}
                  tienePermiso={reporte.roles.includes(userRole)}
                />
              ))}
            </div>
          </div>
          
          {reportesPermitidos.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay reportes disponibles</h3>
                <p className="text-muted-foreground">
                  Tu rol actual ({userRole}) no tiene permisos para acceder a ningún reporte.
                  Contacta al administrador del sistema para obtener los permisos necesarios.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
    
  } catch (error) {
    // 📝 Log del error
    logger.error('Error en página de reportes', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}
