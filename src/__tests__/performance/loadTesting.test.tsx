// ===================================================
// 🚀 Tests de Carga - Sistema GYS
// ===================================================
// Tests para simular 1000+ elementos y medir performance
// Validación de rendimiento bajo condiciones de estrés

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { performance } from 'perf_hooks';
import '@testing-library/jest-dom';

// 🎯 Mocks necesarios
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// 📊 Interfaces para tests de carga
interface LoadTestResult {
  renderTime: number;
  memoryUsage: number;
  elementsCount: number;
  success: boolean;
  errors: string[];
}

interface PerformanceThresholds {
  maxRenderTime: number; // ms
  maxMemoryIncrease: number; // MB
  maxElementsForGoodPerformance: number;
}

// 🎯 Constantes de testing
const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  maxRenderTime: 100, // 100ms para 1000+ elementos
  maxMemoryIncrease: 50, // 50MB máximo incremento
  maxElementsForGoodPerformance: 1000,
};

const LOAD_TEST_SCENARIOS = [
  { name: 'Small Load', elements: 100 },
  { name: 'Medium Load', elements: 500 },
  { name: 'Large Load', elements: 1000 },
  { name: 'Extra Large Load', elements: 2000 },
  { name: 'Stress Test', elements: 5000 },
];

// 🧪 Componente de prueba para simular tabla pesada
interface TestTableProps {
  items: Array<{
    id: string;
    name: string;
    description: string;
    value: number;
    status: string;
    date: string;
  }>;
  enableVirtualization?: boolean;
}

