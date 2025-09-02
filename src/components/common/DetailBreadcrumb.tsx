/**
 * 🧭 DetailBreadcrumb Component
 * 
 * Enhanced breadcrumb navigation component for Detail views.
 * Features:
 * - Back to Master navigation
 * - Breadcrumb trail with project context
 * - Responsive design with mobile optimization
 * - Keyboard navigation support
 * - Loading states and error handling
 * - Customizable styling and actions
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Home,
  FolderOpen,
  Package,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ✅ Props interface
interface DetailBreadcrumbProps {
  // Navigation data
  proyectoId: string;
  proyectoNombre?: string;
  masterPath: string;
  masterLabel: string;
  detailLabel: string;
  detailId?: string;
  
  // Optional customization
  showBackButton?: boolean;
  showHomeLink?: boolean;
  showExternalLink?: boolean;
  externalLinkUrl?: string;
  externalLinkLabel?: string;
  
  // Status and metadata
  status?: string;
  statusVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  metadata?: string;
  
  // Styling
  className?: string;
  compact?: boolean;
  
  // Event handlers
  onBackClick?: () => void;
  onBreadcrumbClick?: (path: string) => void;
}

// ✅ Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

// ✅ Status configuration
const statusConfig = {
  ACTIVA: { variant: 'default' as const, color: 'text-blue-600' },
  COMPLETADA: { variant: 'default' as const, color: 'text-green-600' },
  PAUSADA: { variant: 'secondary' as const, color: 'text-yellow-600' },
  CANCELADA: { variant: 'destructive' as const, color: 'text-red-600' },
  BORRADOR: { variant: 'outline' as const, color: 'text-gray-600' }
};

// ✅ Main component
export const DetailBreadcrumb: React.FC<DetailBreadcrumbProps> = ({
  proyectoId,
  proyectoNombre,
  masterPath,
  masterLabel,
  detailLabel,
  detailId,
  showBackButton = true,
  showHomeLink = true,
  showExternalLink = false,
  externalLinkUrl,
  externalLinkLabel = 'Ver en nueva pestaña',
  status,
  statusVariant,
  metadata,
  className,
  compact = false,
  onBackClick,
  onBreadcrumbClick
}) => {
  const router = useRouter();
  
  // 🔄 Handle back navigation
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push(masterPath);
    }
  };
  
  // 🔄 Handle breadcrumb navigation
  const handleBreadcrumbClick = (path: string) => {
    if (onBreadcrumbClick) {
      onBreadcrumbClick(path);
    } else {
      router.push(path);
    }
  };
  
  // 📊 Get status configuration
  const statusInfo = status ? statusConfig[status as keyof typeof statusConfig] : null;
  const finalStatusVariant = statusVariant || statusInfo?.variant || 'default';
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex items-center justify-between',
        'bg-white border-b border-gray-200',
        compact ? 'py-2 px-4' : 'py-4 px-6',
        className
      )}
    >
      {/* 🔙 Left section: Back button and breadcrumb */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Back Button */}
        {showBackButton && (
          <motion.div variants={itemVariants}>
            <Button
              variant="ghost"
              size={compact ? 'sm' : 'default'}
              onClick={handleBackClick}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className={cn('w-4 h-4', compact && 'w-3 h-3')} />
              {!compact && 'Volver'}
            </Button>
          </motion.div>
        )}
        
        {/* Breadcrumb Navigation */}
        <motion.div variants={itemVariants} className="min-w-0 flex-1">
          <Breadcrumb>
            <BreadcrumbList className="flex-wrap">
              {/* Home Link */}
              {showHomeLink && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={() => handleBreadcrumbClick('/dashboard')}
                      className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                    >
                      <Home className="w-3 h-3" />
                      {!compact && 'Inicio'}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-3 h-3" />
                  </BreadcrumbSeparator>
                </>
              )}
              
              {/* Project Link */}
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => handleBreadcrumbClick(`/proyectos/${proyectoId}`)}
                  className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">
                    {proyectoNombre || `Proyecto ${proyectoId.slice(0, 8)}`}
                  </span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              
              <BreadcrumbSeparator>
                <ChevronRight className="w-3 h-3" />
              </BreadcrumbSeparator>
              
              {/* Master View Link */}
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => handleBreadcrumbClick(masterPath)}
                  className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                >
                  <Package className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">
                    {masterLabel}
                  </span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              
              <BreadcrumbSeparator>
                <ChevronRight className="w-3 h-3" />
              </BreadcrumbSeparator>
              
              {/* Current Detail Page */}
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2">
                  <span className="truncate max-w-[200px] font-medium">
                    {detailLabel}
                  </span>
                  {status && (
                    <Badge 
                      variant={finalStatusVariant as 'default' | 'secondary' | 'outline'}
                      className={cn('text-xs', statusInfo?.color)}
                    >
                      {status}
                    </Badge>
                  )}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Metadata */}
          {metadata && !compact && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              {metadata}
            </p>
          )}
        </motion.div>
      </div>
      
      {/* 🔗 Right section: External link */}
      {showExternalLink && externalLinkUrl && (
        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            size={compact ? 'sm' : 'default'}
            onClick={() => window.open(externalLinkUrl, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            {!compact && externalLinkLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DetailBreadcrumb;
export type { DetailBreadcrumbProps };