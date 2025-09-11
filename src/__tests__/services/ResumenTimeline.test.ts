// ✅ Test para verificar las propiedades agregadas a ResumenTimeline
import type { ResumenTimeline } from '@/types/aprovisionamiento';

describe('ResumenTimeline Type', () => {
  it('should include itemsConAlertas property', () => {
    // ✅ Test de compilación - verificar que itemsConAlertas existe
    const resumen: ResumenTimeline = {
      totalItems: 10,
      montoTotal: 50000,
      itemsVencidos: 2,
      itemsEnRiesgo: 3,
      itemsConAlertas: 5, // ✅ Nueva propiedad agregada
      porcentajeCompletado: 75,
      coherenciaPromedio: 85.5, // ✅ Nueva propiedad agregada
      distribucionPorTipo: {
        listas: 6,
        pedidos: 4
      },
      alertasPorPrioridad: {
        alta: 1,
        media: 2,
        baja: 2
      }
    };

    expect(resumen.itemsConAlertas).toBe(5);
    expect(resumen.coherenciaPromedio).toBe(85.5);
  });

  it('should handle zero values for new properties', () => {
    // ✅ Test con valores cero
    const resumen: ResumenTimeline = {
      totalItems: 0,
      montoTotal: 0,
      itemsVencidos: 0,
      itemsEnRiesgo: 0,
      itemsConAlertas: 0,
      porcentajeCompletado: 0,
      coherenciaPromedio: 0,
      distribucionPorTipo: {
        listas: 0,
        pedidos: 0
      },
      alertasPorPrioridad: {
        alta: 0,
        media: 0,
        baja: 0
      }
    };

    expect(resumen.itemsConAlertas).toBe(0);
    expect(resumen.coherenciaPromedio).toBe(0);
  });

  it('should handle decimal values for coherenciaPromedio', () => {
    // ✅ Test con valores decimales para coherencia
    const resumen: ResumenTimeline = {
      totalItems: 20,
      montoTotal: 100000,
      itemsVencidos: 1,
      itemsEnRiesgo: 2,
      itemsConAlertas: 8,
      porcentajeCompletado: 90.5,
      coherenciaPromedio: 92.75, // Valor decimal
      distribucionPorTipo: {
        listas: 12,
        pedidos: 8
      },
      alertasPorPrioridad: {
        alta: 0,
        media: 3,
        baja: 5
      }
    };

    expect(typeof resumen.coherenciaPromedio).toBe('number');
    expect(resumen.coherenciaPromedio).toBe(92.75);
  });

  it('should maintain backward compatibility with existing properties', () => {
    // ✅ Test de compatibilidad hacia atrás
    const resumen: ResumenTimeline = {
      totalItems: 15,
      montoTotal: 75000,
      itemsVencidos: 3,
      itemsEnRiesgo: 4,
      itemsConAlertas: 7,
      porcentajeCompletado: 80,
      coherenciaPromedio: 88,
      distribucionPorTipo: {
        listas: 9,
        pedidos: 6
      },
      alertasPorPrioridad: {
        alta: 2,
        media: 3,
        baja: 2
      }
    };

    // Verificar propiedades existentes
    expect(resumen.totalItems).toBe(15);
    expect(resumen.montoTotal).toBe(75000);
    expect(resumen.itemsVencidos).toBe(3);
    expect(resumen.itemsEnRiesgo).toBe(4);
    expect(resumen.porcentajeCompletado).toBe(80);
    
    // Verificar estructura de objetos anidados
    expect(resumen.distribucionPorTipo.listas).toBe(9);
    expect(resumen.distribucionPorTipo.pedidos).toBe(6);
    expect(resumen.alertasPorPrioridad.alta).toBe(2);
    expect(resumen.alertasPorPrioridad.media).toBe(3);
    expect(resumen.alertasPorPrioridad.baja).toBe(2);
  });
});
