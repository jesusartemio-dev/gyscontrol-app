/**
 * 🚨 API Route - System Alerts
 * 
 * Endpoint para manejar alertas del sistema de monitoreo
 * y notificaciones críticas post-deployment.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { z } from 'zod';
import { processAlerts, type Alert } from '@/lib/monitoring/alerts';

// 📋 Esquemas de validación
const AlertSchema = z.object({
  type: z.enum(['performance', 'error', 'security', 'availability', 'custom']),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.any()).optional(),
  route: z.string().optional(),
  userId: z.string().optional(),
  timestamp: z.number().optional(),
});

const AlertPayloadSchema = z.object({
  alerts: z.array(AlertSchema),
  source: z.string().optional(),
  timestamp: z.number(),
});

// 🚨 Almacenamiento de alertas
interface AlertStore {
  alerts: any[];
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    alertsByType: Map<string, number>;
    alertsBySeverity: Map<string, number>;
    lastAlert: number;
  };
  channels: {
    slack: boolean;
    email: boolean;
    webhook: boolean;
  };
}

const alertStore: AlertStore = {
  alerts: [],
  summary: {
    totalAlerts: 0,
    criticalAlerts: 0,
    alertsByType: new Map(),
    alertsBySeverity: new Map(),
    lastAlert: 0,
  },
  channels: {
    slack: !!process.env.SLACK_WEBHOOK_URL,
    email: !!process.env.ALERT_EMAIL_ENDPOINT,
    webhook: !!process.env.CUSTOM_WEBHOOK_URL,
  },
};


// 📥 POST - Recibir alertas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ✅ Validar payload
    const validatedData = AlertPayloadSchema.parse(body);
    
    // 🕐 Agregar timestamp si no existe
    const alertsWithTimestamp = validatedData.alerts.map(alert => ({
      ...alert,
      timestamp: alert.timestamp || Date.now(),
    })) as Alert[];

    // 📤 Procesar y enviar alertas
    const results = await processAlerts(alertsWithTimestamp);

    // 📊 Actualizar estadísticas en memoria
    for (const alert of alertsWithTimestamp) {
      alertStore.summary.totalAlerts++
      if (alert.severity === 'critical') alertStore.summary.criticalAlerts++
      alertStore.summary.alertsByType.set(alert.type, (alertStore.summary.alertsByType.get(alert.type) || 0) + 1)
      alertStore.summary.alertsBySeverity.set(alert.severity, (alertStore.summary.alertsBySeverity.get(alert.severity) || 0) + 1)
      alertStore.summary.lastAlert = alert.timestamp
    }

    // 💾 Almacenar alertas
    alertStore.alerts.push(...alertsWithTimestamp);

    // 🧹 Limpiar alertas antiguas (mantener últimas 200)
    if (alertStore.alerts.length > 200) {
      alertStore.alerts = alertStore.alerts.slice(-200);
    }

    // 📤 Respuesta exitosa
    return NextResponse.json({
      success: true,
      processed: results,
      channels: alertStore.channels,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Error processing alerts:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid alert payload format',
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

// 📊 GET - Obtener resumen de alertas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    
    // 🕐 Calcular ventana de tiempo
    const now = Date.now();
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    
    const timeWindow = timeframes[timeframe as keyof typeof timeframes] || timeframes['24h'];
    const cutoff = now - timeWindow;

    // 🔍 Filtrar alertas
    let recentAlerts = alertStore.alerts.filter(a => a.timestamp > cutoff);
    
    if (type) {
      recentAlerts = recentAlerts.filter(a => a.type === type);
    }
    
    if (severity) {
      recentAlerts = recentAlerts.filter(a => a.severity === severity);
    }

    // 📈 Calcular estadísticas
    const alertsByType = new Map<string, number>();
    const alertsBySeverity = new Map<string, number>();
    const alertsByHour = new Map<number, number>();

    recentAlerts.forEach(alert => {
      alertsByType.set(alert.type, (alertsByType.get(alert.type) || 0) + 1);
      alertsBySeverity.set(alert.severity, (alertsBySeverity.get(alert.severity) || 0) + 1);
      
      const hour = Math.floor(alert.timestamp / (60 * 60 * 1000));
      alertsByHour.set(hour, (alertsByHour.get(hour) || 0) + 1);
    });

    const stats = {
      timeframe,
      filters: { type, severity },
      summary: {
        ...alertStore.summary,
        alertsByType: Object.fromEntries(alertStore.summary.alertsByType),
        alertsBySeverity: Object.fromEntries(alertStore.summary.alertsBySeverity),
      },
      channels: alertStore.channels,
      recent: {
        total: recentAlerts.length,
        byType: Object.fromEntries(alertsByType),
        bySeverity: Object.fromEntries(alertsBySeverity),
        timeline: Array.from(alertsByHour.entries())
          .sort(([a], [b]) => a - b)
          .map(([hour, count]) => ({
            hour: new Date(hour * 60 * 60 * 1000).toISOString(),
            count,
          })),
      },
      latestAlerts: recentAlerts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
        .map(a => ({
          type: a.type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          route: a.route,
          timestamp: a.timestamp,
        })),
    };

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: now,
    });

  } catch (error) {
    logger.error('Error fetching alerts summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch alerts summary' 
      },
      { status: 500 }
    );
  }
}

// 🧪 POST /test - Enviar alerta de prueba (solo desarrollo)
export async function PUT(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'Test alerts only available in development' },
      { status: 403 }
    );
  }

  const testAlert = {
    type: 'custom' as const,
    severity: 'info' as const,
    title: 'Test Alert',
    message: 'This is a test alert from the GYS monitoring system.',
    metadata: {
      test: true,
      environment: 'development',
      timestamp: new Date().toISOString(),
    },
    timestamp: Date.now(),
  };

  const results = await processAlerts([testAlert]);

  return NextResponse.json({
    success: true,
    message: 'Test alert sent',
    results,
    channels: alertStore.channels,
    timestamp: Date.now(),
  });
}
