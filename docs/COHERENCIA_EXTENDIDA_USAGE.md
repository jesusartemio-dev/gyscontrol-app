# 📋 Guía de Uso: CoherenciaResultExtended

## 🎯 Problema Resuelto

El error `Property 'listaId' does not exist on type 'CoherenciaResult'` ocurría porque la interfaz base `CoherenciaResult` no incluía campos específicos como `listaId`, `montoLista`, `montoPedidos`, etc., que son necesarios para generar alertas detalladas.

## ✅ Solución Implementada

### 1. Nueva Interfaz Extendida

```typescript
// ✅ Interfaz extendida para coherencia con información adicional
export interface CoherenciaResultExtended extends CoherenciaResult {
  listaId: string;
  montoLista: number;
  montoPedidos: number;
  pedidosRelacionados: {
    codigo: string;
    monto: number;
  }[];
}
```

### 2. Función Auxiliar para Crear Instancias

```typescript
// ✅ Función auxiliar para crear CoherenciaResultExtended
export function crearCoherenciaExtendida(
  coherenciaBase: CoherenciaResult,
  listaId: string,
  montoLista: number,
  montoPedidos: number,
  pedidosRelacionados: { codigo: string; monto: number }[] = []
): CoherenciaResultExtended {
  return {
    ...coherenciaBase,
    listaId,
    montoLista,
    montoPedidos,
    pedidosRelacionados
  };
}
```

## 🚀 Ejemplos de Uso

### Ejemplo 1: Uso Básico

```typescript
import { AprovisionamientoCalculos } from './aprovisionamientoCalculos';
import { crearCoherenciaExtendida } from './aprovisionamientoNotificaciones';

// 🔍 Validar coherencia base
const coherenciaBase = AprovisionamientoCalculos.validarCoherenciaListaPedidos(
  lista,
  pedidos
);

// ✅ Crear coherencia extendida
const coherenciaExtendida = crearCoherenciaExtendida(
  coherenciaBase,
  'lista-123',
  15000.00,
  14500.00,
  [
    { codigo: 'PED-001', monto: 7500.00 },
    { codigo: 'PED-002', monto: 7000.00 }
  ]
);
```

### Ejemplo 2: Procesamiento de Múltiples Listas

```typescript
const coherenciaExtendida: CoherenciaResultExtended[] = [];

for (const lista of listas) {
  const pedidosLista = pedidos.filter(p => p.listaEquipoId === lista.id);
  
  // 💰 Calcular montos
  const montoLista = lista.items.reduce(
    (sum, item) => sum + (item.cantidad * item.precioElegido), 0
  );
  
  const montoPedidos = pedidosLista.reduce((sum, pedido) => {
    return sum + pedido.items.reduce(
      (subSum, item) => subSum + (item.cantidadPedida * item.precioUnitario), 0
    );
  }, 0);
  
  // 🔍 Validar coherencia
  const coherenciaBase = AprovisionamientoCalculos.validarCoherenciaListaPedidos(
    lista,
    pedidosLista
  );
  
  // ✅ Crear coherencia extendida
  const coherenciaConDatos = crearCoherenciaExtendida(
    coherenciaBase,
    lista.id,
    montoLista,
    montoPedidos,
    pedidosLista.map(p => ({
      codigo: p.codigo,
      monto: p.items.reduce(
        (sum, item) => sum + (item.cantidadPedida * item.precioUnitario), 0
      )
    }))
  );
  
  coherenciaExtendida.push(coherenciaConDatos);
}
```

### Ejemplo 3: Generar Alertas con Datos Extendidos

```typescript
// 🚨 Generar alertas usando coherencia extendida
const alertas = await AprovisionamientoNotificaciones.generarAlertasAutomaticas(
  proyectos,
  ganttListas,
  ganttPedidos,
  coherenciaExtendida // ✅ Ahora incluye listaId, montoLista, etc.
);

console.log(`Se generaron ${alertas.length} alertas`);
alertas.forEach(alerta => {
  console.log(`- ${alerta.titulo}: ${alerta.mensaje}`);
});
```

## 🔧 Campos Disponibles

### CoherenciaResult (Base)
- `esCoherente: boolean`
- `desviacionMonto: number`
- `desviacionPorcentaje: number`
- `alertas: string[]`
- `recomendaciones: string[]`

### CoherenciaResultExtended (Extendida)
- **Todos los campos de CoherenciaResult +**
- `listaId: string` - ID de la lista analizada
- `montoLista: number` - Monto total de la lista
- `montoPedidos: number` - Monto total de pedidos asociados
- `pedidosRelacionados: { codigo: string; monto: number }[]` - Detalles de pedidos

## 📊 Uso en Alertas

Con la interfaz extendida, ahora es posible generar alertas detalladas:

```typescript
alertas.push({
  id: `coherencia_${resultado.listaId}`, // ✅ Ahora disponible
  tipo: Math.abs(resultado.desviacionPorcentaje) > 20 ? 'error' : 'warning',
  categoria: 'coherencia',
  titulo: `Desviación de coherencia detectada`,
  mensaje: `La lista ${resultado.listaId} presenta una desviación del ${resultado.desviacionPorcentaje.toFixed(1)}%`,
  detalles: `
    Lista ID: ${resultado.listaId}
    Monto Lista: ${this.formatearMoneda(resultado.montoLista)}
    Monto Pedidos: ${this.formatearMoneda(resultado.montoPedidos)}
    Desviación: ${this.formatearMoneda(resultado.desviacionMonto)}
    % Desviación: ${resultado.desviacionPorcentaje.toFixed(2)}%
    
    Pedidos relacionados:
    ${resultado.pedidosRelacionados.map(p => `- ${p.codigo}: ${this.formatearMoneda(p.monto)}`).join('\n')}
  `,
  // ... resto de campos
});
```

## 🎯 Beneficios

1. **Información Completa**: Las alertas incluyen todos los datos necesarios
2. **Trazabilidad**: Se puede identificar exactamente qué lista y pedidos están involucrados
3. **Compatibilidad**: Mantiene compatibilidad con `CoherenciaResult` base
4. **Flexibilidad**: Permite agregar más campos en el futuro sin romper código existente
5. **Type Safety**: TypeScript garantiza que todos los campos requeridos estén presentes

## 🚨 Notas Importantes

- Siempre usar `crearCoherenciaExtendida()` para crear instancias
- Los campos adicionales son requeridos, no opcionales
- La función `generarAlertasAutomaticas()` ahora espera `CoherenciaResultExtended[]`
- El ejemplo completo está disponible en `validacionCoherenciaService.generarAlertasCoherencia()`