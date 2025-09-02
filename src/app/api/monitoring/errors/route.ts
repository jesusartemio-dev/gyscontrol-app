/**
 * 🚨 API Route - Error Monitoring
 * 
 * Endpoint para recibir y procesar errores críticos
 * del sistema de monitoreo post-deployment.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// 📋 Esquemas de validación
const ErrorMetricSchema = z.object({
  error: z.string(),
  stack: z.string().optional(),
  route: z.string(),
  timestamp: z.number(),
  userId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

const ErrorPayloadSchema = z.object({
  errors: z.array(ErrorMetricSchema),
  timestamp: z.number(),
});

// 🚨 Almacenamiento de errores
interface ErrorStore {
  errors: any[];
  summary: {
    totalErrors: number;
    criticalErrors: number;
    errorsByRoute: Map<string, number>;
    errorsByType: Map<string, number>;
    lastError: number;
  };
}

const errorStore: ErrorStore = {
  errors: [],
  summary: {
    totalErrors: 0,
    criticalErrors: 0,
    errorsByRoute: new Map(),
    errorsByType: new Map(),
    lastError: 0,
  },
};

// 🔍 Clasificar tipo de error
function classifyError(error: string, stack?: string): string {
  const errorLower = error.toLowerCase();
  const stackLower = stack?.toLowerCase() || '';

  // 🌐 Errores de red
  if (errorLower.includes('fetch') || errorLower.includes('network') || errorLower.includes('timeout')) {
    return 'network';
  }

  // 🔐 Errores de autenticación
  if (errorLower.includes('unauthorized') || errorLower.includes('forbidden') || errorLower.includes('auth')) {
    return 'authentication';
  }

  // 📊 Errores de base de datos
  if (errorLower.includes('prisma') || errorLower.includes('database') || errorLower.includes('sql')) {
    return 'database';
  }

  // ✅ Errores de validación
  if (errorLower.includes('validation') || errorLower.includes('zod') || errorLower.includes('invalid')) {
    return 'validation';
  }

  // ⚛️ Errores de React
  if (stackLower.includes('react') || stackLower.includes('jsx') || stackLower.includes('component')) {
    return 'react';
  }

  // 🎯 Errores de API
  if (errorLower.includes('api') || errorLower.includes('endpoint') || stackLower.includes('/api/')) {
    return 'api';
  }

  // 📱 Errores de cliente
  if (stackLower.includes('client') || errorLower.includes('browser')) {
    return 'client';
  }

  return 'unknown';
}

// 📊 Procesar errores
function processErrors(errors: any[]) {
  const analysis = {
    total: errors.length,
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    byType: new Map<string, number>(),
    byRoute: new Map<string, number>(),
    patterns: [] as string[],
  };

  errors.forEach(error => {
    // 📈 Contar por severidad
    analysis.bySeverity[error.severity as keyof typeof analysis.bySeverity]++;

    // 🏷️ Clasificar por tipo
    const errorType = classifyError(error.error, error.stack);
    analysis.byType.set(errorType, (analysis.byType.get(errorType) || 0) + 1);

    // 🧭 Contar por ruta
    analysis.byRoute.set(error.route, (analysis.byRoute.get(error.route) || 0) + 1);

    // 🔍 Detectar patrones comunes
    const errorMessage = error.error.toLowerCase();
    if (errorMessage.includes('timeout') && !analysis.patterns.includes('timeout')) {
      analysis.patterns.push('timeout');
    }
    if (errorMessage.includes('memory') && !analysis.patterns.includes('memory')) {
      analysis.patterns.push('memory');
    }
    if (errorMessage.includes('permission') && !analysis.patterns.includes('permission')) {
      analysis.patterns.push('permission');
    }
  });

  // 🚨 Detectar problemas críticos
  const criticalIssues = [];
  
  if (analysis.bySeverity.critical > 0) {
    criticalIssues.push(`${analysis.bySeverity.critical} critical errors detected`);
  }
  
  if (analysis.bySeverity.high > 5) {
    criticalIssues.push(`High error rate: ${analysis.bySeverity.high} high-severity errors`);
  }

  // 🔥 Rutas con muchos errores
  const problematicRoutes = Array.from(analysis.byRoute.entries())
    .filter(([_, count]) => count > 3)
    .map(([route, count]) => ({ route, count }));

  if (problematicRoutes.length > 0) {
    criticalIssues.push(`Problematic routes detected: ${problematicRoutes.length}`);
  }

  // 📝 Log del análisis
  logger.error('Error Analysis:', {
    total: analysis.total,
    severity: analysis.bySeverity,
    topTypes: Array.from(analysis.byType.entries()).sort(([,a], [,b]) => b - a).slice(0, 5),
    criticalIssues,
    patterns: analysis.patterns,
  });

  // 🔄 Actualizar store
  errorStore.summary.totalErrors += analysis.total;
  errorStore.summary.criticalErrors += analysis.bySeverity.critical;
  errorStore.summary.lastError = Date.now();

  // 🔄 Actualizar contadores por ruta y tipo
  analysis.byRoute.forEach((count, route) => {
    errorStore.summary.errorsByRoute.set(
      route, 
      (errorStore.summary.errorsByRoute.get(route) || 0) + count
    );
  });

  analysis.byType.forEach((count, type) => {
    errorStore.summary.errorsByType.set(
      type,
      (errorStore.summary.errorsByType.get(type) || 0) + count
    );
  });

  return {
    processed: analysis.total,
    severity: analysis.bySeverity,
    criticalIssues,
    patterns: analysis.patterns,
    problematicRoutes,
  };
}

// 📧 Enviar alertas críticas
async function sendCriticalAlert(errors: any[]) {
  const criticalErrors = errors.filter(e => e.severity === 'critical');
  
  if (criticalErrors.length === 0) return;

  const alert = {
    type: 'critical_errors',
    count: criticalErrors.length,
    errors: criticalErrors.map(e => ({
      message: e.error,
      route: e.route,
      timestamp: e.timestamp,
    })),
    timestamp: Date.now(),
  };

  try {
    // 🚨 En producción: enviar a Slack, email, etc.
    logger.error('CRITICAL ALERT:', alert);
    
    // Ejemplo: webhook de Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 CRITICAL ERRORS DETECTED: ${criticalErrors.length} errors`,
          attachments: [{
            color: 'danger',
            fields: criticalErrors.slice(0, 5).map(e => ({
              title: e.route,
              value: e.error,
              short: false,
            })),
          }],
        }),
      });
    }

    // Ejemplo: email de alerta
    if (process.env.ALERT_EMAIL_ENDPOINT) {
      await fetch(process.env.ALERT_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    }

  } catch (alertError) {
    logger.error('Failed to send critical alert:', alertError);
  }
}

// 📥 POST - Recibir errores
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ✅ Validar payload
    const validatedData = ErrorPayloadSchema.parse(body);
    
    // 📊 Procesar errores
    const analysis = processErrors(validatedData.errors);

    // 💾 Almacenar errores
    errorStore.errors.push(...validatedData.errors);

    // 🧹 Limpiar errores antiguos (mantener últimos 500)
    if (errorStore.errors.length > 500) {
      errorStore.errors = errorStore.errors.slice(-500);
    }

    // 🚨 Enviar alertas críticas
    await sendCriticalAlert(validatedData.errors);

    // 📤 Respuesta exitosa
    return NextResponse.json({
      success: true,
      processed: analysis,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Error processing error metrics:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid error payload format',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// 📊 GET - Obtener resumen de errores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '1h';
    const severity = searchParams.get('severity');
    
    // 🕐 Calcular ventana de tiempo
    const now = Date.now();
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    
    const timeWindow = timeframes[timeframe as keyof typeof timeframes] || timeframes['1h'];
    const cutoff = now - timeWindow;

    // 🔍 Filtrar errores
    let recentErrors = errorStore.errors.filter(e => e.timestamp > cutoff);
    
    if (severity) {
      recentErrors = recentErrors.filter(e => e.severity === severity);
    }

    // 📈 Calcular estadísticas
    const errorsByRoute = new Map<string, number>();
    const errorsByType = new Map<string, number>();
    const errorsBySeverity = { low: 0, medium: 0, high: 0, critical: 0 };

    recentErrors.forEach(error => {
      errorsByRoute.set(error.route, (errorsByRoute.get(error.route) || 0) + 1);
      
      const errorType = classifyError(error.error, error.stack);
      errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1);
      
      errorsBySeverity[error.severity as keyof typeof errorsBySeverity]++;
    });

    const stats = {
      timeframe,
      filter: { severity },
      summary: {
        total: recentErrors.length,
        ...errorStore.summary,
        errorsByRoute: Object.fromEntries(errorStore.summary.errorsByRoute),
        errorsByType: Object.fromEntries(errorStore.summary.errorsByType),
      },
      recent: {
        total: recentErrors.length,
        bySeverity: errorsBySeverity,
        topRoutes: Array.from(errorsByRoute.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topTypes: Array.from(errorsByType.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
      },
      latestErrors: recentErrors
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
        .map(e => ({
          error: e.error,
          route: e.route,
          severity: e.severity,
          timestamp: e.timestamp,
        })),
    };

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: now,
    });

  } catch (error) {
    logger.error('Error fetching error summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch error summary' 
      },
      { status: 500 }
    );
  }
}

// 🧹 DELETE - Limpiar errores (solo en desarrollo)
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'Not allowed in production' },
      { status: 403 }
    );
  }

  errorStore.errors = [];
  errorStore.summary = {
    totalErrors: 0,
    criticalErrors: 0,
    errorsByRoute: new Map(),
    errorsByType: new Map(),
    lastError: 0,
  };

  logger.info('Error store cleared');
  
  return NextResponse.json({
    success: true,
    message: 'Error store cleared',
    timestamp: Date.now(),
  });
}