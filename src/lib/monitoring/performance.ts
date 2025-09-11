/**
 * 🎯 Performance Monitoring - Sistema de monitoreo post-deployment
 * 
 * Sistema completo de monitoreo de performance, métricas y logging
 * para el seguimiento post-deployment de la migración Master-Detail.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import logger from '@/lib/logger';
import { buildApiUrl } from '@/lib/utils';

// 📊 Tipos para métricas
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  route?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface NavigationMetric {
  from: string;
  to: string;
  duration: number;
  timestamp: number;
  userId?: string;
}

interface ErrorMetric {
  error: string;
  stack?: string;
  route: string;
  timestamp: number;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface UserInteractionMetric {
  action: string;
  component: string;
  route: string;
  timestamp: number;
  userId?: string;
  duration?: number;
}

// 🎯 Clase principal de monitoreo
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private navigationMetrics: NavigationMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private userInteractions: UserInteractionMetric[] = [];
  private isEnabled: boolean = true;
  private batchSize: number = 50;
  private flushInterval: number = 30000; // 30 segundos
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.startAutoFlush();
    this.setupPerformanceObserver();
  }

  // 🚀 Configurar Performance Observer para Web Vitals
  private setupPerformanceObserver() {
    if (typeof window === 'undefined') return;

    try {
      // 📏 Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          route: window.location.pathname,
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // ⚡ First Input Delay (FID)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            route: window.location.pathname,
          });
        });
      }).observe({ entryTypes: ['first-input'] });

      // 🎨 Cumulative Layout Shift (CLS)
      new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          timestamp: Date.now(),
          route: window.location.pathname,
        });
      }).observe({ entryTypes: ['layout-shift'] });

    } catch (error) {
      logger.warn('Performance Observer not supported:', error);
    }
  }

  // 📊 Registrar métrica de performance
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'> & { timestamp?: number }) {
    if (!this.isEnabled) return;

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    };

    this.metrics.push(fullMetric);
    logger.info('Performance metric recorded:', fullMetric);

    // 🚨 Alertas para métricas críticas
    this.checkCriticalMetrics(fullMetric);

    // 🔄 Auto-flush si alcanzamos el batch size
    if (this.metrics.length >= this.batchSize) {
      this.flush();
    }
  }

  // 🧭 Registrar métrica de navegación
  recordNavigation(navigation: Omit<NavigationMetric, 'timestamp'>) {
    if (!this.isEnabled) return;

    const fullNavigation: NavigationMetric = {
      ...navigation,
      timestamp: Date.now(),
    };

    this.navigationMetrics.push(fullNavigation);
    logger.info('Navigation metric recorded:', fullNavigation);
  }

  // 🚨 Registrar error
  recordError(error: Omit<ErrorMetric, 'timestamp'>) {
    const fullError: ErrorMetric = {
      ...error,
      timestamp: Date.now(),
    };

    this.errorMetrics.push(fullError);
    logger.error('Error metric recorded:', fullError);

    // 🚨 Envío inmediato para errores críticos
    if (error.severity === 'critical') {
      this.flushErrors();
    }
  }

  // 👆 Registrar interacción de usuario
  recordUserInteraction(interaction: Omit<UserInteractionMetric, 'timestamp'>) {
    if (!this.isEnabled) return;

    const fullInteraction: UserInteractionMetric = {
      ...interaction,
      timestamp: Date.now(),
    };

    this.userInteractions.push(fullInteraction);
    logger.info('User interaction recorded:', fullInteraction);
  }

  // 🚨 Verificar métricas críticas
  private checkCriticalMetrics(metric: PerformanceMetric) {
    const thresholds = {
      LCP: 2500, // 2.5 segundos
      FID: 100,  // 100ms
      CLS: 0.1,  // 0.1
      'page-load': 3000, // 3 segundos
      'api-response': 1000, // 1 segundo
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      logger.warn(`Critical performance metric detected: ${metric.name} = ${metric.value}ms (threshold: ${threshold}ms)`);
      
      // 📧 Aquí se podría enviar una alerta por email/Slack
      this.sendAlert({
        type: 'performance',
        metric: metric.name,
        value: metric.value,
        threshold,
        route: metric.route,
      });
    }
  }

  // 📤 Enviar alerta
  private async sendAlert(alert: any) {
    try {
      // 🔄 Implementar envío de alertas (email, Slack, etc.)
      logger.warn('Alert triggered:', alert);
      
      // Ejemplo: envío a endpoint de alertas
      if (process.env.NODE_ENV === 'production') {
        await fetch(buildApiUrl('/api/monitoring/alerts'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
      }
    } catch (error) {
      logger.error('Failed to send alert:', error);
    }
  }

  // 🔄 Auto-flush periódico
  private startAutoFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // 📤 Enviar métricas al servidor
  async flush() {
    if (this.metrics.length === 0 && 
        this.navigationMetrics.length === 0 && 
        this.userInteractions.length === 0) {
      return;
    }

    const payload = {
      metrics: [...this.metrics],
      navigation: [...this.navigationMetrics],
      interactions: [...this.userInteractions],
      timestamp: Date.now(),
    };

    try {
      await fetch(buildApiUrl('/api/monitoring/metrics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 🧹 Limpiar métricas enviadas
      this.metrics = [];
      this.navigationMetrics = [];
      this.userInteractions = [];

      logger.info('Metrics flushed successfully');
    } catch (error) {
      logger.error('Failed to flush metrics:', error);
    }
  }

  // 🚨 Enviar errores inmediatamente
  async flushErrors() {
    if (this.errorMetrics.length === 0) return;

    const payload = {
      errors: [...this.errorMetrics],
      timestamp: Date.now(),
    };

    try {
      await fetch(buildApiUrl('/api/monitoring/errors'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      this.errorMetrics = [];
      logger.info('Errors flushed successfully');
    } catch (error) {
      logger.error('Failed to flush errors:', error);
    }
  }

  // 📊 Obtener estadísticas actuales
  getStats() {
    return {
      metricsCount: this.metrics.length,
      navigationCount: this.navigationMetrics.length,
      errorCount: this.errorMetrics.length,
      interactionCount: this.userInteractions.length,
      isEnabled: this.isEnabled,
    };
  }

  // ⚙️ Configurar monitoreo
  configure(options: {
    enabled?: boolean;
    batchSize?: number;
    flushInterval?: number;
  }) {
    if (options.enabled !== undefined) {
      this.isEnabled = options.enabled;
    }
    if (options.batchSize) {
      this.batchSize = options.batchSize;
    }
    if (options.flushInterval) {
      this.flushInterval = options.flushInterval;
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.startAutoFlush();
      }
    }
  }

  // 🛑 Destruir monitor
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Último flush antes de destruir
  }
}

// 🌍 Instancia global
const performanceMonitor = new PerformanceMonitor();

// 🎯 Helpers para uso fácil
export const trackPageLoad = (route: string, loadTime: number) => {
  performanceMonitor.recordMetric({
    name: 'page-load',
    value: loadTime,
    route,
  });
};

export const trackApiCall = (endpoint: string, duration: number, success: boolean) => {
  performanceMonitor.recordMetric({
    name: 'api-response',
    value: duration,
    metadata: { endpoint, success },
  });
};

export const trackNavigation = (from: string, to: string, duration: number) => {
  performanceMonitor.recordNavigation({ from, to, duration });
};

export const trackError = (error: Error, route: string, severity: ErrorMetric['severity'] = 'medium') => {
  performanceMonitor.recordError({
    error: error.message,
    stack: error.stack,
    route,
    severity,
  });
};

export const trackUserInteraction = (action: string, component: string, route: string, duration?: number) => {
  performanceMonitor.recordUserInteraction({
    action,
    component,
    route,
    duration,
  });
};

// 📤 Exports
export default performanceMonitor;
export { PerformanceMonitor };
export type {
  PerformanceMetric,
  NavigationMetric,
  ErrorMetric,
  UserInteractionMetric,
};
