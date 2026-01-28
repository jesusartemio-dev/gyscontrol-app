/**
 * 🧭 BreadcrumbAprovisionamiento Component
 * 
 * Componente de navegación breadcrumb especializado para el módulo de aprovisionamiento financiero.
 * Proporciona navegación contextual y jerárquica con información del proyecto actual.
 * 
 * Features:
 * - Navegación jerárquica contextual
 * - Información del proyecto actual
 * - Enlaces dinámicos según permisos
 * - Responsive design
 * - Animaciones suaves
 * - Estados de carga
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronRight,
  DollarSign,
  FileText,
  FolderOpen,
  Home,
  Package,
  ShoppingCart,
  Calendar,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { cn } from '@/lib/utils';
import type { ProyectoAprovisionamiento } from '@/types/aprovisionamiento';

// ✅ Props interface
interface BreadcrumbAprovisionamientoProps {
  proyecto?: ProyectoAprovisionamiento;
  currentPage?: string;
  customItems?: BreadcrumbItem[];
  showProjectInfo?: boolean;
  isLoading?: boolean;
  className?: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
}

// ✅ Route configuration
const ROUTE_CONFIG = {
  '/finanzas/aprovisionamiento': {
    label: 'Aprovisionamiento',
    icon: Package,
  },
  '/finanzas/aprovisionamiento/listas': {
    label: 'Listas de Equipos',
    icon: FileText,
  },
  '/finanzas/aprovisionamiento/pedidos': {
    label: 'Pedidos',
    icon: ShoppingCart,
  },
  '/finanzas/aprovisionamiento/proyectos': {
    label: 'Proyectos',
    icon: FolderOpen,
  },
  '/finanzas/aprovisionamiento/timeline': {
    label: 'Timeline',
    icon: Calendar,
  },
};

// ✅ Main component
export const BreadcrumbAprovisionamiento: React.FC<BreadcrumbAprovisionamientoProps> = ({
  proyecto,
  currentPage,
  customItems,
  showProjectInfo = true,
  isLoading = false,
  className
}) => {
  const pathname = usePathname();

  // 🔄 Generate breadcrumb items from current path
  const generateBreadcrumbItems = (): BreadcrumbItem[] => {
    if (customItems) {
      return customItems;
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [
      {
        label: 'Inicio',
        href: '/',
        icon: Home,
      },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const routeConfig = ROUTE_CONFIG[currentPath as keyof typeof ROUTE_CONFIG];
      
      if (routeConfig) {
        const isLast = index === pathSegments.length - 1;
        items.push({
          label: routeConfig.label,
          href: isLast ? undefined : currentPath,
          icon: routeConfig.icon,
          isActive: isLast,
        });
      }
    });

    // 📝 Add current page if specified
    if (currentPage && !items.some(item => item.isActive)) {
      items.push({
        label: currentPage,
        isActive: true,
      });
    }

    return items;
  };

  const breadcrumbItems = generateBreadcrumbItems();

  // 🎨 Render project info
  const renderProjectInfo = () => {
    if (!showProjectInfo || !proyecto) return null;

    return (
      <div className="flex items-center gap-3 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in-50 slide-in-from-top-2 duration-300 delay-100">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900">{proyecto.nombre}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {proyecto.codigo}
          </Badge>
          
          {proyecto.estado && (
            <Badge 
              variant={proyecto.estado === 'activo' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {proyecto.estado}
            </Badge>
          )}
        </div>
        
        {proyecto.fechaInicio && (
          <div className="text-sm text-blue-700">
            Inicio: {new Date(proyecto.fechaInicio).toLocaleDateString('es-PE')}
          </div>
        )}
      </div>
    );
  };

  // 🔄 Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-16" />
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Skeleton className="h-4 w-24" />
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Skeleton className="h-4 w-32" />
        </div>
        {showProjectInfo && (
          <Skeleton className="h-16 w-full rounded-lg" />
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-300', className)}>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === breadcrumbItems.length - 1;

            return (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {item.href && !item.isActive ? (
                    <BreadcrumbLink asChild>
                      <Link 
                        href={item.href}
                        className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        <span>{item.label}</span>
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="flex items-center gap-1.5">
                      {Icon && <Icon className="w-4 h-4" />}
                      <span className="font-medium">{item.label}</span>
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                
                {!isLast && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-4 h-4" />
                  </BreadcrumbSeparator>
                )}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {renderProjectInfo()}
    </div>
  );
};

// ✅ Compact version without project info
export const BreadcrumbAprovisionamientoCompact: React.FC<{
  currentPage?: string;
  className?: string;
}> = ({ currentPage, className }) => {
  return (
    <BreadcrumbAprovisionamiento
      currentPage={currentPage}
      showProjectInfo={false}
      className={className}
    />
  );
};

// ✅ Custom breadcrumb for specific flows
export const BreadcrumbAprovisionamientoCustom: React.FC<{
  items: BreadcrumbItem[];
  proyecto?: ProyectoAprovisionamiento;
  className?: string;
}> = ({ items, proyecto, className }) => {
  return (
    <BreadcrumbAprovisionamiento
      customItems={items}
      proyecto={proyecto}
      className={className}
    />
  );
};

export default BreadcrumbAprovisionamiento;
