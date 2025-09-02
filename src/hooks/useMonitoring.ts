/**
 * 🎯 useMonitoring Hook - Integración del sistema de monitoreo
 * 
 * Hook personalizado para integrar fácilmente el sistema de monitoreo
 * de performance y errores en componentes React.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import performanceMonitor, {
  trackPageLoad,
  trackApiCall,
  trackNavigation,
  trackError,
  trackUserInteraction,
} from '@/lib/monitoring/performance';
import { logger } from '@/lib/logger';

// 🎯 Tipos para el hook
interface UseMonitoringOptions {
  trackPageViews?: boolean;
  trackUserInteractions?: boolean;
  trackApiCalls?: boolean;
  trackErrors?: boolean;
  componentName?: string;
}

interface MonitoringHookReturn {
  // 📊 Métodos de tracking
  trackPageView: (route?: string) => void;
  trackClick: (element: string, metadata?: Record<string, any>) => void;
  trackFormSubmit: (formName: string, success: boolean, duration?: number) => void;
  trackApiRequest: (endpoint: string, method: string, duration: number, success: boolean) => void;
  trackCustomEvent: (event: string, metadata?: Record<string, any>) => void;
  trackComponentError: (error: Error, errorInfo?: any) => void;
  
  // 📈 Utilidades de performance
  startTimer: () => () => number;
  measureRender: (componentName: string) => void;
  
  // 🚨 Manejo de errores
  reportError: (error: Error, severity?: 'low' | 'medium' | 'high' | 'critical') => void;
  
  // 📊 Estado del monitoreo
  isEnabled: boolean;
}

// 🎯 Hook principal
export function useMonitoring(options: UseMonitoringOptions = {}): MonitoringHookReturn {
  const router = useRouter();
  const renderStartTime = useRef<number>(Date.now());
  const navigationStartTime = useRef<number>(0);
  const currentRoute = useRef<string>('');
  
  const {
    trackPageViews = true,
    trackUserInteractions = true,
    trackApiCalls = true,
    trackErrors = true,
    componentName = 'Unknown',
  } = options;

  // 📊 Track page view automático
  useEffect(() => {
    if (!trackPageViews) return;

    const route = window.location.pathname;
    const loadTime = Date.now() - renderStartTime.current;
    
    // 📈 Registrar carga de página
    trackPageLoad(route, loadTime);
    
    // 🧭 Registrar navegación si hay ruta anterior
    if (currentRoute.current && currentRoute.current !== route) {
      const navigationTime = Date.now() - navigationStartTime.current;
      trackNavigation(currentRoute.current, route, navigationTime);
    }
    
    currentRoute.current = route;
    navigationStartTime.current = Date.now();
    
    logger.info(`Page view tracked: ${route} (${loadTime}ms)`);
  }, [trackPageViews]);

  // 🚨 Error boundary automático
  useEffect(() => {
    if (!trackErrors) return;

    const handleError = (event: ErrorEvent) => {
      trackError(
        new Error(event.message),
        window.location.pathname,
        'medium'
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        window.location.pathname,
        'high'
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackErrors]);

  // 📊 Track page view manual
  const trackPageView = useCallback((route?: string) => {
    const currentRoute = route || window.location.pathname;
    const loadTime = Date.now() - renderStartTime.current;
    trackPageLoad(currentRoute, loadTime);
    logger.info(`Manual page view tracked: ${currentRoute}`);
  }, []);

  // 👆 Track click events
  const trackClick = useCallback((element: string, metadata?: Record<string, any>) => {
    if (!trackUserInteractions) return;
    
    trackUserInteraction(
      'click',
      element,
      window.location.pathname,
      undefined
    );
    
    logger.info(`Click tracked: ${element}`, metadata);
  }, [trackUserInteractions]);

  // 📝 Track form submissions
  const trackFormSubmit = useCallback((formName: string, success: boolean, duration?: number) => {
    if (!trackUserInteractions) return;
    
    trackUserInteraction(
      success ? 'form_submit_success' : 'form_submit_error',
      formName,
      window.location.pathname,
      duration
    );
    
    logger.info(`Form submit tracked: ${formName} (${success ? 'success' : 'error'})`);
  }, [trackUserInteractions]);

  // 📡 Track API requests
  const trackApiRequest = useCallback((endpoint: string, method: string, duration: number, success: boolean) => {
    if (!trackApiCalls) return;
    
    trackApiCall(endpoint, duration, success);
    
    // 🚨 Track como interacción si es un error
    if (!success) {
      trackUserInteraction(
        'api_error',
        `${method} ${endpoint}`,
        window.location.pathname,
        duration
      );
    }
    
    logger.info(`API request tracked: ${method} ${endpoint} (${duration}ms, ${success ? 'success' : 'error'})`);
  }, [trackApiCalls, trackUserInteractions]);

  // 🎯 Track custom events
  const trackCustomEvent = useCallback((event: string, metadata?: Record<string, any>) => {
    if (!trackUserInteractions) return;
    
    trackUserInteraction(
      event,
      componentName,
      window.location.pathname
    );
    
    logger.info(`Custom event tracked: ${event}`, metadata);
  }, [trackUserInteractions, componentName]);

  // 🚨 Track component errors
  const trackComponentError = useCallback((error: Error, errorInfo?: any) => {
    if (!trackErrors) return;
    
    trackError(error, window.location.pathname, 'high');
    
    logger.error(`Component error tracked in ${componentName}:`, {
      error: error.message,
      stack: error.stack,
      errorInfo,
    });
  }, [trackErrors, componentName]);

  // ⏱️ Crear timer para medir duración
  const startTimer = useCallback(() => {
    const startTime = Date.now();
    return () => Date.now() - startTime;
  }, []);

  // 📏 Medir tiempo de render
  const measureRender = useCallback((componentName: string) => {
    const renderTime = Date.now() - renderStartTime.current;
    
    performanceMonitor.recordMetric({
      name: 'component-render',
      value: renderTime,
      route: window.location.pathname,
      metadata: { component: componentName },
    });
    
    logger.info(`Render time measured: ${componentName} (${renderTime}ms)`);
  }, []);

  // 🚨 Reportar errores con severidad
  const reportError = useCallback((error: Error, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    trackError(error, window.location.pathname, severity);
    logger.error(`Error reported with severity ${severity}:`, error);
  }, []);

  return {
    // 📊 Métodos de tracking
    trackPageView,
    trackClick,
    trackFormSubmit,
    trackApiRequest,
    trackCustomEvent,
    trackComponentError,
    
    // 📈 Utilidades de performance
    startTimer,
    measureRender,
    
    // 🚨 Manejo de errores
    reportError,
    
    // 📊 Estado
    isEnabled: true, // TODO: obtener del contexto de configuración
  };
}

// 🎯 Hook específico para APIs
export function useApiMonitoring() {
  const { trackApiRequest, reportError } = useMonitoring({ trackApiCalls: true });
  
  const monitoredFetch = useCallback(async (url: string, options?: RequestInit) => {
    const startTime = Date.now();
    const method = options?.method || 'GET';
    
    try {
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      const success = response.ok;
      
      trackApiRequest(url, method, duration, success);
      
      if (!success) {
        reportError(
          new Error(`API Error: ${response.status} ${response.statusText}`),
          response.status >= 500 ? 'high' : 'medium'
        );
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      trackApiRequest(url, method, duration, false);
      reportError(error as Error, 'high');
      throw error;
    }
  }, [trackApiRequest, reportError]);
  
  return { monitoredFetch };
}

// 🎯 Hook para formularios
export function useFormMonitoring(formName: string) {
  const { trackFormSubmit, trackCustomEvent, startTimer } = useMonitoring({
    trackUserInteractions: true,
    componentName: formName,
  });
  
  const trackFormStart = useCallback(() => {
    trackCustomEvent('form_start');
  }, [trackCustomEvent]);
  
  const trackFormValidation = useCallback((isValid: boolean, errors?: string[]) => {
    trackCustomEvent('form_validation', {
      isValid,
      errorCount: errors?.length || 0,
      errors: errors?.slice(0, 5), // Solo primeros 5 errores
    });
  }, [trackCustomEvent]);
  
  const trackFormSubmission = useCallback((success: boolean, timer?: () => number) => {
    const duration = timer ? timer() : undefined;
    trackFormSubmit(formName, success, duration);
  }, [trackFormSubmit, formName]);
  
  return {
    trackFormStart,
    trackFormValidation,
    trackFormSubmission,
    startTimer,
  };
}

// 🎯 Hook para navegación
export function useNavigationMonitoring() {
  const router = useRouter();
  const { trackCustomEvent } = useMonitoring({ trackUserInteractions: true });
  const navigationTimer = useRef<(() => number) | null>(null);
  
  const monitoredPush = useCallback((href: string) => {
    navigationTimer.current = Date.now() as any;
    trackCustomEvent('navigation_start', { destination: href });
    router.push(href);
  }, [router, trackCustomEvent]);
  
  const monitoredReplace = useCallback((href: string) => {
    navigationTimer.current = Date.now() as any;
    trackCustomEvent('navigation_start', { destination: href, type: 'replace' });
    router.replace(href);
  }, [router, trackCustomEvent]);
  
  useEffect(() => {
    if (navigationTimer.current) {
      const duration = Date.now() - (navigationTimer.current as any);
      trackCustomEvent('navigation_complete', { duration });
      navigationTimer.current = null;
    }
  });
  
  return {
    push: monitoredPush,
    replace: monitoredReplace,
    back: router.back,
    forward: router.forward,
    refresh: router.refresh,
  };
}

// 📤 Exports
export default useMonitoring;
export type { UseMonitoringOptions, MonitoringHookReturn };