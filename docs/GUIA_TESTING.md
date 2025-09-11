# 🧪 Guía de Testing - Sistema GYS

## 📋 Información General

**Proyecto:** Sistema de Gestión y Servicios (GYS)  
**Versión:** 1.0.0  
**Fecha:** Enero 2025  
**Autor:** TRAE - Agente Senior Fullstack  
**Tipo:** Guía de Testing Enterprise  

---

## 🎯 Resumen Ejecutivo

Esta guía establece la estrategia completa de testing para el Sistema GYS, incluyendo testing unitario, integración, E2E, performance y accesibilidad. Define estándares, herramientas, métricas y procedimientos para garantizar la calidad del software.

---

## 🏗️ Estrategia de Testing

### Pirámide de Testing

```mermaid
graph TB
    subgraph "🔺 Pirámide de Testing GYS"
        E2E["🎭 E2E Tests<br/>~10%<br/>Flujos completos"] 
        INTEGRATION["🔗 Integration Tests<br/>~20%<br/>APIs + DB + Servicios"]
        UNIT["⚡ Unit Tests<br/>~70%<br/>Componentes + Funciones"]
    end
    
    subgraph "📊 Métricas de Cobertura"
        COV_UNIT["Unit: ≥90%"]
        COV_INT["Integration: ≥85%"]
        COV_E2E["E2E: Flujos críticos"]
    end
    
    subgraph "🛠️ Herramientas"
        JEST["Jest + RTL"]
        PLAYWRIGHT["Playwright"]
        MSW["MSW"]
    end
    
    E2E --> COV_E2E
    INTEGRATION --> COV_INT
    UNIT --> COV_UNIT
    
    COV_E2E --> PLAYWRIGHT
    COV_INT --> JEST
    COV_UNIT --> JEST
```

### Tipos de Testing

#### 1. Unit Testing (70%)
- **Componentes React** (client components)
- **Custom Hooks**
- **Utilidades y helpers**
- **Validadores Zod**
- **Servicios de negocio**

#### 2. Integration Testing (20%)
- **APIs REST** (route handlers)
- **Servicios con Prisma**
- **Autenticación NextAuth**
- **Middleware de autorización**
- **Flujos de datos completos**

#### 3. E2E Testing (10%)
- **Flujos críticos de usuario**
- **Autenticación y autorización**
- **Formularios complejos**
- **Navegación entre páginas**
- **Responsive design**

---

## 🛠️ Stack de Testing

### Herramientas Principales

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@playwright/test": "^1.40.0",
    "msw": "^2.0.11",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.8"
  }
}
```

### Configuración Jest

```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './'
});

const customJestConfig = {
  // Configuración de entornos
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/components/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/hooks/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/lib/utils/**/*.test.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/client.setup.ts']
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/__tests__/api/**/*.test.{js,ts}',
        '<rootDir>/src/__tests__/services/**/*.test.{js,ts}',
        '<rootDir>/src/lib/services/**/*.test.{js,ts}'
      ],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/server.setup.ts']
    }
  ],
  
  // Configuración de cobertura
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/app/**/page.tsx',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx'
  ],
  
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    './src/components/': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    },
    './src/lib/services/': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    }
  },
  
  // Module mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

module.exports = createJestConfig(customJestConfig);
```

---

## 🧪 Unit Testing

### Setup para Client Components

```typescript
// src/__tests__/setup/client.setup.ts
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from '../mocks/server';

// Configurar Testing Library
configure({ testIdAttribute: 'data-testid' });

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN'
      }
    },
    status: 'authenticated'
  }),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form'
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children
}));
```

### Setup para Server Tests

```typescript
// src/__tests__/setup/server.setup.ts
import { jest } from '@jest/globals';

// Mock Prisma
const mockPrisma = {
  entrega: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  itemEntrega: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  eventoTrazabilidad: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  $disconnect: jest.fn()
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}));

// Mock NextAuth
jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn()
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Global test utilities
global.mockPrisma = mockPrisma;
```

### Ejemplo: Testing Component

```typescript
// src/components/entregas/EntregaCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntregaCard } from './EntregaCard';
import type { Entrega } from '@/types/modelos';

