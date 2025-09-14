// ===================================================
// 📁 Archivo: jest.setup.services.js
// 📌 Descripción: Setup específico para tests de servicios (sin DOM)
// 📌 Características: Configuración mínima para entorno Node
// ✍️ Autor: Sistema de IA
// 📅 Actualizado: 2025-01-27
// ===================================================

// Mock NextAuth para servicios
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN'
      }
    },
    status: 'authenticated'
  }))
}))

// Mock Prisma
jest.mock('./src/lib/prisma', () => ({
  __esModule: true,
  default: {
    proyecto: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    listaEquipo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    pedidoEquipo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}))

// Environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.DATABASE_URL = 'test-database-url'