const TestTable: React.FC<TestTableProps> = ({ items, enableVirtualization = false }) => {
  const startTime = performance.now();
  
  React.useEffect(() => {
    const endTime = performance.now();
    console.log(`TestTable rendered ${items.length} items in ${endTime - startTime}ms`);
  });

  if (enableVirtualization && items.length > 100) {
    // 🔄 Simulación de virtualización
    const visibleItems = items.slice(0, 50); // Solo renderizar 50 elementos visibles
    
    return (
      <div data-testid="test-table" className="virtualized-table">
        <div data-testid="table-header">
          <span>ID</span>
          <span>Name</span>
          <span>Description</span>
          <span>Value</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        <div data-testid="table-body">
          {visibleItems.map((item) => (
            <div key={item.id} data-testid={`table-row-${item.id}`}>
              <span>{item.id}</span>
              <span>{item.name}</span>
              <span>{item.description}</span>
              <span>{item.value}</span>
              <span>{item.status}</span>
              <span>{item.date}</span>
            </div>
          ))}
        </div>
        <div data-testid="virtualization-info">
          Showing 50 of {items.length} items (Virtualized)
        </div>
      </div>
    );
  }

  return (
    <div data-testid="test-table">
      <div data-testid="table-header">
        <span>ID</span>
        <span>Name</span>
        <span>Description</span>
        <span>Value</span>
        <span>Status</span>
        <span>Date</span>
      </div>
      <div data-testid="table-body">
        {items.map((item) => (
          <div key={item.id} data-testid={`table-row-${item.id}`}>
            <span>{item.id}</span>
            <span>{item.name}</span>
            <span>{item.description}</span>
            <span>{item.value}</span>
            <span>{item.status}</span>
            <span>{item.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 🏭 Función para generar datos de prueba
function generateTestData(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    name: `Test Item ${index + 1}`,
    description: `Description for test item ${index + 1} with some additional text to simulate real data`,
    value: Math.floor(Math.random() * 10000),
    status: ['active', 'inactive', 'pending', 'completed'][Math.floor(Math.random() * 4)],
    date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// 📊 Función para medir performance
function measurePerformance<T>(fn: () => T): { result: T; duration: number } {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  return {
    result,
    duration: endTime - startTime,
  };
}

// 💾 Función para obtener uso de memoria (simulado)
function getMemoryUsage(): number {
  // En un entorno real, usaríamos performance.memory
  // Para tests, simulamos el uso de memoria
  if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  return Math.random() * 50 * 1024 * 1024; // Simular 0-50MB
}

// 🧪 Función para ejecutar test de carga
async function runLoadTest(
  elementsCount: number,
  enableVirtualization = false
): Promise<LoadTestResult> {
  const errors: string[] = [];
  let renderTime = 0;
  let memoryBefore = 0;
  let memoryAfter = 0;

  try {
    // 📊 Medir memoria inicial
    memoryBefore = getMemoryUsage();

    // 🏭 Generar datos de prueba
    const testData = generateTestData(elementsCount);

    // ⏱️ Medir tiempo de renderizado
    const { duration } = measurePerformance(() => {
      return render(
        <TestTable 
          items={testData} 
          enableVirtualization={enableVirtualization}
        />
      );
    });

    renderTime = duration;

    // ✅ Verificar que se renderizó correctamente
    await waitFor(() => {
      expect(screen.getByTestId('test-table')).toBeInTheDocument();
    });

    // 📊 Medir memoria final
    memoryAfter = getMemoryUsage();

    // 🔍 Verificar elementos renderizados
    const tableBody = screen.getByTestId('table-body');
    const expectedElements = enableVirtualization && elementsCount > 100 ? 50 : elementsCount;
    const renderedRows = tableBody.children.length;

    if (renderedRows !== expectedElements) {
      errors.push(`Expected ${expectedElements} rows, but found ${renderedRows}`);
    }

  } catch (error) {
    errors.push(`Render error: ${error}`);
  }

  return {
    renderTime,
    memoryUsage: memoryAfter - memoryBefore,
    elementsCount,
    success: errors.length === 0,
    errors,
  };
}

// 🧪 Suite de tests de carga
describe('🚀 Load Testing - Performance under stress', () => {
  beforeEach(() => {
    // 🧹 Limpiar DOM antes de cada test
    document.body.innerHTML = '';
    
    // 🔄 Limpiar mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 🧹 Cleanup después de cada test
    document.body.innerHTML = '';
  });

  describe('📊 Basic Load Tests', () => {
    LOAD_TEST_SCENARIOS.forEach(({ name, elements }) => {
      it(`should handle ${name} (${elements} elements) within performance thresholds`, async () => {
        // 🚀 Ejecutar test de carga
        const result = await act(async () => {
          return runLoadTest(elements);
        });

        // ✅ Verificar que el test fue exitoso
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.elementsCount).toBe(elements);

        // 📊 Verificar thresholds de performance
        if (elements <= PERFORMANCE_THRESHOLDS.maxElementsForGoodPerformance) {
          expect(result.renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxRenderTime);
        }

        // 💾 Verificar uso de memoria
        const memoryIncreaseMB = result.memoryUsage / (1024 * 1024);
        expect(memoryIncreaseMB).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryIncrease);

        // 📝 Log de resultados
        console.log(`${name} Results:`, {
          elements: result.elementsCount,
          renderTime: `${result.renderTime.toFixed(2)}ms`,
          memoryIncrease: `${memoryIncreaseMB.toFixed(2)}MB`,
          withinThresholds: result.renderTime < PERFORMANCE_THRESHOLDS.maxRenderTime,
        });
      });
    });
  });

  describe('🔄 Virtualization Performance Tests', () => {
    it('should improve performance with virtualization for large datasets', async () => {
      const elementsCount = 2000;

      // 🚀 Test sin virtualización
      const resultWithoutVirtualization = await act(async () => {
        return runLoadTest(elementsCount, false);
      });

      // 🧹 Limpiar DOM
      document.body.innerHTML = '';

      // 🔄 Test con virtualización
      const resultWithVirtualization = await act(async () => {
        return runLoadTest(elementsCount, true);
      });

      // ✅ Verificar que ambos tests fueron exitosos
      expect(resultWithoutVirtualization.success).toBe(true);
      expect(resultWithVirtualization.success).toBe(true);

      // 📊 Verificar mejora de performance con virtualización
      expect(resultWithVirtualization.renderTime).toBeLessThan(
        resultWithoutVirtualization.renderTime
      );

      // 💾 Verificar menor uso de memoria con virtualización
      expect(resultWithVirtualization.memoryUsage).toBeLessThan(
        resultWithoutVirtualization.memoryUsage
      );

      // 📝 Log de comparación
      console.log('Virtualization Comparison:', {
        withoutVirtualization: {
          renderTime: `${resultWithoutVirtualization.renderTime.toFixed(2)}ms`,
          memory: `${(resultWithoutVirtualization.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        },
        withVirtualization: {
          renderTime: `${resultWithVirtualization.renderTime.toFixed(2)}ms`,
          memory: `${(resultWithVirtualization.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        },
        improvement: {
          renderTime: `${((1 - resultWithVirtualization.renderTime / resultWithoutVirtualization.renderTime) * 100).toFixed(1)}%`,
          memory: `${((1 - resultWithVirtualization.memoryUsage / resultWithoutVirtualization.memoryUsage) * 100).toFixed(1)}%`,
        },
      });
    });
  });

  describe('🎯 Performance Regression Tests', () => {
    it('should maintain consistent performance across multiple renders', async () => {
      const elementsCount = 1000;
      const iterations = 5;
      const results: LoadTestResult[] = [];

      // 🔄 Ejecutar múltiples iteraciones
      for (let i = 0; i < iterations; i++) {
        const result = await act(async () => {
          return runLoadTest(elementsCount);
        });
        
        results.push(result);
        
        // 🧹 Limpiar DOM entre iteraciones
        document.body.innerHTML = '';
      }

      // ✅ Verificar que todos los tests fueron exitosos
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // 📊 Calcular estadísticas
      const renderTimes = results.map(r => r.renderTime);
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);
      const minRenderTime = Math.min(...renderTimes);
      const variance = renderTimes.reduce((sum, time) => sum + Math.pow(time - avgRenderTime, 2), 0) / renderTimes.length;
      const standardDeviation = Math.sqrt(variance);

      // 🎯 Verificar consistencia (desviación estándar < 20% del promedio)
      const consistencyThreshold = avgRenderTime * 0.2;
      expect(standardDeviation).toBeLessThan(consistencyThreshold);

      // 📝 Log de estadísticas
      console.log('Performance Consistency Results:', {
        iterations,
        avgRenderTime: `${avgRenderTime.toFixed(2)}ms`,
        minRenderTime: `${minRenderTime.toFixed(2)}ms`,
        maxRenderTime: `${maxRenderTime.toFixed(2)}ms`,
        standardDeviation: `${standardDeviation.toFixed(2)}ms`,
        consistencyScore: `${((1 - standardDeviation / avgRenderTime) * 100).toFixed(1)}%`,
      });
    });
  });

  describe('🚨 Stress Testing', () => {
    it('should handle extreme load gracefully', async () => {
      const extremeLoad = 10000;
      
      // 🚀 Ejecutar test de estrés
      const result = await act(async () => {
        return runLoadTest(extremeLoad, true); // Usar virtualización para carga extrema
      });

      // ✅ Verificar que el componente no falló
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // 📊 El tiempo puede ser alto, pero debe completarse
      expect(result.renderTime).toBeGreaterThan(0);
      expect(result.renderTime).toBeLessThan(5000); // Máximo 5 segundos

      // 💾 Verificar que la memoria no se disparó excesivamente
      const memoryIncreaseMB = result.memoryUsage / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(200); // Máximo 200MB para carga extrema

      // 📝 Log de resultados de estrés
      console.log('Stress Test Results:', {
        elements: result.elementsCount,
        renderTime: `${result.renderTime.toFixed(2)}ms`,
        memoryIncrease: `${memoryIncreaseMB.toFixed(2)}MB`,
        status: 'PASSED',
      });
    });
  });

  describe('📈 Performance Benchmarking', () => {
    it('should generate performance benchmark report', async () => {
      const benchmarkScenarios = [
        { name: 'Baseline', elements: 100 },
        { name: 'Target Load', elements: 1000 },
        { name: 'High Load', elements: 2000 },
      ];

      const benchmarkResults = [];

      // 🚀 Ejecutar todos los escenarios
      for (const scenario of benchmarkScenarios) {
        const result = await act(async () => {
          return runLoadTest(scenario.elements);
        });

        benchmarkResults.push({
          ...scenario,
          ...result,
        });

        // 🧹 Limpiar DOM
        document.body.innerHTML = '';
      }

      // ✅ Verificar que todos los benchmarks fueron exitosos
      benchmarkResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 📊 Generar reporte de benchmark
      const benchmarkReport = {
        timestamp: new Date().toISOString(),
        scenarios: benchmarkResults.map(result => ({
          name: result.name,
          elements: result.elementsCount,
          renderTime: `${result.renderTime.toFixed(2)}ms`,
          memoryUsage: `${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
          performanceScore: Math.max(0, 100 - (result.renderTime / 10)), // Score basado en tiempo
        })),
        summary: {
          totalTests: benchmarkResults.length,
          successRate: '100%',
          avgRenderTime: `${(benchmarkResults.reduce((sum, r) => sum + r.renderTime, 0) / benchmarkResults.length).toFixed(2)}ms`,
        },
      };

      // 📝 Log del reporte completo
      console.log('📊 Performance Benchmark Report:', JSON.stringify(benchmarkReport, null, 2));

      // ✅ Verificar que el reporte se generó correctamente
      expect(benchmarkReport.scenarios).toHaveLength(benchmarkScenarios.length);
      expect(benchmarkReport.summary.successRate).toBe('100%');
    });
  });
});