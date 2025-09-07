'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * 🔍 Error Boundary component to catch and display React errors
 * Specifically designed to catch "Maximum update depth exceeded" errors
 */
export class ErrorBoundary extends Component<Props, State> {
  private errorCount = 0;
  private lastErrorTime = 0;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();
    this.errorCount++;
    
    console.group('🚨 REACT ERROR BOUNDARY TRIGGERED');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Count:', this.errorCount);
    console.error('Time since last error:', now - this.lastErrorTime, 'ms');
    console.groupEnd();
    
    // Check for infinite loop pattern
    if (error.message.includes('Maximum update depth exceeded')) {
      console.error('🔥 INFINITE LOOP DETECTED!');
      console.error('Stack trace:', error.stack);
      
      // Try to identify the problematic component
      const componentMatch = errorInfo.componentStack?.match(/at (\w+)/g);
      if (componentMatch) {
        console.error('🎯 Problematic components:', componentMatch.slice(0, 5));
      }
    }
    
    this.lastErrorTime = now;
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.errorCount = 0;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Error de Renderizado Detectado
            </CardTitle>
            <CardDescription className="text-red-600">
              Se ha detectado un error en el componente. Revisa la consola para más detalles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-100 p-3 rounded text-sm text-red-800 font-mono">
              {this.state.error?.message || 'Error desconocido'}
            </div>
            
            {this.state.error?.message.includes('Maximum update depth exceeded') && (
              <div className="bg-yellow-100 p-3 rounded text-sm text-yellow-800">
                <strong>🔥 Bucle Infinito Detectado:</strong>
                <br />
                Este error indica que un componente está causando re-renders continuos.
                Revisa la consola para identificar el componente problemático.
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="destructive" 
                size="sm"
              >
                Recargar Página
              </Button>
            </div>
            
            <details className="text-xs text-gray-600">
              <summary className="cursor-pointer font-medium">Detalles técnicos</summary>
              <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;