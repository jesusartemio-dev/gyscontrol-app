# 🧪 Tests del Módulo Financiero

## 📋 Descripción

Este directorio contiene los tests unitarios y de integración para todos los componentes del módulo financiero del sistema GYS.

## 🏗️ Estructura de Tests

```
__tests__/
├── ProyeccionMensualListas.test.tsx    # Tests para proyección de costos
├── SeguimientoPedidos.test.tsx         # Tests para seguimiento de pedidos
├── DashboardFinanciero.test.tsx        # Tests para dashboard financiero
├── FiltrosAvanzados.test.tsx           # Tests para filtros avanzados
└── README.md                           # Este archivo
```

## 🎯 Cobertura de Tests

### ProyeccionMensualListas
- ✅ Renderizado correcto del componente
- ✅ Carga y visualización de datos de listas
- ✅ Cálculo de métricas financieras
- ✅ Filtrado por proyecto
- ✅ Exportación de datos
- ✅ Manejo de errores
- ✅ Gráficos de proyección mensual

### SeguimientoPedidos
- ✅ Renderizado correcto del componente
- ✅ Carga y visualización de pedidos
- ✅ Cálculo de diferencias de tiempo
- ✅ Cálculo de ahorros
- ✅ Filtrado por estado
- ✅ Alertas para pedidos retrasados
- ✅ Manejo de múltiples estados

### DashboardFinanciero
- ✅ Renderizado correcto del componente
- ✅ Cálculo de métricas principales
- ✅ Visualización de gráficos
- ✅ Filtrado por período
- ✅ Indicadores de rendimiento
- ✅ Generación de alertas automáticas
- ✅ Integración con servicios

### FiltrosAvanzados
- ✅ Renderizado de todos los tipos de filtros
- ✅ Manejo de filtros de texto
- ✅ Manejo de filtros select y multiselect
- ✅ Manejo de rangos de fechas y números
- ✅ Filtros checkbox
- ✅ Guardado y carga de configuraciones
- ✅ Exportación de configuraciones
- ✅ Validaciones de rangos

## 🚀 Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Tests específicos del módulo financiero
```bash
npm test -- src/components/finanzas
```

### Tests con cobertura
```bash
npm test -- --coverage
```

### Tests en modo watch
```bash
npm test -- --watch
```

### Test específico
```bash
npm test -- ProyeccionMensualListas.test.tsx
```

## 🎭 Mocks Utilizados

### Servicios
- `listaRequerimientosService`
- `pedidoEquipoService`
- `proyectoService`

### Componentes UI
- `framer-motion`
- `recharts`
- `date-range-picker`

### APIs del Navegador
- `localStorage`
- `fetch`
- `IntersectionObserver`
- `ResizeObserver`

## 📊 Métricas de Calidad

### Objetivos de Cobertura
- **Líneas**: ≥ 80%
- **Funciones**: ≥ 80%
- **Ramas**: ≥ 75%
- **Declaraciones**: ≥ 80%

### Tipos de Tests
- **Unitarios**: Componentes individuales
- **Integración**: Interacción entre componentes y servicios
- **Funcionales**: Flujos completos de usuario

## 🛠️ Herramientas Utilizadas

- **Jest**: Framework de testing
- **React Testing Library**: Testing de componentes React
- **@testing-library/jest-dom**: Matchers adicionales
- **@testing-library/user-event**: Simulación de eventos de usuario

## 📝 Convenciones de Testing

### Nomenclatura
- Archivos de test: `*.test.tsx`
- Describe blocks: Nombre del componente
- Test cases: Descripción clara con emoji 🧪

### Estructura de Tests
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup común
  });

  it('🧪 debe hacer algo específico', () => {
    // Test implementation
  });
});
```

### Mocks
- Siempre limpiar mocks en `beforeEach`
- Usar mocks específicos para cada test cuando sea necesario
- Verificar llamadas a mocks con `expect().toHaveBeenCalledWith()`

## 🔧 Configuración

### Jest Config
- Configurado en `jest.config.js`
- Setup en `jest.setup.js`
- Aliases de módulos configurados

### Scripts de Package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:finanzas": "jest src/components/finanzas"
  }
}
```

## 🐛 Debugging Tests

### Logs de Debug
```typescript
// Usar screen.debug() para ver el DOM renderizado
screen.debug();

// Usar console.log en tests para debugging
console.log('Estado actual:', component.state);
```

### Tests Fallidos
1. Verificar que los mocks estén configurados correctamente
2. Revisar que los selectores sean correctos
3. Verificar timing con `waitFor`
4. Comprobar que los datos de prueba sean válidos

## 📈 Mejoras Futuras

- [ ] Tests de performance con React Profiler
- [ ] Tests de accesibilidad con @testing-library/jest-axe
- [ ] Tests visuales con Storybook
- [ ] Tests E2E con Playwright
- [ ] Snapshot testing para componentes estables

## 🤝 Contribuir

1. Escribir tests para nuevos componentes
2. Mantener cobertura mínima del 80%
3. Seguir convenciones de nomenclatura
4. Documentar casos edge en los tests
5. Actualizar este README con cambios significativos

---

**Nota**: Estos tests son fundamentales para mantener la calidad y estabilidad del módulo financiero. Asegúrate de ejecutarlos antes de cada commit y mantener la cobertura en los niveles objetivo.