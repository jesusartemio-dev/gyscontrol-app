/**
 * 🛡️ Detail Error Boundary Component
 * 
 * Error boundary specifically designed for Detail views.
 * Provides contextual error handling and recovery options.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft, 
  Home, 
  Bug,
  Shield,
  Wifi,
  Server
} from 'lucide-react';

// ✅ Error types
type ErrorType = 
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

interface ErrorInfo {
  type: ErrorType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  suggestions: string[];
}

// ✅ Error configurations
const errorConfigs: Record<ErrorType, ErrorInfo> = {
  VALIDATION_ERROR: {
    type: 'VALIDATION_ERROR',
    title: 'Parámetros Inválidos',
    description: 'Los parámetros de la URL no son válidos o están mal formateados.',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    suggestions: [
      'Verifica que la URL sea correcta',
      'Asegúrate de que los IDs sean válidos',
      'Intenta acceder desde el menú principal'
    ]
  },
  NETWORK_ERROR: {
    type: 'NETWORK_ERROR',
    title: 'Error de Conexión',
    description: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
    icon: Wifi,
    color: 'text-blue-600',
    suggestions: [
      'Verifica tu conexión a internet',
      'Intenta recargar la página',
      'Contacta al administrador si persiste'
    ]
  },
  PERMISSION_ERROR: {
    type: 'PERMISSION_ERROR',
    title: 'Sin Permisos',
    description: 'No tienes permisos suficientes para acceder a este recurso.',
    icon: Shield,
    color: 'text-red-600',
    suggestions: [
      'Contacta al administrador del proyecto',
      'Verifica que tengas los permisos necesarios',
      'Inicia sesión con una cuenta autorizada'
    ]
  },
  NOT_FOUND_ERROR: {
    type: 'NOT_FOUND_ERROR',
    title: 'Recurso No Encontrado',
    description: 'El recurso que buscas no existe o ha sido eliminado.',
    icon: AlertTriangle,
    color: 'text-orange-600',
    suggestions: [
      'Verifica que la URL sea correcta',
      'El recurso puede haber sido eliminado',
      'Intenta buscar desde el listado principal'
    ]
  },
  SERVER_ERROR: {
    type: 'SERVER_ERROR',
    title: 'Error del Servidor',
    description: 'Ocurrió un error interno en el servidor. Intenta nuevamente más tarde.',
    icon: Server,
    color: 'text-red-600',
    suggestions: [
      'Intenta recargar la página',
      'Espera unos minutos y vuelve a intentar',
      'Contacta al soporte técnico si persiste'
    ]
  },
  UNKNOWN_ERROR: {
    type: 'UNKNOWN_ERROR',
    title: 'Error Inesperado',
    description: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
    icon: Bug,
    color: 'text-gray-600',
    suggestions: [
      'Intenta recargar la página',
      'Limpia la caché del navegador',
      'Contacta al soporte técnico'
    ]
  }
};

// ✅ Props interface
interface DetailErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// ✅ State interface
interface DetailErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
}

// ✅ Utility function to determine error type
const determineErrorType = (error: Error): ErrorType => {
  const message = error.message.toLowerCase();
  
  if (message.includes('validation') || message.includes('invalid') || message.includes('parámetros')) {
    return 'VALIDATION_ERROR';
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('conexión')) {
    return 'NETWORK_ERROR';
  }
  
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('permisos')) {
    return 'PERMISSION_ERROR';
  }
  
  if (message.includes('not found') || message.includes('404') || message.includes('no encontrado')) {
    return 'NOT_FOUND_ERROR';
  }
  
  if (message.includes('server') || message.includes('500') || message.includes('internal')) {
    return 'SERVER_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
};

// ✅ Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => {
  const errorType = determineErrorType(error);
  const config = errorConfigs[errorType];
  const Icon = config.icon;
  
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Icon className={`h-16 w-16 ${config.color}`} />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {config.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {config.description}
              </AlertDescription>
            </Alert>
            
            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="bg-gray-50 p-4 rounded-lg">
                <summary className="cursor-pointer font-medium text-sm text-gray-700 mb-2">
                  Detalles del Error (Desarrollo)
                </summary>
                <pre className="text-xs text-gray-600 overflow-auto">
                  {error.stack}
                </pre>
              </details>
            )}
            
            {/* Suggestions */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Sugerencias:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {config.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={reset} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar Nuevamente
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver Atrás
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/proyectos'}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Ir al Inicio
              </Button>
            </div>
            
            {/* Support contact */}
            <div className="pt-4 border-t text-center">
              <p className="text-xs text-gray-500">
                Si el problema persiste, contacta al equipo de soporte técnico.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ✅ Error Boundary Class Component
class DetailErrorBoundary extends React.Component<DetailErrorBoundaryProps, DetailErrorBoundaryState> {
  constructor(props: DetailErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'UNKNOWN_ERROR'
    };
  }
  
  static getDerivedStateFromError(error: Error): DetailErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorType: determineErrorType(error)
    };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('DetailErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { errorInfo } });
    }
  }
  
  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: 'UNKNOWN_ERROR'
    });
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} reset={this.reset} />;
    }
    
    return this.props.children;
  }
}

export default DetailErrorBoundary;
export { DefaultErrorFallback, determineErrorType, errorConfigs };
export type { ErrorType, ErrorInfo, DetailErrorBoundaryProps };