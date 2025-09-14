// ===================================================
// 🧪 Tests para usePerformanceAlerts - Sistema GYS
// ===================================================
// Tests unitarios para el sistema de alertas de performance
// Validación de detección, resolución y configuración de alertas

import { renderHook, act } from '@testing-library/react';
import { usePerformanceAlerts, useComponentPerformanceAlerts, useSystemPerformanceAlerts } from './usePerformanceAlerts';

// 🎯 Mocks necesarios
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// 🔔 Mock para Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'granted',
    requestPermission: jest.fn().mockResolvedValue('granted'),
  },
  writable: true,
});

// ⏰ Mock para timers
jest.useFakeTimers();

describe('🚨 usePerformanceAlerts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('📊 Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePerformanceAlerts());

      expect(result.current.alerts).toEqual([]);
      expect(result.current.activeAlerts).toEqual([]);
      expect(result.current.alertCount).toBe(0);
      expect(result.current.hasActiveAlerts).toBe(false);
      expect(result.current.currentMetrics).toBeNull();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        enabled: false,
        maxAlerts: 10,
        thresholds: {
          slowRender: 50,
          verySlowRender: 100,
          criticalRender: 200,
          highMemoryUsage: 100,
          criticalMemoryUsage: 200,
          excessiveReRenders: 20,
          criticalReRenders: 40,
          slowApiResponse: 2000,
          timeoutApiResponse: 10000,
          lowFPS: 20,
          criticalFPS: 10,
        },
      };

      const { result } = renderHook(() => usePerformanceAlerts(customConfig));

      // ✅ Con alertas deshabilitadas, no debería generar alertas
      act(() => {
        result.current.addMetrics({
          renderTime: 150, // Por encima del threshold personalizado
          memoryUsage: 150,
        });
      });

      expect(result.current.alerts).toHaveLength(0);
    });
  });

  describe('⏱️ Render Time Alerts', () => {
    it('should generate warning alert for slow render', () => {
      const { result } = renderHook(() => usePerformanceAlerts({
        enabled: true,
        thresholds: {
          slowRender: 16,
          verySlowRender: 50,
          criticalRender: 100,
          highMemoryUsage: 50,
          criticalMemoryUsage: 100,
          excessiveReRenders: 10,
          criticalReRenders: 20,
          slowApiResponse: 1000,
          timeoutApiResponse: 5000,
          lowFPS: 30,
          criticalFPS: 15,
        },
      }));

      act(() => {
        result.current.addMetrics({
          renderTime: 25, // Entre slowRender y verySlowRender
          memoryUsage: 10,
          reRenderCount: 2,
          apiResponseTime: 500,
          fps: 60,
        }, 'TestComponent');
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('warning');
      expect(result.current.alerts[0].category).toBe('render');
      expect(result.current.alerts[0].component).toBe('TestComponent');
      expect(result.current.alerts[0].message).toContain('Render time above optimal');
      expect(result.current.hasActiveAlerts).toBe(true);
    });

    it('should generate error alert for very slow render', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          renderTime: 75, // Entre verySlowRender y criticalRender
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('error');
      expect(result.current.alerts[0].category).toBe('render');
      expect(result.current.alerts[0].message).toContain('Slow render detected');
    });

    it('should generate critical alert for critical render time', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          renderTime: 150, // Por encima de criticalRender
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('critical');
      expect(result.current.alerts[0].category).toBe('render');
      expect(result.current.alerts[0].message).toContain('Critical render time detected');
    });
  });

  describe('💾 Memory Alerts', () => {
    it('should generate warning alert for high memory usage', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          memoryUsage: 75, // Entre highMemoryUsage y criticalMemoryUsage
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('warning');
      expect(result.current.alerts[0].category).toBe('memory');
      expect(result.current.alerts[0].message).toContain('High memory usage');
    });

    it('should generate critical alert for critical memory usage', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          memoryUsage: 150, // Por encima de criticalMemoryUsage
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('critical');
      expect(result.current.alerts[0].category).toBe('memory');
      expect(result.current.alerts[0].message).toContain('Critical memory usage');
    });
  });

  describe('🔄 Re-render Alerts', () => {
    it('should generate error alert for excessive re-renders', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          reRenderCount: 15, // Entre excessiveReRenders y criticalReRenders
        }, 'TestComponent');
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('error');
      expect(result.current.alerts[0].category).toBe('rerender');
      expect(result.current.alerts[0].message).toContain('Excessive re-renders');
    });

    it('should generate critical alert for critical re-renders', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          reRenderCount: 25, // Por encima de criticalReRenders
        }, 'TestComponent');
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('critical');
      expect(result.current.alerts[0].category).toBe('rerender');
      expect(result.current.alerts[0].message).toContain('Critical re-render count');
    });
  });

  describe('📡 Network Alerts', () => {
    it('should generate warning alert for slow API response', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          apiResponseTime: 2000, // Entre slowApiResponse y timeoutApiResponse
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('warning');
      expect(result.current.alerts[0].category).toBe('network');
      expect(result.current.alerts[0].message).toContain('Slow API response');
    });

    it('should generate critical alert for API timeout', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          apiResponseTime: 6000, // Por encima de timeoutApiResponse
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('critical');
      expect(result.current.alerts[0].category).toBe('network');
      expect(result.current.alerts[0].message).toContain('API timeout');
    });
  });

  describe('🎯 FPS Alerts', () => {
    it('should generate warning alert for low FPS', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          fps: 25, // Entre criticalFPS y lowFPS
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('warning');
      expect(result.current.alerts[0].category).toBe('fps');
      expect(result.current.alerts[0].message).toContain('Low FPS');
    });

    it('should generate critical alert for critical FPS', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          fps: 10, // Por debajo de criticalFPS
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].type).toBe('critical');
      expect(result.current.alerts[0].category).toBe('fps');
      expect(result.current.alerts[0].message).toContain('Critical FPS');
    });

    it('should not generate FPS alerts for zero FPS', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      act(() => {
        result.current.addMetrics({
          fps: 0, // FPS de 0 no debería generar alerta
        });
      });

      expect(result.current.alerts).toHaveLength(0);
    });
  });

  describe('🎛️ Alert Management', () => {
    it('should resolve alerts manually', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      // 🚨 Generar alerta
      act(() => {
        result.current.addMetrics({ renderTime: 150 });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].resolved).toBe(false);
      expect(result.current.hasActiveAlerts).toBe(true);

      // ✅ Resolver alerta
      act(() => {
        result.current.resolveAlert(result.current.alerts[0].id);
      });

      expect(result.current.alerts[0].resolved).toBe(true);
      expect(result.current.alerts[0].duration).toBeGreaterThan(0);
      expect(result.current.hasActiveAlerts).toBe(false);
    });

    it('should auto-resolve alerts after timeout', () => {
      const { result } = renderHook(() => usePerformanceAlerts({
        enabled: true,
        autoResolveTime: 1000, // 1 segundo
      }));

      // 🚨 Generar alerta
      act(() => {
        result.current.addMetrics({ renderTime: 150 });
      });

      expect(result.current.alerts[0].resolved).toBe(false);

      // ⏰ Avanzar tiempo
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.alerts[0].resolved).toBe(true);
    });

    it('should clear all alerts', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      // 🚨 Generar múltiples alertas
      act(() => {
        result.current.addMetrics({ renderTime: 150 });
        result.current.addMetrics({ memoryUsage: 150 });
      });

      expect(result.current.alerts).toHaveLength(2);

      // 🧹 Limpiar todas las alertas
      act(() => {
        result.current.clearAlerts();
      });

      expect(result.current.alerts).toHaveLength(0);
      expect(result.current.hasActiveAlerts).toBe(false);
    });

    it('should toggle alerts on/off', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      // 🚨 Generar alerta cuando está habilitado
      act(() => {
        result.current.addMetrics({ renderTime: 150 });
      });

      expect(result.current.alerts).toHaveLength(1);

      // 🔄 Deshabilitar alertas
      act(() => {
        result.current.toggleAlerts(false);
      });

      // 🚫 No debería generar nuevas alertas
      act(() => {
        result.current.addMetrics({ renderTime: 200 });
      });

      expect(result.current.alerts).toHaveLength(0); // Se limpiaron al deshabilitar

      // ✅ Habilitar de nuevo
      act(() => {
        result.current.toggleAlerts(true);
      });

      // 🚨 Ahora sí debería generar alertas
      act(() => {
        result.current.addMetrics({ renderTime: 200 });
      });

      expect(result.current.alerts).toHaveLength(1);
    });
  });

  describe('⏰ Alert Cooldown', () => {
    it('should respect alert cooldown period', () => {
      const { result } = renderHook(() => usePerformanceAlerts({
        enabled: true,
        alertCooldown: 5000, // 5 segundos
      }));

      // 🚨 Primera alerta
      act(() => {
        result.current.addMetrics({ renderTime: 150 }, 'TestComponent');
      });

      expect(result.current.alerts).toHaveLength(1);

      // 🚫 Segunda alerta inmediata (debería ser bloqueada por cooldown)
      act(() => {
        result.current.addMetrics({ renderTime: 160 }, 'TestComponent');
      });

      expect(result.current.alerts).toHaveLength(1); // No nueva alerta

      // ⏰ Avanzar tiempo más allá del cooldown
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      // 🚨 Ahora sí debería generar nueva alerta
      act(() => {
        result.current.addMetrics({ renderTime: 170 }, 'TestComponent');
      });

      expect(result.current.alerts).toHaveLength(2);
    });
  });

  describe('📊 Statistics', () => {
    it('should provide accurate alert statistics', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      // 🚨 Generar diferentes tipos de alertas
      act(() => {
        result.current.addMetrics({ renderTime: 25 }); // warning
        result.current.addMetrics({ renderTime: 75 }); // error
        result.current.addMetrics({ renderTime: 150 }); // critical
        result.current.addMetrics({ memoryUsage: 75 }); // warning
      });

      const stats = result.current.getAlertStats();

      expect(stats.total).toBe(4);
      expect(stats.byType.warning).toBe(2);
      expect(stats.byType.error).toBe(1);
      expect(stats.byType.critical).toBe(1);
      expect(stats.byCategory.render).toBe(3);
      expect(stats.byCategory.memory).toBe(1);
      expect(stats.resolved).toBe(0);

      // ✅ Resolver una alerta
      act(() => {
        result.current.resolveAlert(result.current.alerts[0].id);
      });

      const updatedStats = result.current.getAlertStats();
      expect(updatedStats.resolved).toBe(1);
      expect(updatedStats.avgResolutionTime).toBeGreaterThan(0);
    });
  });

  describe('📈 Metrics History', () => {
    it('should update current metrics', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      const testMetrics = {
        renderTime: 25,
        memoryUsage: 30,
        reRenderCount: 3,
        apiResponseTime: 800,
        fps: 55,
      };

      act(() => {
        result.current.addMetrics(testMetrics);
      });

      expect(result.current.currentMetrics).toMatchObject(testMetrics);
      expect(result.current.currentMetrics?.timestamp).toBeGreaterThan(0);
    });
  });

  describe('⚙️ Threshold Updates', () => {
    it('should allow updating thresholds', () => {
      const { result } = renderHook(() => usePerformanceAlerts({ enabled: true }));

      // 🚨 Con thresholds por defecto, esto genera alerta
      act(() => {
        result.current.addMetrics({ renderTime: 25 });
      });

      expect(result.current.alerts).toHaveLength(1);

      // ⚙️ Actualizar thresholds
      act(() => {
        result.current.updateThresholds({
          slowRender: 50, // Aumentar threshold
        });
      });

      // 🧹 Limpiar alertas existentes
      act(() => {
        result.current.clearAlerts();
      });

      // 🚫 Con nuevo threshold, esto no debería generar alerta
      act(() => {
        result.current.addMetrics({ renderTime: 25 });
      });

      expect(result.current.alerts).toHaveLength(0);
    });
  });
});

