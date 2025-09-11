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

// 📧 Enviar alerta por Slack
async function sendSlackAlert(alert: any) {
  if (!process.env.SLACK_WEBHOOK_URL) return false;

  const colors = {
    info: 'good',
    warning: 'warning', 
    error: 'danger',
    critical: 'danger',
  };

  const emojis = {
    performance: '⚡',
    error: '🚨',
    security: '🔒',
    availability: '🌐',
    custom: '📢',
  };

  try {
    const payload = {
      text: `${emojis[alert.type as keyof typeof emojis]} ${alert.title}`,
      attachments: [{
        color: colors[alert.severity as keyof typeof colors],
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true,
          },
          {
            title: 'Type',
            value: alert.type,
            short: true,
          },
          {
            title: 'Message',
            value: alert.message,
            short: false,
          },
          ...(alert.route ? [{
            title: 'Route',
            value: alert.route,
            short: true,
          }] : []),
          ...(alert.metadata ? [{
            title: 'Details',
            value: JSON.stringify(alert.metadata, null, 2),
            short: false,
          }] : []),
        ],
        footer: 'GYS Monitoring System',
        ts: Math.floor(alert.timestamp / 1000),
      }],
    };

    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to send Slack alert:', error);
    return false;
  }
}

// 📧 Enviar alerta por email
async function sendEmailAlert(alert: any) {
  if (!process.env.ALERT_EMAIL_ENDPOINT) return false;

  try {
    const payload = {
      to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || ['admin@gys.com'],
      subject: `[GYS Alert] ${alert.severity.toUpperCase()}: ${alert.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'error' ? '#ea580c' : alert.severity === 'warning' ? '#d97706' : '#059669'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${alert.title}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Severity: ${alert.severity.toUpperCase()} | Type: ${alert.type}</p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #374151; margin-top: 0;">Message</h2>
            <p style="color: #6b7280; line-height: 1.6;">${alert.message}</p>
            
            ${alert.route ? `
              <h3 style="color: #374151;">Route</h3>
              <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${alert.route}</code>
            ` : ''}
            
            ${alert.metadata ? `
              <h3 style="color: #374151;">Additional Details</h3>
              <pre style="background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 14px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 14px;">
              <p>Timestamp: ${new Date(alert.timestamp).toLocaleString()}</p>
              <p>Generated by GYS Monitoring System</p>
            </div>
          </div>
        </div>
      `,
      alert,
    };

    const response = await fetch(process.env.ALERT_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to send email alert:', error);
    return false;
  }
}

// 🔗 Enviar alerta por webhook personalizado
async function sendWebhookAlert(alert: any) {
  if (!process.env.CUSTOM_WEBHOOK_URL) return false;

  try {
    const payload = {
      event: 'gys_alert',
      alert,
      timestamp: Date.now(),
      source: 'gys-monitoring',
    };

    const response = await fetch(process.env.CUSTOM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-GYS-Signature': process.env.WEBHOOK_SECRET || 'gys-secret',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to send webhook alert:', error);
    return false;
  }
}

// 📤 Procesar y enviar alertas
async function processAlerts(alerts: any[]) {
  const results = {
    processed: alerts.length,
    sent: {
      slack: 0,
      email: 0,
      webhook: 0,
    },
    failed: {
      slack: 0,
      email: 0,
      webhook: 0,
    },
  };

  for (const alert of alerts) {
    // 📊 Actualizar estadísticas
    alertStore.summary.totalAlerts++;
    if (alert.severity === 'critical') {
      alertStore.summary.criticalAlerts++;
    }
    
    alertStore.summary.alertsByType.set(
      alert.type,
      (alertStore.summary.alertsByType.get(alert.type) || 0) + 1
    );
    
    alertStore.summary.alertsBySeverity.set(
      alert.severity,
      (alertStore.summary.alertsBySeverity.get(alert.severity) || 0) + 1
    );
    
    alertStore.summary.lastAlert = alert.timestamp;

    // 📤 Enviar por todos los canales habilitados
    const promises = [];

    // 🔔 Slack (para alertas warning y superiores)
    if (alertStore.channels.slack && ['warning', 'error', 'critical'].includes(alert.severity)) {
      promises.push(
        sendSlackAlert(alert).then(success => {
          if (success) results.sent.slack++;
          else results.failed.slack++;
        })
      );
    }

    // 📧 Email (para alertas error y críticas)
    if (alertStore.channels.email && ['error', 'critical'].includes(alert.severity)) {
      promises.push(
        sendEmailAlert(alert).then(success => {
          if (success) results.sent.email++;
          else results.failed.email++;
        })
      );
    }

    // 🔗 Webhook (para todas las alertas)
    if (alertStore.channels.webhook) {
      promises.push(
        sendWebhookAlert(alert).then(success => {
          if (success) results.sent.webhook++;
          else results.failed.webhook++;
        })
      );
    }

    // ⏳ Esperar envíos
    await Promise.allSettled(promises);

    // 📝 Log de la alerta
    logger.info(`Alert processed: ${alert.type}/${alert.severity} - ${alert.title}`);
  }

  return results;
}

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
    }));

    // 📤 Procesar y enviar alertas
    const results = await processAlerts(alertsWithTimestamp);

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
