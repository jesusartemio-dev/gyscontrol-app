/**
 * 📊 API Route - Métricas de Performance
 * 
 * Endpoint para recibir y procesar métricas de performance
 * del sistema de monitoreo post-deployment.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { z } from 'zod';

// 📋 Esquemas de validación
const PerformanceMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  timestamp: z.number(),
  route: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const NavigationMetricSchema = z.object({
  from: z.string(),
  to: z.string(),
  duration: z.number(),
  timestamp: z.number(),
  userId: z.string().optional(),
});

const UserInteractionSchema = z.object({
  action: z.string(),
  component: z.string(),
  route: z.string(),
  timestamp: z.number(),
  userId: z.string().optional(),
  duration: z.number().optional(),
});

const MetricsPayloadSchema = z.object({
  metrics: z.array(PerformanceMetricSchema),
  navigation: z.array(NavigationMetricSchema),
  interactions: z.array(UserInteractionSchema),
  timestamp: z.number(),
});

// 📊 Almacenamiento temporal (en producción usar base de datos)
interface MetricsStore {
  performance: any[];
  navigation: any[];
  interactions: any[];
  summary: {
    totalRequests: number;
    avgPageLoad: number;
    avgApiResponse: number;
    errorRate: number;
    lastUpdated: number;
  };
}

const metricsStore: MetricsStore = {
  performance: [],
  navigation: [],
  interactions: [],
  summary: {
    totalRequests: 0,
    avgPageLoad: 0,
    avgApiResponse: 0,
    errorRate: 0,
    lastUpdated: Date.now(),
  },
};

// 📈 Procesar métricas de performance
function processPerformanceMetrics(metrics: any[]) {
  const pageLoadMetrics = metrics.filter(m => m.name === 'page-load');
  const apiMetrics = metrics.filter(m => m.name === 'api-response');
  const webVitals = metrics.filter(m => ['LCP', 'FID', 'CLS'].includes(m.name));

  // 📊 Calcular promedios
  const avgPageLoad = pageLoadMetrics.length > 0 
    ? pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) / pageLoadMetrics.length
    : 0;

  const avgApiResponse = apiMetrics.length > 0
    ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
    : 0;

  // 🚨 Detectar problemas de performance
  const slowPageLoads = pageLoadMetrics.filter(m => m.value > 3000).length;
  const slowApiCalls = apiMetrics.filter(m => m.value > 1000).length;
  const poorLCP = webVitals.filter(m => m.name === 'LCP' && m.value > 2500).length;
  const poorFID = webVitals.filter(m => m.name === 'FID' && m.value > 100).length;
  const poorCLS = webVitals.filter(m => m.name === 'CLS' && m.value > 0.1).length;

  // 📝 Log de análisis
  logger.info('Performance Analysis:', {
    totalMetrics: metrics.length,
    avgPageLoad: Math.round(avgPageLoad),
    avgApiResponse: Math.round(avgApiResponse),
    issues: {
      slowPageLoads,
      slowApiCalls,
      poorLCP,
      poorFID,
      poorCLS,
    },
  });

  // 🔄 Actualizar resumen
  metricsStore.summary.avgPageLoad = avgPageLoad;
  metricsStore.summary.avgApiResponse = avgApiResponse;
  metricsStore.summary.lastUpdated = Date.now();

  return {
    processed: metrics.length,
    avgPageLoad,
    avgApiResponse,
    issues: {
      slowPageLoads,
      slowApiCalls,
      poorWebVitals: poorLCP + poorFID + poorCLS,
    },
  };
}

// 🧭 Procesar métricas de navegación
function processNavigationMetrics(navigation: any[]) {
  const routes = new Map<string, { count: number; avgDuration: number }>();

  navigation.forEach(nav => {
    const key = `${nav.from} -> ${nav.to}`;
    const existing = routes.get(key) || { count: 0, avgDuration: 0 };
    
    existing.count++;
    existing.avgDuration = (existing.avgDuration * (existing.count - 1) + nav.duration) / existing.count;
    
    routes.set(key, existing);
  });

  // 🐌 Detectar navegaciones lentas
  const slowNavigations = Array.from(routes.entries())
    .filter(([_, data]) => data.avgDuration > 1000)
    .map(([route, data]) => ({ route, ...data }));

  logger.info('Navigation Analysis:', {
    totalNavigations: navigation.length,
    uniqueRoutes: routes.size,
    slowNavigations: slowNavigations.length,
  });

  return {
    processed: navigation.length,
    uniqueRoutes: routes.size,
    slowNavigations,
  };
}

// 👆 Procesar interacciones de usuario
function processUserInteractions(interactions: any[]) {
  const components = new Map<string, number>();
  const actions = new Map<string, number>();

  interactions.forEach(interaction => {
    components.set(interaction.component, (components.get(interaction.component) || 0) + 1);
    actions.set(interaction.action, (actions.get(interaction.action) || 0) + 1);
  });

  const topComponents = Array.from(components.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  const topActions = Array.from(actions.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  logger.info('User Interaction Analysis:', {
    totalInteractions: interactions.length,
    uniqueComponents: components.size,
    uniqueActions: actions.size,
    topComponents: topComponents.slice(0, 5),
    topActions: topActions.slice(0, 5),
  });

  return {
    processed: interactions.length,
    topComponents,
    topActions,
  };
}

// 📥 POST - Recibir métricas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ✅ Validar payload
    const validatedData = MetricsPayloadSchema.parse(body);
    
    // 📊 Procesar cada tipo de métrica
    const performanceAnalysis = processPerformanceMetrics(validatedData.metrics);
    const navigationAnalysis = processNavigationMetrics(validatedData.navigation);
    const interactionAnalysis = processUserInteractions(validatedData.interactions);

    // 💾 Almacenar métricas (en producción: base de datos)
    metricsStore.performance.push(...validatedData.metrics);
    metricsStore.navigation.push(...validatedData.navigation);
    metricsStore.interactions.push(...validatedData.interactions);
    metricsStore.summary.totalRequests++;

    // 🧹 Limpiar datos antiguos (mantener últimas 1000 entradas)
    if (metricsStore.performance.length > 1000) {
      metricsStore.performance = metricsStore.performance.slice(-1000);
    }
    if (metricsStore.navigation.length > 1000) {
      metricsStore.navigation = metricsStore.navigation.slice(-1000);
    }
    if (metricsStore.interactions.length > 1000) {
      metricsStore.interactions = metricsStore.interactions.slice(-1000);
    }

    // 📤 Respuesta exitosa
    return NextResponse.json({
      success: true,
      processed: {
        performance: performanceAnalysis,
        navigation: navigationAnalysis,
        interactions: interactionAnalysis,
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Error processing metrics:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid payload format',
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

// 📊 GET - Obtener resumen de métricas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '1h';
    
    // 🕐 Calcular ventana de tiempo
    const now = Date.now();
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    
    const timeWindow = timeframes[timeframe as keyof typeof timeframes] || timeframes['1h'];
    const cutoff = now - timeWindow;

    // 🔍 Filtrar métricas por tiempo
    const recentPerformance = metricsStore.performance.filter(m => m.timestamp > cutoff);
    const recentNavigation = metricsStore.navigation.filter(m => m.timestamp > cutoff);
    const recentInteractions = metricsStore.interactions.filter(m => m.timestamp > cutoff);

    // 📈 Calcular estadísticas
    const pageLoadMetrics = recentPerformance.filter(m => m.name === 'page-load');
    const apiMetrics = recentPerformance.filter(m => m.name === 'api-response');
    const webVitals = recentPerformance.filter(m => ['LCP', 'FID', 'CLS'].includes(m.name));

    const stats = {
      timeframe,
      summary: {
        ...metricsStore.summary,
        recentMetrics: recentPerformance.length,
        recentNavigations: recentNavigation.length,
        recentInteractions: recentInteractions.length,
      },
      performance: {
        avgPageLoad: pageLoadMetrics.length > 0 
          ? Math.round(pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) / pageLoadMetrics.length)
          : 0,
        avgApiResponse: apiMetrics.length > 0
          ? Math.round(apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length)
          : 0,
        webVitals: {
          LCP: webVitals.filter(m => m.name === 'LCP').length,
          FID: webVitals.filter(m => m.name === 'FID').length,
          CLS: webVitals.filter(m => m.name === 'CLS').length,
        },
      },
      topRoutes: (Array.from(
        recentNavigation.reduce((acc, nav) => {
          acc.set(nav.to, (acc.get(nav.to) || 0) + 1);
          return acc;
        }, new Map<string, number>()).entries()
      ) as [string, number][]).sort(([,a], [,b]) => b - a).slice(0, 10),
    };

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: now,
    });

  } catch (error) {
    logger.error('Error fetching metrics summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch metrics' 
      },
      { status: 500 }
    );
  }
}

// 🧹 DELETE - Limpiar métricas (solo en desarrollo)
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'Not allowed in production' },
      { status: 403 }
    );
  }

  metricsStore.performance = [];
  metricsStore.navigation = [];
  metricsStore.interactions = [];
  metricsStore.summary = {
    totalRequests: 0,
    avgPageLoad: 0,
    avgApiResponse: 0,
    errorRate: 0,
    lastUpdated: Date.now(),
  };

  logger.info('Metrics store cleared');
  
  return NextResponse.json({
    success: true,
    message: 'Metrics cleared',
    timestamp: Date.now(),
  });
}
