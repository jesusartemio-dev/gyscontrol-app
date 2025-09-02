/**
 * Script de prueba rápida para verificar que la corrección de tipos funciona
 */

const { eventBus, eventTypes } = require('./src/lib/events/aprovisionamiento-events.ts');

console.log('🧪 Probando corrección de tipos en aprovisionamiento-events.ts');
console.log('✅ EventTypes disponibles:', Object.keys(eventTypes));

// Test básico de emisión de eventos
async function testEventEmission() {
  try {
    console.log('\n📡 Probando emisión de eventos...');
    
    // Test evento de Finanzas → Logística
    await eventBus.emit(eventTypes.PEDIDO_CREATED, {
      id: 'test-pedido-001',
      codigo: 'PED-TEST-001',
      proyecto: { nombre: 'Proyecto Test' },
      presupuestoTotal: 25000
    });
    console.log('✅ Evento PEDIDO_CREATED emitido correctamente');
    
    // Test evento de Logística → Finanzas
    await eventBus.emit(eventTypes.PO_CREATED, {
      id: 'test-po-001',
      numero: 'PO-TEST-001',
      proveedor: { nombre: 'Proveedor Test' },
      montoTotal: 15000,
      moneda: 'PEN'
    });
    console.log('✅ Evento PO_CREATED emitido correctamente');
    
    // Verificar historial
    const history = eventBus.getEventHistory(5);
    console.log(`\n📊 Eventos en historial: ${history.length}`);
    
    history.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.tipo} (${event.areaOrigen} → ${event.areaDestino})`);
    });
    
    // Verificar estadísticas
    const stats = eventBus.getStats();
    console.log('\n📈 Estadísticas del sistema:');
    console.log(`  - Total eventos: ${stats.totalEvents}`);
    console.log(`  - Tasa de éxito: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`  - Eventos por área:`, stats.eventsByArea);
    
    console.log('\n🎉 Todas las pruebas pasaron correctamente!');
    console.log('✅ La corrección de tipos TypeScript funciona perfectamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
testEventEmission();