describe('🧩 useComponentPerformanceAlerts Hook', () => {
  it('should filter alerts by component', () => {
    const { result } = renderHook(() => 
      useComponentPerformanceAlerts('TestComponent', { enabled: true })
    );

    // 🚨 Generar alertas para diferentes componentes
    act(() => {
      result.current.addMetrics({ renderTime: 150 }); // Para TestComponent
    });

    // 🚨 Generar alerta para otro componente usando el hook base
    const { result: baseResult } = renderHook(() => usePerformanceAlerts({ enabled: true }));
    act(() => {
      baseResult.current.addMetrics({ renderTime: 150 }, 'OtherComponent');
    });

    // ✅ Solo debería tener alertas del componente específico
    expect(result.current.componentAlerts).toHaveLength(1);
    expect(result.current.componentAlerts[0].component).toBe('TestComponent');
    expect(result.current.activeComponentAlerts).toHaveLength(1);
  });
});

describe('🏥 useSystemPerformanceAlerts Hook', () => {
  it('should provide system health metrics', () => {
    const { result } = renderHook(() => useSystemPerformanceAlerts());

    // 🚨 Generar diferentes tipos de alertas
    act(() => {
      result.current.addMetrics({ renderTime: 150 }); // critical
      result.current.addMetrics({ renderTime: 75 }); // error
      result.current.addMetrics({ renderTime: 25 }); // warning
    });

    const systemHealth = result.current.getSystemHealth();

    expect(systemHealth.score).toBeLessThan(100); // Debería reducirse por las alertas
    expect(systemHealth.criticalIssues).toBe(1);
    expect(systemHealth.totalIssues).toBe(3);
    expect(systemHealth.status).toBeDefined();
    expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(systemHealth.status);
  });

  it('should calculate health score correctly', () => {
    const { result } = renderHook(() => useSystemPerformanceAlerts());

    // 🏥 Sistema saludable inicialmente
    let systemHealth = result.current.getSystemHealth();
    expect(systemHealth.score).toBe(100);
    expect(systemHealth.status).toBe('excellent');

    // 🚨 Agregar alerta crítica
    act(() => {
      result.current.addMetrics({ renderTime: 150 }); // critical
    });

    systemHealth = result.current.getSystemHealth();
    expect(systemHealth.score).toBe(65); // 100 - 30 (critical) - 5 (active)
    expect(systemHealth.status).toBe('good');

    // 🚨 Agregar más alertas
    act(() => {
      result.current.addMetrics({ renderTime: 75 }); // error
      result.current.addMetrics({ renderTime: 25 }); // warning
    });

    systemHealth = result.current.getSystemHealth();
    expect(systemHealth.score).toBe(35); // 100 - 30 - 15 - 5 - 5 - 5 - 5
    expect(systemHealth.status).toBe('poor');
  });
});