// Mock data
const mockEntrega: Entrega = {
  id: 'test-entrega-1',
  numeroEntrega: 'ENT-2025-001',
  fechaEntrega: new Date('2025-01-15'),
  estado: 'PENDIENTE' as EstadoEntregaItem,
  clienteId: 'cliente-1',
  cliente: {
    id: 'cliente-1',
    nombre: 'Cliente Test',
    email: 'cliente@test.com'
  },
  items: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockProps = {
  entrega: mockEntrega,
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onViewDetails: jest.fn()
};

describe('EntregaCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado', () => {
    it('debe renderizar la información básica de la entrega', () => {
      render(<EntregaCard {...mockProps} />);
      
      expect(screen.getByText('ENT-2025-001')).toBeInTheDocument();
      expect(screen.getByText('Cliente Test')).toBeInTheDocument();
      expect(screen.getByText('PENDIENTE')).toBeInTheDocument();
    });

    it('debe mostrar la fecha formateada correctamente', () => {
      render(<EntregaCard {...mockProps} />);
      
      expect(screen.getByText('15/01/2025')).toBeInTheDocument();
    });

    it('debe aplicar el badge correcto según el estado', () => {
      render(<EntregaCard {...mockProps} />);
      
      const badge = screen.getByText('PENDIENTE');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  describe('Interacciones', () => {
    it('debe llamar onViewDetails al hacer click en el card', async () => {
      const user = userEvent.setup();
      render(<EntregaCard {...mockProps} />);
      
      const card = screen.getByRole('article');
      await user.click(card);
      
      expect(mockProps.onViewDetails).toHaveBeenCalledWith(mockEntrega.id);
    });

    it('debe llamar onEdit al hacer click en el botón editar', async () => {
      const user = userEvent.setup();
      render(<EntregaCard {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /editar/i });
      await user.click(editButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(mockEntrega.id);
    });

    it('debe llamar onDelete al confirmar eliminación', async () => {
      const user = userEvent.setup();
      render(<EntregaCard {...mockProps} />);
      
      const deleteButton = screen.getByRole('button', { name: /eliminar/i });
      await user.click(deleteButton);
      
      // Confirmar en el modal
      const confirmButton = screen.getByRole('button', { name: /confirmar/i });
      await user.click(confirmButton);
      
      expect(mockProps.onDelete).toHaveBeenCalledWith(mockEntrega.id);
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener los atributos ARIA correctos', () => {
      render(<EntregaCard {...mockProps} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('ENT-2025-001'));
    });

    it('debe ser navegable por teclado', async () => {
      const user = userEvent.setup();
      render(<EntregaCard {...mockProps} />);
      
      const card = screen.getByRole('article');
      await user.tab();
      expect(card).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockProps.onViewDetails).toHaveBeenCalled();
    });
  });

  describe('Estados de Error', () => {
    it('debe manejar datos faltantes graciosamente', () => {
      const entregaIncompleta = {
        ...mockEntrega,
        cliente: null
      };
      
      render(<EntregaCard {...mockProps} entrega={entregaIncompleta} />);
      
      expect(screen.getByText('Cliente no disponible')).toBeInTheDocument();
    });
  });
});
```

### Ejemplo: Testing Custom Hook

```typescript
// src/hooks/useEntregas.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useEntregas } from './useEntregas';
import * as entregasService from '@/lib/services/entregas';

// Mock del servicio
jest.mock('@/lib/services/entregas');
const mockEntregasService = entregasService as jest.Mocked<typeof entregasService>;

const mockEntregas = [
  {
    id: '1',
    numeroEntrega: 'ENT-001',
    estado: 'PENDIENTE' as EstadoEntregaItem,
    fechaEntrega: new Date(),
    clienteId: 'cliente-1'
  }
];

describe('useEntregas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Carga inicial', () => {
    it('debe cargar entregas exitosamente', async () => {
      mockEntregasService.obtenerEntregas.mockResolvedValue({
        entregas: mockEntregas,
        total: 1,
        pagina: 1,
        totalPaginas: 1
      });

      const { result } = renderHook(() => useEntregas());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.entregas).toEqual(mockEntregas);
      expect(result.current.error).toBeNull();
    });

    it('debe manejar errores de carga', async () => {
      const errorMessage = 'Error al cargar entregas';
      mockEntregasService.obtenerEntregas.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useEntregas());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.entregas).toEqual([]);
    });
  });

  describe('Filtros y búsqueda', () => {
    it('debe aplicar filtros correctamente', async () => {
      mockEntregasService.obtenerEntregas.mockResolvedValue({
        entregas: mockEntregas,
        total: 1,
        pagina: 1,
        totalPaginas: 1
      });

      const { result } = renderHook(() => useEntregas());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Aplicar filtro
      result.current.setFiltros({ estado: 'PENDIENTE' });

      await waitFor(() => {
        expect(mockEntregasService.obtenerEntregas).toHaveBeenCalledWith(
          expect.objectContaining({
            filtros: { estado: 'PENDIENTE' }
          })
        );
      });
    });
  });

  describe('Operaciones CRUD', () => {
    it('debe crear entrega exitosamente', async () => {
      const nuevaEntrega = {
        numeroEntrega: 'ENT-002',
        fechaEntrega: new Date(),
        clienteId: 'cliente-1',
        items: []
      };

      mockEntregasService.crearEntrega.mockResolvedValue({
        id: '2',
        ...nuevaEntrega,
        estado: 'PENDIENTE' as EstadoEntregaItem
      });

      const { result } = renderHook(() => useEntregas());

      await result.current.crearEntrega(nuevaEntrega);

      expect(mockEntregasService.crearEntrega).toHaveBeenCalledWith(nuevaEntrega);
    });
  });
});
```

---

## 🔗 Integration Testing

### Testing API Routes

```typescript
// src/__tests__/api/entregas.test.ts
import { GET, POST } from '@/app/api/entregas/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// Mocks
jest.mock('next-auth');
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/entregas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock session por defecto
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'ADMIN'
      }
    });
  });

  describe('GET /api/entregas', () => {
    it('debe retornar entregas paginadas', async () => {
      // Mock Prisma response
      global.mockPrisma.entrega.findMany.mockResolvedValue([
        {
          id: '1',
          numeroEntrega: 'ENT-001',
          estado: 'PENDIENTE',
          fechaEntrega: new Date(),
          clienteId: 'cliente-1',
          cliente: {
            id: 'cliente-1',
            nombre: 'Cliente Test'
          }
        }
      ]);
      
      global.mockPrisma.entrega.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/entregas?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('entregas');
      expect(data).toHaveProperty('total', 1);
      expect(data).toHaveProperty('pagina', 1);
      expect(data.entregas).toHaveLength(1);
    });

    it('debe aplicar filtros correctamente', async () => {
      global.mockPrisma.entrega.findMany.mockResolvedValue([]);
      global.mockPrisma.entrega.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/entregas?estado=ENTREGADO');
      await GET(request);

      expect(global.mockPrisma.entrega.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'ENTREGADO'
          })
        })
      );
    });

    it('debe rechazar usuarios no autenticados', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/entregas');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('debe manejar errores de base de datos', async () => {
      global.mockPrisma.entrega.findMany.mockRejectedValue(new Error('DB Error'));

      const request = new NextRequest('http://localhost:3000/api/entregas');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/entregas', () => {
    const validEntregaData = {
      numeroEntrega: 'ENT-002',
      fechaEntrega: '2025-01-15T10:00:00Z',
      clienteId: 'cliente-1',
      items: [
        {
          productoId: 'producto-1',
          cantidad: 5,
          precioUnitario: 100
        }
      ]
    };

    it('debe crear entrega exitosamente', async () => {
      const mockCreatedEntrega = {
        id: 'new-entrega-id',
        ...validEntregaData,
        estado: 'PENDIENTE',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      global.mockPrisma.$transaction.mockResolvedValue(mockCreatedEntrega);

      const request = new NextRequest('http://localhost:3000/api/entregas', {
        method: 'POST',
        body: JSON.stringify(validEntregaData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.numeroEntrega).toBe(validEntregaData.numeroEntrega);
    });

    it('debe validar datos de entrada', async () => {
      const invalidData = {
        numeroEntrega: '', // Inválido
        fechaEntrega: 'invalid-date',
        clienteId: ''
      };

      const request = new NextRequest('http://localhost:3000/api/entregas', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('errors');
    });

    it('debe verificar permisos de usuario', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'COLABORADOR' // Sin permisos para crear
        }
      });

      const request = new NextRequest('http://localhost:3000/api/entregas', {
        method: 'POST',
        body: JSON.stringify(validEntregaData)
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });
});
```

### Testing Services

```typescript
// src/__tests__/services/entregas.test.ts
import {
  obtenerEntregas,
  crearEntrega,
  actualizarEstadoEntrega
} from '@/lib/services/entregas';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Mocks ya configurados en setup

describe('Entregas Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerEntregas', () => {
    it('debe retornar entregas con paginación', async () => {
      const mockEntregas = [
        {
          id: '1',
          numeroEntrega: 'ENT-001',
          estado: 'PENDIENTE' as EstadoEntregaItem,
          fechaEntrega: new Date(),
          clienteId: 'cliente-1',
          cliente: { id: 'cliente-1', nombre: 'Cliente Test' },
          items: []
        }
      ];

      (prisma.entrega.findMany as jest.Mock).mockResolvedValue(mockEntregas);
      (prisma.entrega.count as jest.Mock).mockResolvedValue(1);

      const resultado = await obtenerEntregas({
        pagina: 1,
        limite: 10
      });

      expect(resultado).toEqual({
        entregas: mockEntregas,
        total: 1,
        pagina: 1,
        totalPaginas: 1
      });
    });

    it('debe aplicar filtros de búsqueda', async () => {
      (prisma.entrega.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.entrega.count as jest.Mock).mockResolvedValue(0);

      await obtenerEntregas({
        pagina: 1,
        limite: 10,
        filtros: {
          estado: 'PENDIENTE',
          fechaDesde: new Date('2025-01-01'),
          fechaHasta: new Date('2025-01-31')
        }
      });

      expect(prisma.entrega.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            estado: 'PENDIENTE',
            fechaEntrega: {
              gte: expect.any(Date),
              lte: expect.any(Date)
            }
          }
        })
      );
    });

    it('debe manejar errores de base de datos', async () => {
      const errorMessage = 'Database connection failed';
      (prisma.entrega.findMany as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(obtenerEntregas({ pagina: 1, limite: 10 }))
        .rejects
        .toThrow(errorMessage);

      expect(logger.error).toHaveBeenCalledWith(
        'Error al obtener entregas:',
        expect.any(Error)
      );
    });
  });

  describe('crearEntrega', () => {
    const datosEntrega = {
      numeroEntrega: 'ENT-002',
      fechaEntrega: new Date(),
      clienteId: 'cliente-1',
      items: [
        {
          productoId: 'producto-1',
          cantidad: 5,
          precioUnitario: 100
        }
      ]
    };

    it('debe crear entrega con transacción', async () => {
      const mockEntregaCreada = {
        id: 'new-id',
        ...datosEntrega,
        estado: 'PENDIENTE' as EstadoEntregaItem,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(mockEntregaCreada);

      const resultado = await crearEntrega(datosEntrega);

      expect(resultado).toEqual(mockEntregaCreada);
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('debe crear eventos de trazabilidad', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          entrega: {
            create: jest.fn().mockResolvedValue({ id: 'new-id' })
          },
          itemEntrega: {
            createMany: jest.fn()
          },
          eventoTrazabilidad: {
            create: jest.fn()
          }
        };
        return callback(mockTx);
      });

      (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

      await crearEntrega(datosEntrega);

      // Verificar que se llamó la transacción
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('debe rollback en caso de error', async () => {
      const errorMessage = 'Error creating items';
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(crearEntrega(datosEntrega))
        .rejects
        .toThrow(errorMessage);

      expect(logger.error).toHaveBeenCalledWith(
        'Error al crear entrega:',
        expect.any(Error)
      );
    });
  });

  describe('actualizarEstadoEntrega', () => {
    it('debe actualizar estado y crear evento de trazabilidad', async () => {
      const entregaId = 'entrega-1';
      const nuevoEstado = 'EN_TRANSITO' as EstadoEntregaItem;
      const usuarioId = 'user-1';

      const mockEntregaActualizada = {
        id: entregaId,
        estado: nuevoEstado,
        updatedAt: new Date()
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(mockEntregaActualizada);

      const resultado = await actualizarEstadoEntrega(
        entregaId,
        nuevoEstado,
        usuarioId
      );

      expect(resultado).toEqual(mockEntregaActualizada);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('debe validar transiciones de estado', async () => {
      const entregaId = 'entrega-1';
      const estadoInvalido = 'CANCELADO' as EstadoEntregaItem;
      const usuarioId = 'user-1';

      // Mock entrega actual con estado que no permite la transición
      (prisma.entrega.findUnique as jest.Mock).mockResolvedValue({
        id: entregaId,
        estado: 'ENTREGADO' // No se puede cancelar una entrega ya entregada
      });

      await expect(
        actualizarEstadoEntrega(entregaId, estadoInvalido, usuarioId)
      ).rejects.toThrow('Transición de estado no válida');
    });
  });
});
```

---

## 🎭 E2E Testing

### Configuración Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },
    
    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] }
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },
  
  globalSetup: require.resolve('./src/__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./src/__tests__/e2e/global-teardown.ts')
});
```

### Ejemplo E2E Test

```typescript
// src/__tests__/e2e/entregas-flow.test.ts
import { test, expect, Page } from '@playwright/test';

// Page Object Model
class EntregasPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/logistica/entregas');
  }

  async crearNuevaEntrega(datos: {
    numeroEntrega: string;
    cliente: string;
    fechaEntrega: string;
  }) {
    await this.page.click('[data-testid="btn-nueva-entrega"]');
    
    await this.page.fill('[data-testid="input-numero-entrega"]', datos.numeroEntrega);
    await this.page.selectOption('[data-testid="select-cliente"]', datos.cliente);
    await this.page.fill('[data-testid="input-fecha-entrega"]', datos.fechaEntrega);
    
    await this.page.click('[data-testid="btn-guardar-entrega"]');
  }

  async buscarEntrega(numeroEntrega: string) {
    await this.page.fill('[data-testid="input-buscar"]', numeroEntrega);
    await this.page.press('[data-testid="input-buscar"]', 'Enter');
  }

  async actualizarEstado(numeroEntrega: string, nuevoEstado: string) {
    await this.page.click(`[data-testid="entrega-${numeroEntrega}"] [data-testid="btn-cambiar-estado"]`);
    await this.page.selectOption('[data-testid="select-estado"]', nuevoEstado);
    await this.page.click('[data-testid="btn-confirmar-estado"]');
  }

  async exportarPDF(numeroEntrega: string) {
    const downloadPromise = this.page.waitForDownload();
    await this.page.click(`[data-testid="entrega-${numeroEntrega}"] [data-testid="btn-exportar-pdf"]`);
    return downloadPromise;
  }
}

test.describe('Flujo de Entregas', () => {
  let entregasPage: EntregasPage;

  test.beforeEach(async ({ page }) => {
    entregasPage = new EntregasPage(page);
    
    // Login como usuario logística
    await page.goto('/auth/signin');
    await page.fill('[data-testid="input-email"]', 'logistica@gys.com');
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.click('[data-testid="btn-signin"]');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('debe crear una nueva entrega exitosamente', async ({ page }) => {
    await entregasPage.goto();
    
    const datosEntrega = {
      numeroEntrega: `ENT-${Date.now()}`,
      cliente: 'cliente-test-1',
      fechaEntrega: '2025-01-20'
    };

    await entregasPage.crearNuevaEntrega(datosEntrega);

    // Verificar que aparece el toast de éxito
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Entrega creada exitosamente');

    // Verificar que la entrega aparece en la lista
    await expect(page.locator(`[data-testid="entrega-${datosEntrega.numeroEntrega}"]`))
      .toBeVisible();
  });

  test('debe actualizar el estado de una entrega', async ({ page }) => {
    await entregasPage.goto();
    
    // Buscar entrega existente
    await entregasPage.buscarEntrega('ENT-2025-001');
    
    // Actualizar estado
    await entregasPage.actualizarEstado('ENT-2025-001', 'EN_TRANSITO');
    
    // Verificar cambio de estado
    await expect(page.locator('[data-testid="entrega-ENT-2025-001"] [data-testid="badge-estado"]'))
      .toContainText('EN TRÁNSITO');
    
    // Verificar que se creó evento de trazabilidad
    await page.click('[data-testid="entrega-ENT-2025-001"] [data-testid="btn-ver-trazabilidad"]');
    await expect(page.locator('[data-testid="evento-trazabilidad"]').first())
      .toContainText('Estado cambiado a EN TRÁNSITO');
  });

  test('debe exportar PDF de entrega', async ({ page }) => {
    await entregasPage.goto();
    
    const download = await entregasPage.exportarPDF('ENT-2025-001');
    
    expect(download.suggestedFilename()).toMatch(/ENT-2025-001.*\.pdf$/);
  });

  test('debe filtrar entregas por estado', async ({ page }) => {
    await entregasPage.goto();
    
    // Aplicar filtro por estado
    await page.selectOption('[data-testid="filter-estado"]', 'PENDIENTE');
    
    // Verificar que solo se muestran entregas pendientes
    const entregas = page.locator('[data-testid^="entrega-"]');
    const count = await entregas.count();
    
    for (let i = 0; i < count; i++) {
      await expect(entregas.nth(i).locator('[data-testid="badge-estado"]'))
        .toContainText('PENDIENTE');
    }
  });

  test('debe ser responsive en móvil', async ({ page }) => {
    // Cambiar a viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    await entregasPage.goto();
    
    // Verificar que el menú hamburguesa está visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Verificar que las cards se adaptan al ancho móvil
    const entregaCard = page.locator('[data-testid^="entrega-"]').first();
    const boundingBox = await entregaCard.boundingBox();
    expect(boundingBox?.width).toBeLessThan(400);
  });

  test('debe manejar errores de red graciosamente', async ({ page }) => {
    // Simular error de red
    await page.route('**/api/entregas', route => {
      route.abort('failed');
    });
    
    await entregasPage.goto();
    
    // Verificar que se muestra mensaje de error
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Error al cargar entregas');
    
    // Verificar que hay botón de reintentar
    await expect(page.locator('[data-testid="btn-retry"]')).toBeVisible();
  });

  test('debe cumplir estándares de accesibilidad', async ({ page }) => {
    await entregasPage.goto();
    
    // Verificar navegación por teclado
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Verificar contraste de colores (esto requeriría axe-playwright)
    // await injectAxe(page);
    // const results = await checkA11y(page);
    // expect(results.violations).toHaveLength(0);
  });
});

// Performance tests
test.describe('Performance de Entregas', () => {
  test('debe cargar la página en menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/logistica/entregas');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('debe manejar 100 entregas sin degradación', async ({ page }) => {
    // Mock API con 100 entregas
    await page.route('**/api/entregas', route => {
      const entregas = Array.from({ length: 100 }, (_, i) => ({
        id: `entrega-${i}`,
        numeroEntrega: `ENT-${String(i).padStart(3, '0')}`,
        estado: 'PENDIENTE',
        fechaEntrega: new Date().toISOString(),
        cliente: { nombre: `Cliente ${i}` }
      }));
      
      route.fulfill({
        json: {
          entregas,
          total: 100,
          pagina: 1,
          totalPaginas: 10
        }
      });
    });
    
    const startTime = Date.now();
    await page.goto('/logistica/entregas');
    
    // Verificar que se renderizan todas las entregas
    await expect(page.locator('[data-testid^="entrega-"]')).toHaveCount(100);
    
    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(5000);
  });
});
```

---

## 📊 Métricas y Reportes

### Configuración de Cobertura

```javascript
// jest.config.js - Configuración de cobertura
coverageReporters: [
  'text',
  'text-summary',
  'html',
  'lcov',
  'json-summary'
],

coverageThreshold: {
  global: {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90
  },
  // Umbrales específicos por directorio
  './src/components/': {
    statements: 95,
    branches: 90,
    functions: 95,
    lines: 95
  },
  './src/lib/services/': {
    statements: 95,
    branches: 90,
    functions: 95,
    lines: 95
  },
  './src/app/api/': {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90
  }
}
```

### Scripts de Testing

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:client": "jest --selectProjects client",
    "test:server": "jest --selectProjects server",
    "test:coverage": "jest --coverage",
    "test:coverage:client": "jest --selectProjects client --coverage",
    "test:coverage:server": "jest --selectProjects server --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report",
    "test:all": "npm run test:ci && npm run test:e2e",
    "test:smoke": "playwright test --grep smoke",
    "test:performance": "playwright test tests/performance/"
  }
}
```

### Reporte de Cobertura

```bash
# Generar reporte completo
npm run test:coverage

# Ver reporte HTML
open coverage/lcov-report/index.html

# Reporte por proyecto
npm run test:coverage:client
npm run test:coverage:server
```

---

## 🔧 Herramientas de Desarrollo

### VS Code Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-playwright.playwright",
    "orta.vscode-jest",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.test-adapter-converter"
  ]
}
```

### VS Code Settings

```json
// .vscode/settings.json
{
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true,
  "playwright.reuseBrowser": true,
  "playwright.showTrace": true,
  "testing.automaticallyOpenPeekView": "never",
  "testing.followRunningTest": false
}
```

### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache", "--no-coverage"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "NODE_ENV": "test"
      }
    },
    {
      "name": "Debug Playwright Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/playwright",
      "args": ["test", "--debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 📚 Mejores Prácticas

### Naming Conventions

```typescript
// ✅ Buenos nombres de tests
describe('EntregaCard Component', () => {
  describe('Renderizado', () => {
    it('debe mostrar información básica de la entrega', () => {});
    it('debe aplicar el badge correcto según el estado', () => {});
  });
  
  describe('Interacciones', () => {
    it('debe llamar onEdit al hacer click en editar', () => {});
    it('debe confirmar antes de eliminar', () => {});
  });
  
  describe('Estados de Error', () => {
    it('debe manejar datos faltantes graciosamente', () => {});
  });
});

// ❌ Malos nombres
describe('Test', () => {
  it('works', () => {});
  it('test 1', () => {});
});
```

### Test Data Management

```typescript
// ✅ Factory functions para datos de test
export const createMockEntrega = (overrides = {}) => ({
  id: 'test-entrega-1',
  numeroEntrega: 'ENT-2025-001',
  estado: 'PENDIENTE' as EstadoEntregaItem,
  fechaEntrega: new Date('2025-01-15'),
  clienteId: 'cliente-1',
  cliente: {
    id: 'cliente-1',
    nombre: 'Cliente Test',
    email: 'cliente@test.com'
  },
  items: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// ✅ Builders para casos complejos
class EntregaBuilder {
  private entrega = createMockEntrega();
  
  withEstado(estado: EstadoEntregaItem) {
    this.entrega.estado = estado;
    return this;
  }
  
  withItems(count: number) {
    this.entrega.items = Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      productoId: `producto-${i}`,
      cantidad: 1,
      precioUnitario: 100
    }));
    return this;
  }
  
  build() {
    return this.entrega;
  }
}

// Uso
const entregaPendiente = new EntregaBuilder()
  .withEstado('PENDIENTE')
  .withItems(3)
  .build();
```

### Async Testing

```typescript
// ✅ Manejo correcto de async/await
it('debe cargar entregas al montar el componente', async () => {
  const mockEntregas = [createMockEntrega()];
  mockEntregasService.obtenerEntregas.mockResolvedValue({
    entregas: mockEntregas,
    total: 1,
    pagina: 1,
    totalPaginas: 1
  });
  
  render(<EntregasList />);
  
  // Esperar a que aparezca el contenido
  await waitFor(() => {
    expect(screen.getByText('ENT-2025-001')).toBeInTheDocument();
  });
  
  expect(mockEntregasService.obtenerEntregas).toHaveBeenCalledTimes(1);
});

// ❌ No usar act() manualmente (React Testing Library lo maneja)
it('ejemplo incorrecto', async () => {
  await act(async () => {
    render(<Component />);
  });
});
```

### Error Testing

```typescript
// ✅ Testing de casos de error
it('debe mostrar mensaje de error cuando falla la carga', async () => {
  const errorMessage = 'Error de red';
  mockEntregasService.obtenerEntregas.mockRejectedValue(new Error(errorMessage));
  
  render(<EntregasList />);
  
  await waitFor(() => {
    expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
  });
  
  expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
});

// ✅ Testing de validación
it('debe mostrar errores de validación', async () => {
  const user = userEvent.setup();
  render(<EntregaForm />);
  
  // Enviar formulario vacío
  await user.click(screen.getByRole('button', { name: /guardar/i }));
  
  expect(screen.getByText('Número de entrega es requerido')).toBeInTheDocument();
  expect(screen.getByText('Cliente es requerido')).toBeInTheDocument();
});
```

---

## 🚀 CI/CD Integration

### GitHub Actions para Testing

```yaml
# .github/workflows/test.yml
name: 🧪 Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: 🔬 Unit & Integration Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: gys_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npm run db:push
          npm run db:seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/gys_test
      
      - name: Run unit tests
        run: npm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/gys_test
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true
  
  e2e-tests:
    name: 🎭 E2E Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Build application
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000
      
      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 📈 Monitoreo de Calidad

### SonarQube Configuration

```properties
# sonar-project.properties
sonar.projectKey=gys-sistema
sonar.organization=empresa
sonar.sources=src
sonar.tests=src/__tests__
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.test.tsx,**/*.stories.tsx
sonar.cpd.exclusions=**/*.test.ts,**/*.test.tsx
sonar.qualitygate.wait=true
```

### Métricas de Calidad

```bash
# Generar reporte de métricas
npm run test:coverage -- --json --outputFile=coverage/coverage-summary.json

# Análisis de complejidad ciclomática
npx complexity-report src/ --format json --output complexity-report.json

# Análisis de duplicación de código
npx jscpd src/ --reporters json --output ./reports/
```

---

## 🔍 Debugging Tests

### Debug en VS Code

```json
// .vscode/launch.json - Debug específico
{
  "name": "Debug Current Jest Test",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "--no-coverage",
    "${relativeFile}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Playwright

```bash
# Debug modo interactivo
npx playwright test --debug

# Debug test específico
npx playwright test entregas-flow.test.ts --debug

# Ver trace de ejecución
npx playwright show-trace trace.zip

# Modo headed (ver navegador)
npx playwright test --headed
```

---

## 📊 Reportes y Dashboards

### Test Results Dashboard

```typescript
// scripts/generate-test-report.ts
import fs from 'fs';
import path from 'path';

interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  performance: {
    averageTestTime: number;
    slowestTests: Array<{ name: string; duration: number }>;
  };
}

function generateTestReport(): TestMetrics {
  // Leer resultados de Jest
  const jestResults = JSON.parse(
    fs.readFileSync('coverage/coverage-summary.json', 'utf8')
  );
  
  // Leer resultados de Playwright
  const playwrightResults = JSON.parse(
    fs.readFileSync('test-results/results.json', 'utf8')
  );
  
  const metrics: TestMetrics = {
    totalTests: jestResults.numTotalTests + playwrightResults.stats.total,
    passedTests: jestResults.numPassedTests + playwrightResults.stats.passed,
    failedTests: jestResults.numFailedTests + playwrightResults.stats.failed,
    coverage: {
      statements: jestResults.total.statements.pct,
      branches: jestResults.total.branches.pct,
      functions: jestResults.total.functions.pct,
      lines: jestResults.total.lines.pct
    },
    performance: {
      averageTestTime: calculateAverageTestTime(playwrightResults),
      slowestTests: findSlowestTests(playwrightResults)
    }
  };
  
  // Generar HTML report
  generateHTMLReport(metrics);
  
  return metrics;
}

function generateHTMLReport(metrics: TestMetrics) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>GYS Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
      </style>
    </head>
    <body>
      <h1>🧪 GYS Test Report</h1>
      <div class="metric">
        <h3>📊 Test Summary</h3>
        <p>Total Tests: <strong>${metrics.totalTests}</strong></p>
        <p class="success">Passed: <strong>${metrics.passedTests}</strong></p>
        <p class="danger">Failed: <strong>${metrics.failedTests}</strong></p>
        <p>Success Rate: <strong>${((metrics.passedTests / metrics.totalTests) * 100).toFixed(2)}%</strong></p>
      </div>
      
      <div class="metric">
        <h3>📈 Coverage</h3>
        <p>Statements: <strong>${metrics.coverage.statements}%</strong></p>
        <p>Branches: <strong>${metrics.coverage.branches}%</strong></p>
        <p>Functions: <strong>${metrics.coverage.functions}%</strong></p>
        <p>Lines: <strong>${metrics.coverage.lines}%</strong></p>
      </div>
      
      <div class="metric">
        <h3>⚡ Performance</h3>
        <p>Average Test Time: <strong>${metrics.performance.averageTestTime}ms</strong></p>
        <h4>Slowest Tests:</h4>
        <ul>
          ${metrics.performance.slowestTests.map(test => 
            `<li>${test.name}: ${test.duration}ms</li>`
          ).join('')}
        </ul>
      </div>
    </body>
    </html>
  `;
  
  fs.writeFileSync('test-results/report.html', html);
}
```

---

## 🎯 Testing Checklist

### Pre-commit Checklist
- [ ] ✅ Todos los tests unitarios pasan
- [ ] ✅ Cobertura de código ≥90%
- [ ] ✅ Tests de integración pasan
- [ ] ✅ Linting sin errores
- [ ] ✅ Type checking exitoso
- [ ] ✅ No hay tests skipped o disabled

### Pre-deployment Checklist
- [ ] ✅ Todos los tests E2E pasan
- [ ] ✅ Tests de performance dentro de SLA
- [ ] ✅ Tests de accesibilidad pasan
- [ ] ✅ Tests en múltiples navegadores
- [ ] ✅ Tests responsive en móvil/tablet
- [ ] ✅ Smoke tests en staging

### Post-deployment Checklist
- [ ] ✅ Smoke tests en producción
- [ ] ✅ Monitoreo de errores activo
- [ ] ✅ Métricas de performance normales
- [ ] ✅ Tests de regresión programados

---

## 🚨 Troubleshooting

### Problemas Comunes

#### Tests Flaky
```typescript
// ❌ Test flaky por timing
it('debe actualizar después de 1 segundo', async () => {
  render(<Component />);
  
  setTimeout(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  }, 1000);
});

// ✅ Test estable con waitFor
it('debe actualizar después de 1 segundo', async () => {
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  }, { timeout: 2000 });
});
```

#### Memory Leaks
```typescript
// ✅ Cleanup en tests
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ✅ Mock cleanup
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
```

#### Playwright Issues
```bash
# Limpiar cache de navegadores
npx playwright install --force

# Verificar instalación
npx playwright doctor

# Debug con logs detallados
DEBUG=pw:api npx playwright test
```

---

## 📚 Recursos y Referencias

### Documentación Oficial
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)

### Guías y Best Practices
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [React Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [E2E Testing Guide](https://playwright.dev/docs/best-practices)

### Tools y Utilities
- [Testing Playground](https://testing-playground.com/)
- [Playwright Trace Viewer](https://trace.playwright.dev/)
- [Jest Coverage Viewer](https://github.com/facebook/jest/tree/main/packages/jest-coverage-viewer)

---

**Documento generado por TRAE - Agente Senior Fullstack**  
**Última actualización:** Enero 2025  
**Versión:** 1.0.0