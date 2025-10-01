/**
 * 🧪 Mock de Prisma para Testing
 * 
 * Mock completo del cliente Prisma para pruebas unitarias
 * Incluye todos los modelos principales del sistema GYS
 */

import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// ✅ Crear mock profundo de PrismaClient
export const prismaMock = mockDeep<PrismaClient>()

// ✅ Reset mock antes de cada test
beforeEach(() => {
  mockReset(prismaMock)
})

// ✅ Exportar tipo para TypeScript
export type MockPrisma = DeepMockProxy<PrismaClient>

// ✅ Mock por defecto para casos comunes
export const defaultMocks = {
  // Cotizacion mocks
  cotizacion: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  
  // Plantilla mocks
  plantilla: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  
  // Cliente mocks
  cliente: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  
  // User mocks
  user: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}

// ✅ Helper para configurar mocks rápidamente
export const setupMockData = {
  // Mock data para cotizaciones
  cotizacion: {
    basic: {
      id: 'cot-123',
      codigo: 'GYS-1-24',
      numeroSecuencia: 1,
      clienteId: 'cli-123',
      userId: 'usr-123',
      plantillaId: 'plt-123',
      estado: 'BORRADOR' as const,
      fechaCreacion: new Date('2024-01-01'),
      fechaActualizacion: new Date('2024-01-01'),
      fechaVencimiento: new Date('2024-02-01'),
      moneda: 'PEN' as const,
      tipoCambio: 1.0,
      subtotal: 1000,
      igv: 180,
      total: 1180,
      observaciones: 'Test cotización'
    }
  },
  
  // Mock data para plantillas
  plantilla: {
    basic: {
      id: 'plt-123',
      nombre: 'Plantilla Test',
      descripcion: 'Plantilla de prueba',
      activo: true,
      fechaCreacion: new Date('2024-01-01'),
      fechaActualizacion: new Date('2024-01-01')
    }
  },
  
  // Mock data para clientes
  cliente: {
    basic: {
      id: 'cli-123',
      nombre: 'Cliente Test',
      email: 'test@cliente.com',
      telefono: '123456789',
      direccion: 'Dirección Test',
      activo: true,
      fechaCreacion: new Date('2024-01-01'),
      fechaActualizacion: new Date('2024-01-01')
    }
  },
  
  // Mock data para usuarios
  user: {
    basic: {
      id: 'usr-123',
      name: 'Usuario Test',
      email: 'test@usuario.com',
      role: 'COMERCIAL' as const,
      activo: true,
      fechaCreacion: new Date('2024-01-01'),
      fechaActualizacion: new Date('2024-01-01')
    }
  }
}

// ✅ Helper para resetear mocks específicos
export const resetMocks = {
  all: () => mockReset(prismaMock),
  cotizacion: () => mockReset(prismaMock.cotizacion),
  plantilla: () => mockReset(prismaMock.plantilla),
  cliente: () => mockReset(prismaMock.cliente),
  user: () => mockReset(prismaMock.user)
}

// ✅ Helper para configurar respuestas comunes
export const mockResponses = {
  // Respuestas exitosas
  success: {
    create: (data: any) => Promise.resolve({ id: 'generated-id', ...data }),
    update: (data: any) => Promise.resolve(data),
    delete: () => Promise.resolve({ id: 'deleted-id' }),
    findUnique: (data: any) => Promise.resolve(data),
    findMany: (data: any[]) => Promise.resolve(data),
    count: (count: number) => Promise.resolve(count)
  },
  
  // Respuestas de error
  error: {
    notFound: () => Promise.resolve(null),
    dbError: (message = 'Database error') => Promise.reject(new Error(message)),
    validationError: (message = 'Validation error') => Promise.reject(new Error(message))
  }
}
