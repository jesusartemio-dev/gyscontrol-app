/**
 * 🎯 ListaEquipoMasterCard Component
 * 
 * Card component for displaying equipment list summary in Master view.
 * Features:
 * - Equipment list overview with key metrics
 * - Status indicators and progress visualization
 * - Cost summary and item count
 * - Navigation to detail view
 * - Interactive hover states and animations
 * - Responsive design for mobile/desktop
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  cardHoverVariants,
  cardContentVariants,
  buttonInteractionVariants,
  staggerItemVariants
} from '@/lib/animations/masterDetailAnimations';
import { 
  useIsMobile,
  useIsTouchDevice,
  touchInteractions,
  getResponsiveClasses
} from '@/lib/responsive/breakpoints';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Eye,
  Package,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';
import { ListaEquipoMaster } from '@/types/master-detail';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ✅ Props interface
interface ListaEquipoMasterCardProps {
  lista: ListaEquipoMaster;
  proyectoId: string;
  onSelect?: (listaId: string) => void;
  onDelete?: (listaId: string) => void;
  isSelected?: boolean;
  viewMode?: 'grid' | 'list';
  showActions?: boolean;
  className?: string;
}

// ✅ Status configuration (alineado con EstadoListaEquipo)
const statusConfig = {
  borrador: {
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50'
  },
  por_revisar: {
    variant: 'outline' as const,
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  por_cotizar: {
    variant: 'default' as const,
    icon: DollarSign,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  por_validar: {
    variant: 'outline' as const,
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  por_aprobar: {
    variant: 'outline' as const,
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  aprobado: {
    variant: 'default' as const,
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  rechazado: {
    variant: 'destructive' as const,
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
};

// ✅ Animation variants
// ✅ Using centralized animation variants from masterDetailAnimations.ts
// Removed local cardVariants in favor of standardized cardHoverVariants

const ListaEquipoMasterCard: React.FC<ListaEquipoMasterCardProps> = ({
  lista,
  proyectoId,
  onSelect,
  onDelete,
  isSelected = false,
  viewMode = 'grid',
  showActions = true,
  className
}) => {
  const router = useRouter();
  
  // 📱 Responsive hooks
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const touchButtonClasses = isTouchDevice ? touchInteractions.button.touch : touchInteractions.button.desktop;
  const gridClasses = getResponsiveClasses({
    xs: 'grid-cols-2 gap-3',
    md: 'grid-cols-2 gap-4'
  });
  
  // 📡 Get status configuration
  const statusInfo = statusConfig[lista.estado] || statusConfig.borrador;
  const StatusIcon = statusInfo.icon;
  
  // 🔁 Handle navigation to detail view
  const handleViewDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/proyectos/${proyectoId}/equipos/listas/${lista.id}`);
  };
  
  // 🔁 Handle card selection
  const handleCardClick = () => {
    if (onSelect) {
      onSelect(lista.id);
    } else {
      router.push(`/proyectos/${proyectoId}/equipos/listas/${lista.id}`);
    }
  };
  
  // 📊 Calculate progress percentage
  const progressPercentage = lista.stats.totalItems > 0 
    ? Math.round((lista.stats.itemsVerificados / lista.stats.totalItems) * 100)
    : 0;
  
  return (
    <motion.div
      variants={cardHoverVariants}
      initial="initial"
      whileHover="hover"
      className={cn(
        viewMode === 'list' && 'w-full',
        className
      )}
    >
      <Card className={cn(
        'h-full transition-all duration-200',
        'hover:shadow-lg border-2',
        isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200',
        statusInfo.bgColor
      )}>
        {/* Clickeable content area */}
        <motion.div 
          variants={cardContentVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          className="cursor-pointer"
          onClick={handleCardClick}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                  {lista.nombre}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  Código: {lista.codigo}
                </p>
              </div>
              <Badge 
                variant={statusInfo.variant as 'secondary' | 'outline' | 'default'}
                className={cn('ml-2 flex items-center gap-1', statusInfo.color)}
              >
                <StatusIcon className="w-3 h-3" />
                {lista.estado.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pb-2">
          {/* 📊 Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progreso</span>
              <span className="font-medium text-gray-900">
                {progressPercentage}%
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{lista.stats.itemsVerificados} verificados</span>
              <span>{lista.stats.totalItems} total</span>
            </div>
          </div>
          
          {/* 📈 Metrics Grid */}
          <div className={`grid ${gridClasses}`}>
            {/* Items Count */}
            <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg">
              <div className="p-1.5 bg-blue-100 rounded-md">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Items</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {lista.stats.totalItems}
                </p>
              </div>
            </div>
            
            {/* Total Cost */}
            <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg">
              <div className="p-1.5 bg-green-100 rounded-md">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Costo</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {formatCurrency(lista.stats.costoTotal)}
                </p>
              </div>
            </div>
          </div>
          
            {/* 📅 Date Information */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>Actualizado: {formatDate(lista.updatedAt)}</span>
            </div>
           </CardContent>
         </motion.div>
        
        {/* 🎯 Actions - Outside clickeable area */}
        {showActions && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>ID: {lista.id.slice(-8)}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    router.push(`/proyectos/${proyectoId}/equipos/listas/${lista.id}`);
                  }}
                  className={`h-8 px-3 text-xs hover:bg-blue-50 hover:text-blue-600 ${touchButtonClasses}`}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Ver detalle
                </Button>
                
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDelete(lista.id);
                    }}
                    className={`h-8 w-8 p-0 text-xs hover:bg-red-50 hover:text-red-600 ${touchButtonClasses}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default ListaEquipoMasterCard;
export type { ListaEquipoMasterCardProps };
