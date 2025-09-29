// Script para probar que las APIs del refactoring funcionan correctamente
// Ejecutar con: node scripts/test-refactoring-apis.js

const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, description) {
  try {
    console.log(`\n🧪 Probando: ${description}`);
    console.log(`📡 Endpoint: ${endpoint}`);

    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Éxito: ${response.status} ${response.statusText}`);
      console.log(`📊 Datos recibidos: ${Array.isArray(data) ? data.length + ' items' : 'Objeto'}`);
    } else {
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      console.log(`📝 Mensaje: ${data.error || 'Sin mensaje'}`);
    }

    return { success: response.ok, data };
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de APIs del refactoring de modelos de proyecto');
  console.log('=' .repeat(70));

  // Nota: Estas pruebas requieren que haya proyectos en la BD
  // Si no hay datos, las APIs devolverán arrays vacíos, lo cual es correcto

  const tests = [
    {
      endpoint: '/api/proyecto-equipo/from-proyecto/test-id',
      description: 'ProyectoEquipoCotizado - Obtener equipos de proyecto'
    },
    {
      endpoint: '/api/proyecto-equipo-item/from-proyecto/test-id',
      description: 'ProyectoEquipoCotizadoItem - Obtener ítems de equipos'
    },
    {
      endpoint: '/api/proyecto-servicio/from-proyecto/test-id',
      description: 'ProyectoServicioCotizado - Obtener servicios de proyecto'
    },
    {
      endpoint: '/api/proyecto-servicio-item/from-proyecto/test-id',
      description: 'ProyectoServicioCotizadoItem - Obtener ítems de servicios'
    },
    {
      endpoint: '/api/proyecto-gasto/from-proyecto/test-id',
      description: 'ProyectoCotizadoGasto - Obtener gastos de proyecto'
    },
    {
      endpoint: '/api/proyecto-gasto-item/from-proyecto/test-id',
      description: 'ProyectoGastoCotizadoItem - Obtener ítems de gastos'
    }
  ];

  const results = [];

  for (const test of tests) {
    const result = await testAPI(test.endpoint, test.description);
    results.push({ ...test, ...result });
  }

  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('=' .repeat(70));

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`✅ APIs funcionales: ${successful}/${total}`);

  if (successful === total) {
    console.log('🎉 ¡Todas las APIs del refactoring funcionan correctamente!');
    console.log('📝 Nota: Los arrays vacíos son normales si no hay datos de prueba.');
  } else {
    console.log('⚠️ Algunas APIs tienen problemas. Revisa los logs anteriores.');
  }

  console.log('\n🔍 Verificación completada.');
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testAPI };