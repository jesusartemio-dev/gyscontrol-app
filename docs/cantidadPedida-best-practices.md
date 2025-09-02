# 📋 Mejores Prácticas para Gestión de `cantidadPedida`

## 🎯 Objetivo

Este documento establece las mejores prácticas para mantener la integridad de los datos en el campo `cantidadPedida` de la entidad `ListaEquipoItem`, evitando valores negativos y inconsistencias que afecten la funcionalidad del sistema GYS.

---

## 🔍 Problema Identificado

### Síntomas
- Valores negativos en `ListaEquipoItem.cantidadPedida`
- Cantidades disponibles erróneas en el modal `PedidoEquipoItemModalAgregar`
- Inconsistencias entre cantidades reales pedidas y el campo calculado

### Causas Raíz
1. **Operaciones concurrentes** sin sincronización adecuada
2. **Eliminación de pedidos** sin actualizar cantidades
3. **Modificación directa** de cantidades sin validación
4. **Falta de transacciones atómicas** en operaciones complejas
5. **Ausencia de validaciones** en APIs

---

## ✅ Soluciones Implementadas

### 1. Utilidades de Validación (`cantidadPedidaValidator.ts`)

```typescript
// ✅ Usar siempre estas funciones para operaciones de cantidadPedida
import {
  recalcularCantidadPedida,
  sincronizarCantidadPedida,
  validarCantidadPedidaNoNegativa
} from '@/lib/utils/cantidadPedidaValidator'
```

### 2. APIs Actualizadas
- `POST /api/pedido-equipo-item` - Sincronización automática
- `PUT /api/pedido-equipo-item/[id]` - Validación de diferencias
- `DELETE /api/pedido-equipo-item/[id]` - Recálculo post-eliminación

### 3. Middleware de Sincronización
- Verificación automática cada 6 horas
- Reparación automática de inconsistencias
- Alertas para valores negativos

### 4. Scripts de Mantenimiento
- `recalcular-cantidades-pedidas.js` - Recálculo masivo
- `fix-negative-cantidades.js` - Corrección de negativos

---

## 📝 Reglas de Desarrollo

### 🚫 Prohibido

```typescript
// ❌ NUNCA hacer esto
await prisma.listaEquipoItem.update({
  where: { id },
  data: { cantidadPedida: cantidadPedida - cantidad }
})

// ❌ NUNCA modificar directamente sin validación
item.cantidadPedida = newValue
```

### ✅ Recomendado

```typescript
// ✅ Usar funciones de sincronización
const resultado = await sincronizarCantidadPedida(
  listaEquipoItemId,
  'decrement',
  cantidad
)

if (!resultado.exito) {
  // Recalcular si falla la sincronización
  await recalcularCantidadPedida(listaEquipoItemId)
}

// ✅ Validar antes de operaciones críticas
const esValida = await validarCantidadPedidaNoNegativa(
  listaEquipoItemId,
  operacion,
  cantidad
)
```

---

## 🔧 Patrones de Implementación

### 1. Patrón de Sincronización Segura

```typescript
export async function operacionSegura(
  listaEquipoItemId: string,
  operacion: 'increment' | 'decrement',
  cantidad: number
) {
  try {
    // 1. Validar operación
    const esValida = await validarCantidadPedidaNoNegativa(
      listaEquipoItemId,
      operacion,
      cantidad
    )
    
    if (!esValida) {
      throw new Error('Operación resultaría en cantidad negativa')
    }
    
    // 2. Ejecutar sincronización
    const resultado = await sincronizarCantidadPedida(
      listaEquipoItemId,
      operacion,
      cantidad
    )
    
    // 3. Verificar resultado
    if (!resultado.exito) {
      console.warn('Sincronización falló, recalculando...', resultado.mensaje)
      await recalcularCantidadPedida(listaEquipoItemId)
    }
    
    return resultado
  } catch (error) {
    console.error('Error en operación segura:', error)
    throw error
  }
}
```

### 2. Patrón de Transacción Atómica

```typescript
export async function operacionCompleja() {
  return await prisma.$transaction(async (tx) => {
    // 1. Crear/actualizar pedido
    const pedido = await tx.pedidoEquipoItem.create({ ... })
    
    // 2. Sincronizar cantidad
    const resultado = await sincronizarCantidadPedida(
      pedido.listaEquipoItemId,
      'increment',
      pedido.cantidadPedida
    )
    
    // 3. Verificar consistencia
    if (!resultado.exito) {
      throw new Error('Fallo en sincronización')
    }
    
    return pedido
  })
}
```

