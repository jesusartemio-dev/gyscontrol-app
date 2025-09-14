/**
 * 🎯 Test de Performance Simple para Sistema GYS
 * 
 * Este script ejecuta pruebas de performance básicas sin dependencias complejas
 * para medir el rendimiento actual del sistema.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

const { performance } = require('perf_hooks');

// 🎯 Simulación de datos para testing
const generateMockData = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    nombre: `Equipo ${i}`,
    codigo: `EQ-${String(i).padStart(4, '0')}`,
    precio: Math.random() * 10000,
    categoria: ['Bombas', 'Válvulas', 'Tuberías', 'Instrumentos'][i % 4],
    proveedor: `Proveedor ${Math.floor(i / 10)}`,
    fechaCreacion: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    activo: Math.random() > 0.1
  }));
};

// 📊 Función para medir tiempo de ejecución
function measureExecutionTime(fn, label) {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
  return { result, duration };
}

// 🔍 Test de filtrado de datos
function testDataFiltering(data) {
  return measureExecutionTime(() => {
    return data
      .filter(item => item.activo)
      .filter(item => item.precio > 1000)
      .sort((a, b) => b.precio - a.precio)
      .slice(0, 50);
  }, 'Filtrado y ordenamiento de datos');
}

// 📋 Test de agrupación de datos
function testDataGrouping(data) {
  return measureExecutionTime(() => {
    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.categoria]) {
        grouped[item.categoria] = [];
      }
      grouped[item.categoria].push(item);
    });
    return grouped;
  }, 'Agrupación por categoría');
}

// 🔢 Test de cálculos agregados
function testAggregations(data) {
  return measureExecutionTime(() => {
    const stats = {
      total: data.length,
      activos: data.filter(item => item.activo).length,
      precioPromedio: data.reduce((sum, item) => sum + item.precio, 0) / data.length,
      precioMaximo: Math.max(...data.map(item => item.precio)),
      precioMinimo: Math.min(...data.map(item => item.precio)),
      porCategoria: {}
    };
    
    // Estadísticas por categoría
    const categorias = [...new Set(data.map(item => item.categoria))];
    categorias.forEach(cat => {
      const itemsCat = data.filter(item => item.categoria === cat);
      stats.porCategoria[cat] = {
        cantidad: itemsCat.length,
        precioPromedio: itemsCat.reduce((sum, item) => sum + item.precio, 0) / itemsCat.length
      };
    });
    
    return stats;
  }, 'Cálculos y agregaciones');
}

// 🎯 Test de búsqueda
function testSearch(data, searchTerm) {
  return measureExecutionTime(() => {
    const term = searchTerm.toLowerCase();
    return data.filter(item => 
      item.nombre.toLowerCase().includes(term) ||
      item.codigo.toLowerCase().includes(term) ||
      item.proveedor.toLowerCase().includes(term)
    );
  }, `Búsqueda por término: "${searchTerm}"`);
}

// 💾 Test de uso de memoria (simulado)
function testMemoryUsage(data) {
  const startMemory = process.memoryUsage();
  
  // Simular operaciones que consumen memoria
  const copies = [];
  for (let i = 0; i < 5; i++) {
    copies.push(JSON.parse(JSON.stringify(data)));
  }
  
  const endMemory = process.memoryUsage();
  const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
  
  console.log(`💾 Incremento de memoria: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  
  return memoryIncrease;
}

// 🚀 Función principal de testing
async function runPerformanceTests() {
  console.log('🚀 Iniciando Tests de Performance - Sistema GYS');
  console.log('=' .repeat(60));
  
  const testSizes = [100, 1000, 5000, 10000];
  const results = [];
  
  for (const size of testSizes) {
    console.log(`\n📊 Testing con ${size.toLocaleString()} registros:`);
    console.log('-'.repeat(40));
    
    // Generar datos de prueba
    const { result: data, duration: generationTime } = measureExecutionTime(
      () => generateMockData(size),
      'Generación de datos'
    );
    
    // Ejecutar tests
    const filterResult = testDataFiltering(data);
    const groupResult = testDataGrouping(data);
    const aggResult = testAggregations(data);
    const searchResult = testSearch(data, 'Bomba');
    const memoryUsage = testMemoryUsage(data);
    
    // Guardar resultados
    results.push({
      size,
      generationTime,
      filterTime: filterResult.duration,
      groupTime: groupResult.duration,
      aggTime: aggResult.duration,
      searchTime: searchResult.duration,
      memoryUsage: memoryUsage / 1024 / 1024, // MB
      filteredCount: filterResult.result.length,
      searchCount: searchResult.result.length
    });
  }
  
  // 📊 Generar reporte final
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE FINAL DE PERFORMANCE');
  console.log('='.repeat(60));
  
  console.log('\n📈 Resumen por tamaño de dataset:');
  console.log('| Registros | Filtrado | Agrupación | Búsqueda | Memoria |');
  console.log('|-----------|----------|------------|----------|---------|');
  
  results.forEach(result => {
    console.log(`| ${result.size.toString().padStart(9)} | ${result.filterTime.toFixed(1).padStart(8)}ms | ${result.groupTime.toFixed(1).padStart(10)}ms | ${result.searchTime.toFixed(1).padStart(8)}ms | ${result.memoryUsage.toFixed(1).padStart(6)}MB |`);
  });
  
  // 💡 Generar recomendaciones
  console.log('\n💡 RECOMENDACIONES:');
  
  const lastResult = results[results.length - 1];
  
  if (lastResult.filterTime > 100) {
    console.log('⚠️  Filtrado lento: Considerar implementar índices o paginación');
  }
  
  if (lastResult.searchTime > 50) {
    console.log('⚠️  Búsqueda lenta: Implementar búsqueda con debounce o índices');
  }
  
  if (lastResult.memoryUsage > 100) {
    console.log('⚠️  Alto uso de memoria: Implementar virtualización de listas');
  }
  
  if (lastResult.groupTime > 200) {
    console.log('⚠️  Agrupación lenta: Considerar pre-computar agrupaciones');
  }
  
  console.log('✅ Implementar React.memo para componentes de lista');
  console.log('✅ Usar useMemo para cálculos costosos');
  console.log('✅ Implementar lazy loading para imágenes');
  console.log('✅ Considerar React Query para cache de datos');
  
  console.log('\n🎯 Performance Score:', calculatePerformanceScore(results));
  console.log('\n✅ Tests de performance completados');
  
  return results;
}

// 🎯 Calcular score de performance
function calculatePerformanceScore(results) {
  const lastResult = results[results.length - 1];
  let score = 100;
  
  // Penalizar por tiempos altos
  if (lastResult.filterTime > 100) score -= 20;
  if (lastResult.searchTime > 50) score -= 15;
  if (lastResult.groupTime > 200) score -= 20;
  if (lastResult.memoryUsage > 100) score -= 25;
  
  // Bonificar por buen rendimiento
  if (lastResult.filterTime < 50) score += 5;
  if (lastResult.searchTime < 20) score += 5;
  
  return `${Math.max(0, score)}/100`;
}

// 🚀 Ejecutar si es llamado directamente
if (require.main === module) {
  runPerformanceTests()
    .then(results => {
      console.log('\n📄 Resultados guardados en memoria');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error en tests de performance:', error);
      process.exit(1);
    });
}

module.exports = {
  runPerformanceTests,
  generateMockData,
  measureExecutionTime
};