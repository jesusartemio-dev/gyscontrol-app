/**
 * 🚨 Enhanced Error States & Empty States
 * 
 * Comprehensive error handling and empty state components with illustrations.
 * Features:
 * - Multiple error types with contextual messaging
 * - Empty states with engaging illustrations
 * - Retry mechanisms and action buttons
 * - Responsive design with animations
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  Home,
  Search,
  Plus,
  FileX,
  Wifi,
  Server,
  Shield,
  Clock,
  Package,
  Users,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ✅ Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const iconVariants = {
  hidden: { scale: 0 },
  visible: { 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 10
    }
  }
};

// 🎨 SVG Illustrations
const EmptyIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('w-32 h-32 text-gray-300', className)}
    fill="none"
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
  >
    <motion.circle
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}
      cx="100"
      cy="100"
      r="80"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeDasharray="5,5"
    />
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, delay: 0.5 }}
      d="M70 90 L90 110 L130 70"
      stroke="currentColor"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ErrorIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('w-32 h-32 text-red-300', className)}
    fill="none"
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
  >
    <motion.circle
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5 }}
      cx="100"
      cy="100"
      r="80"
      fill="currentColor"
      opacity="0.1"
    />
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
      d="M70 70 L130 130 M130 70 L70 130"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

// 🚨 Error State Component
interface ErrorStateProps {
  title?: string;
  message?: string;
  type?: 'network' | 'server' | 'permission' | 'notFound' | 'generic';
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  showRetry?: boolean;
  showGoBack?: boolean;
  showGoHome?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  type = 'generic',
  onRetry,
  onGoBack,
  onGoHome,
  showRetry = true,
  showGoBack = false,
  showGoHome = false,
  className
}) => {
  const errorConfig = {
    network: {
      icon: Wifi,
      title: title || 'Sin conexión',
      message: message || 'Verifica tu conexión a internet e intenta nuevamente.',
      color: 'text-orange-500'
    },
    server: {
      icon: Server,
      title: title || 'Error del servidor',
      message: message || 'Ocurrió un problema en nuestros servidores. Intenta más tarde.',
      color: 'text-red-500'
    },
    permission: {
      icon: Shield,
      title: title || 'Acceso denegado',
      message: message || 'No tienes permisos para acceder a este recurso.',
      color: 'text-yellow-500'
    },
    notFound: {
      icon: FileX,
      title: title || 'No encontrado',
      message: message || 'El recurso que buscas no existe o ha sido eliminado.',
      color: 'text-gray-500'
    },
    generic: {
      icon: AlertCircle,
      title: title || 'Algo salió mal',
      message: message || 'Ocurrió un error inesperado. Por favor intenta nuevamente.',
      color: 'text-red-500'
    }
  };

  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('flex flex-col items-center justify-center py-12 px-4', className)}
    >
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <motion.div variants={iconVariants} className="mb-4">
            <div className={cn('mx-auto w-16 h-16 rounded-full flex items-center justify-center', 
              type === 'network' ? 'bg-orange-100' :
              type === 'server' ? 'bg-red-100' :
              type === 'permission' ? 'bg-yellow-100' :
              type === 'notFound' ? 'bg-gray-100' :
              'bg-red-100'
            )}>
              <Icon className={cn('w-8 h-8', config.color)} />
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="space-y-2 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {config.title}
            </h3>
            <p className="text-sm text-gray-600">
              {config.message}
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-2 justify-center">
            {showRetry && onRetry && (
              <Button onClick={onRetry} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </Button>
            )}
            {showGoBack && onGoBack && (
              <Button onClick={onGoBack} variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            )}
            {showGoHome && onGoHome && (
              <Button onClick={onGoHome} variant="outline" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Inicio
              </Button>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// 📭 Empty State Component
interface EmptyStateProps {
  title?: string;
  message?: string;
  type?: 'noData' | 'noResults' | 'noItems' | 'noProjects' | 'noUsers';
  actionLabel?: string;
  onAction?: () => void;
  showAction?: boolean;
  illustration?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  type = 'noData',
  actionLabel,
  onAction,
  showAction = true,
  illustration,
  className
}) => {
  const emptyConfig = {
    noData: {
      icon: Package,
      title: title || 'No hay datos',
      message: message || 'Aún no hay información para mostrar.',
      actionLabel: actionLabel || 'Actualizar',
      color: 'text-blue-500'
    },
    noResults: {
      icon: Search,
      title: title || 'Sin resultados',
      message: message || 'No encontramos resultados para tu búsqueda.',
      actionLabel: actionLabel || 'Limpiar filtros',
      color: 'text-purple-500'
    },
    noItems: {
      icon: Package,
      title: title || 'Lista vacía',
      message: message || 'No hay elementos en esta lista.',
      actionLabel: actionLabel || 'Agregar elemento',
      color: 'text-green-500'
    },
    noProjects: {
      icon: Settings,
      title: title || 'Sin proyectos',
      message: message || 'Comienza creando tu primer proyecto.',
      actionLabel: actionLabel || 'Crear proyecto',
      color: 'text-indigo-500'
    },
    noUsers: {
      icon: Users,
      title: title || 'Sin usuarios',
      message: message || 'No hay usuarios registrados.',
      actionLabel: actionLabel || 'Invitar usuarios',
      color: 'text-pink-500'
    }
  };

  const config = emptyConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('flex flex-col items-center justify-center py-16 px-4', className)}
    >
      <motion.div variants={iconVariants} className="mb-6">
        {illustration || (
          <div className="relative">
            <EmptyIllustration />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className={cn('w-12 h-12', config.color)} />
            </div>
          </div>
        )}
      </motion.div>
      
      <motion.div variants={itemVariants} className="text-center space-y-2 mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {config.title}
        </h3>
        <p className="text-gray-600 max-w-md">
          {config.message}
        </p>
      </motion.div>
      
      {showAction && onAction && (
        <motion.div variants={itemVariants}>
          <Button onClick={onAction} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {config.actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

// 🔄 Loading State with Progress
interface LoadingStateProps {
  title?: string;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Cargando...',
  message = 'Por favor espera mientras procesamos tu solicitud.',
  progress,
  showProgress = false,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('flex flex-col items-center justify-center py-12 px-4', className)}
    >
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: [0, 0, 1, 1] }}
            className="mx-auto w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mb-4"
          />
          
          <div className="space-y-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          
          {showProgress && typeof progress === 'number' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="bg-blue-600 h-2 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500">{progress}% completado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default {
  ErrorState,
  EmptyState,
  LoadingState
};