### 3. Patrón de Validación en Componentes

```typescript
// En componentes React
const validarCantidadDisponible = (item: ListaEquipoItem, cantidadSolicitada: number) => {
  const disponible = Math.max(0, item.cantidadLista - Math.max(0, item.cantidadPedida))
  
  if (cantidadSolicitada > disponible) {
    toast.error(`Solo hay ${disponible} unidades disponibles`)
    return false
  }
  
  return true
}
```

---

## 🧪 Testing

### Casos de Prueba Obligatorios

1. **Operaciones básicas**
   - Incremento de cantidades
   - Decremento de cantidades
   - Validación de límites

2. **Casos límite**
   - Cantidad exacta disponible
   - Intento de cantidad mayor a disponible
   - Operaciones con cantidades negativas existentes

3. **Concurrencia**
   - Múltiples operaciones simultáneas
   - Transacciones fallidas
   - Recuperación de errores

### Ejemplo de Test

```typescript
it('should prevent negative cantidadPedida', async () => {
  const item = await createTestItem({ cantidadLista: 5, cantidadPedida: 2 })
  
  const resultado = await sincronizarCantidadPedida(
    item.id,
    'decrement',
    10 // Más de lo disponible
  )
  
  expect(resultado.exito).toBe(false)
  expect(resultado.mensaje).toContain('negativa')
})
```

---

## 🔄 Mantenimiento

### Tareas Periódicas

1. **Diario**: Verificar logs de middleware
2. **Semanal**: Ejecutar auditoría de consistencia
3. **Mensual**: Revisar y optimizar queries

### Scripts de Mantenimiento

```bash
# Auditar inconsistencias
node scripts/recalcular-cantidades-pedidas.js --auditar

# Corregir valores negativos
node scripts/fix-negative-cantidades.js

# Generar reporte de salud
node scripts/health-check-cantidades.js
```

### Monitoreo

```typescript
// Agregar a logs de aplicación
const estadisticas = await obtenerEstadisticasConsistencia()

if (estadisticas.porcentajeInconsistencias > 5) {
  console.error('🚨 Alto porcentaje de inconsistencias:', estadisticas)
  // Enviar alerta
}
```

---

## 📊 Métricas de Calidad

### KPIs a Monitorear

1. **Consistencia**: < 1% de inconsistencias
2. **Valores negativos**: 0 registros
3. **Tiempo de sincronización**: < 100ms promedio
4. **Errores de validación**: < 0.1% de operaciones

### Dashboard de Salud

```sql
-- Query para monitoreo
SELECT 
  COUNT(*) as total_items,
  COUNT(CASE WHEN "cantidadPedida" < 0 THEN 1 END) as negativos,
  AVG("cantidadPedida") as promedio_pedida,
  MAX("cantidadPedida") as maximo_pedida
FROM "ListaEquipoItem"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours';
```

---

## 🚨 Procedimiento de Emergencia

### Si se detectan valores negativos:

1. **Inmediato**:
   ```bash
   node fix-negative-cantidades.js
   ```

2. **Investigación**:
   - Revisar logs de las últimas 24h
   - Identificar operaciones que causaron el problema
   - Verificar integridad de datos relacionados

3. **Prevención**:
   - Ejecutar auditoría completa
   - Reforzar validaciones en el área problemática
   - Actualizar tests con el caso encontrado

### Contactos de Escalación

- **Desarrollador Principal**: Revisar código y APIs
- **DBA**: Verificar integridad de base de datos
- **DevOps**: Revisar logs de sistema y performance

---

## 📚 Referencias

- [Documentación de Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Patrones de Concurrencia en Node.js](https://nodejs.org/en/docs/guides/blocking-vs-non-blocking/)
- [Testing con Jest y Prisma](https://www.prisma.io/docs/guides/testing/unit-testing)

---

## 📝 Changelog

### v1.0.0 - 2025-01-27
- ✅ Implementación inicial de utilidades de validación
- ✅ Actualización de APIs con sincronización
- ✅ Middleware de mantenimiento automático
- ✅ Scripts de corrección y auditoría
- ✅ Suite completa de tests
- ✅ Documentación de mejores prácticas

---

**💡 Recuerda**: La consistencia de datos es responsabilidad de todo el equipo. Siempre usar las utilidades proporcionadas y seguir estos patrones para mantener la integridad del sistema.