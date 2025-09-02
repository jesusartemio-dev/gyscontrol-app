# 🧪 Testing Guide - Sistema GYS

Guía completa para ejecutar, mantener y entender los tests del Sistema GYS.

## 📋 Índice

- [Tipos de Tests](#tipos-de-tests)
- [Configuración](#configuración)
- [Comandos Disponibles](#comandos-disponibles)
- [Estructura de Tests](#estructura-de-tests)
- [Cobertura de Código](#cobertura-de-código)
- [CI/CD Pipeline](#cicd-pipeline)
- [Mejores Prácticas](#mejores-prácticas)
- [Troubleshooting](#troubleshooting)

## 🎯 Tipos de Tests

### 1. Tests Unitarios
- **Framework**: Vitest + Testing Library
- **Ubicación**: `src/**/__tests__/`
- **Propósito**: Validar funciones, componentes y servicios de forma aislada

### 2. Tests de Integración
- **Framework**: Vitest + MSW (Mock Service Worker)
- **Ubicación**: `src/**/__tests__/integration/`
- **Propósito**: Validar interacciones entre componentes y APIs

### 3. Tests E2E (End-to-End)
- **Framework**: Playwright
- **Ubicación**: `e2e/`
- **Propósito**: Validar flujos completos de usuario

## ⚙️ Configuración

### Archivos de Configuración

```
├── vitest.config.ts          # Configuración Vitest
├── playwright.config.ts      # Configuración Playwright
├── src/__tests__/setup.ts    # Setup global para tests
├── codecov.yml              # Configuración cobertura
└── .github/workflows/ci.yml # Pipeline CI/CD
```

### Variables de Entorno

```bash
# .env.test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gys_test"
NEXTAUTH_SECRET="test-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 🚀 Comandos Disponibles

### Tests Unitarios e Integración

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests con threshold de cobertura
npm run test:coverage:threshold

# Generar reporte de cobertura en JSON
npm run test:coverage:json

# Generar reporte HTML
npm run test:report
```

### Tests E2E

```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar tests E2E con UI
npm run test:e2e:ui

# Ejecutar tests E2E en modo debug
npm run test:e2e:debug

# Ejecutar tests E2E con navegador visible
npm run test:e2e:headed

# Ver reporte de tests E2E
npm run test:e2e:report
```

### Tests Completos

```bash
# Ejecutar todos los tipos de tests
npm run test:all
```

## 📁 Estructura de Tests

### Tests Unitarios

```
src/
├── components/
│   └── aprovisionamiento/
│       └── __tests__/
│           ├── OrdenCompraList.test.tsx
│           ├── OrdenCompraForm.test.tsx
│           └── OrdenCompraList.interaction.test.tsx
├── lib/
│   └── services/
│       └── __tests__/
│           ├── ordenCompra.test.ts
│           ├── recepcion.test.ts
│           └── pago.test.ts
└── app/
    └── api/
        └── ordenes-compra/
            └── __tests__/
                ├── route.test.ts
                └── [id]/
                    └── route.test.ts
```

### Tests E2E

```
e2e/
├── aprovisionamiento/
│   ├── flujo-completo.spec.ts
│   └── validaciones-negocio.spec.ts
├── auth/
│   └── autorizacion-roles.spec.ts
├── helpers/
│   └── test-helpers.ts
├── global-setup.ts
└── global-teardown.ts
```

### Mocks y Fixtures

```
src/__tests__/
├── __mocks__/
│   ├── services.ts
│   └── fixtures.ts
└── setup.ts
```

## 📊 Cobertura de Código

### Thresholds Configurados

- **Líneas**: 80%
- **Funciones**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Archivos Críticos (90% threshold)

- `src/lib/auth.ts`
- `src/lib/prisma.ts`
- `src/lib/services/**`
- `src/app/api/**`
- `src/middleware.ts`

### Reportes de Cobertura

```bash
# Ver reporte en terminal
npm run test:coverage

# Generar reporte HTML (coverage/index.html)
npm run test:coverage -- --reporter=html

# Ver reporte detallado
open coverage/index.html
```

## 🔄 CI/CD Pipeline

### Flujo Automatizado

1. **Code Quality**: ESLint, TypeScript, Prettier
2. **Unit Tests**: Vitest con cobertura > 80%
3. **E2E Tests**: Playwright en múltiples navegadores
4. **Build**: Verificación de build exitoso
5. **Deploy**: Staging (develop) y Production (main)

### Status Checks

- ✅ **Code Quality**: Linting y formato
- ✅ **Unit Tests**: Cobertura > 80%
- ✅ **E2E Tests**: Flujos críticos
- ✅ **Build**: Compilación exitosa
- ✅ **Security**: Audit de dependencias

## 🎯 Mejores Prácticas

### Naming Conventions

```typescript
// ✅ Bueno
describe('OrdenCompraService', () => {
  describe('createOrdenCompra', () => {
    it('should create orden compra with valid data', () => {})
    it('should throw error when supplier not found', () => {})
  })
})

// ❌ Malo
describe('test orden compra', () => {
  it('works', () => {})
})
```

### Test Structure (AAA Pattern)

```typescript
it('should calculate total with taxes correctly', () => {
  // 🔧 Arrange
  const orderData = {
    items: [{ quantity: 2, unitPrice: 100 }],
    taxRate: 0.18
  }
  
  // 🎬 Act
  const result = calculateOrderTotal(orderData)
  
  // ✅ Assert
  expect(result.subtotal).toBe(200)
  expect(result.taxes).toBe(36)
  expect(result.total).toBe(236)
})
```

### Mocking Guidelines

```typescript
// ✅ Mock específico y limpio
vi.mocked(prisma.ordenCompra.create).mockResolvedValue(mockOrdenCompra)

// ✅ Cleanup en afterEach
afterEach(() => {
  vi.clearAllMocks()
})

// ❌ Mock global sin cleanup
vi.mock('../../lib/prisma', () => ({ /* ... */ }))
```

### Component Testing

```typescript
// ✅ Test de comportamiento, no implementación
it('should show loading state while fetching orders', async () => {
  render(<OrdenCompraList />)
  
  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  
  await waitFor(() => {
    expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
  })
})

// ✅ Test de interacciones de usuario
it('should filter orders when search input changes', async () => {
  const user = userEvent.setup()
  render(<OrdenCompraList />)
  
  const searchInput = screen.getByPlaceholderText('Buscar órdenes...')
  await user.type(searchInput, 'OC-2024-001')
  
  await waitFor(() => {
    expect(screen.getByText('OC-2024-001')).toBeInTheDocument()
    expect(screen.queryByText('OC-2024-002')).not.toBeInTheDocument()
  })
})
```

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. "React is not defined"

```bash
# Solución: Verificar setup.ts
# src/__tests__/setup.ts debe incluir:
import React from 'react'
global.React = React
```

#### 2. Tests E2E fallan en CI

```bash
# Verificar configuración de base de datos
# Asegurar que PostgreSQL esté corriendo
# Verificar variables de entorno
```

#### 3. Cobertura baja inesperada

```bash
# Ver archivos no cubiertos
npm run test:coverage -- --reporter=html

# Verificar archivos ignorados en codecov.yml
```

#### 4. Tests lentos

```bash
# Ejecutar tests en paralelo
npm run test -- --reporter=verbose

# Identificar tests lentos
npm run test -- --reporter=verbose --run
```

### Debug de Tests

```typescript
// 🔍 Debug con console.log
it('should debug test', () => {
  console.log('Debug info:', { data })
  // test logic
})

// 🔍 Debug con screen.debug()
it('should debug component', () => {
  render(<Component />)
  screen.debug() // Imprime el DOM actual
})

// 🔍 Debug con breakpoints
it('should debug with breakpoint', () => {
  debugger // Pausa ejecución en DevTools
  // test logic
})
```

### Performance Testing

```typescript
// ⚡ Test de performance
it('should render large list efficiently', () => {
  const startTime = performance.now()
  
  render(<OrdenCompraList orders={largeMockData} />)
  
  const endTime = performance.now()
  const renderTime = endTime - startTime
  
  expect(renderTime).toBeLessThan(100) // < 100ms
})
```

## 📚 Recursos Adicionales

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [MSW Documentation](https://mswjs.io/)

---

**Mantenido por**: TRAE - Agente Senior Fullstack  
**Última actualización**: Enero 2024  
**Versión**: 1.0.0