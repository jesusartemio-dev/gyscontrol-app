/**
 * 🔧 Mocks de Servicios y APIs
 * 
 * Implementaciones mock para servicios, APIs y funciones externas
 * utilizadas en el sistema GYS durante testing.
 * 
 * @author TRAE - Agente Senior Fullstack
 * @version 1.0.0
 */

import { vi } from 'vitest'
import { 
  mockApiResponses,
  mockHelpers
} from './fixtures'

// ✅ Mocks de aprovisionamiento eliminados
// mockOrdenesCompra, mockRecepciones, mockPagos removidos

// 🌐 Mock de fetch global
export const mockFetch = vi.fn()
global.fetch = mockFetch

// 📡 Servicios mock de aprovisionamiento eliminados
// mockOrdenCompraService removido

// mockRecepcionService removido

// mockPagoService removido

// 🔐 Mock de NextAuth
export const mockNextAuth = {
  getServerSession: vi.fn().mockResolvedValue({
    user: {
      id: 'user-admin-mock',
      email: 'admin@gys.com',
      name: 'Admin Usuario',
      role: 'ADMIN'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }),
  
  signIn: vi.fn().mockResolvedValue({ ok: true, url: '/dashboard' }),
  signOut: vi.fn().mockResolvedValue({ ok: true, url: '/auth/login' }),
  
  useSession: vi.fn().mockReturnValue({
    data: {
      user: {
        id: 'user-admin-mock',
        email: 'admin@gys.com',
        name: 'Admin Usuario',
        role: 'ADMIN'
      }
    },
    status: 'authenticated',
    update: vi.fn()
  })
}

// 🗄️ Mock de Prisma
export const mockPrisma = {
  // ordenCompra, recepcion, pago removidos
  
  // 🔄 Transacciones
  $transaction: vi.fn().mockImplementation((callback) => {
    return callback(mockPrisma)
  })
}

// 📁 Mock de sistema de archivos
export const mockFileSystem = {
  // 📤 Upload de archivos
  uploadFile: vi.fn().mockResolvedValue({
    success: true,
    filename: 'test-file.pdf',
    url: '/uploads/test-file.pdf',
    size: 1024000
  }),
  
  // 🗑️ Eliminar archivos
  deleteFile: vi.fn().mockResolvedValue({ success: true }),
  
  // 📋 Validar archivos
  validateFile: vi.fn().mockImplementation((file) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no válido' }
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: 'Archivo muy grande' }
    }
    
    return { valid: true }
  })
}

// 🌐 Mock de APIs externas
export const mockExternalAPIs = {
  // 💱 Tipo de cambio
  exchangeRate: {
    getRate: vi.fn().mockResolvedValue({
      success: true,
      data: { USD: 3.75, EUR: 4.10 }
    })
  },
  
  // 📧 Servicio de email
  emailService: {
    sendEmail: vi.fn().mockResolvedValue({
      success: true,
      messageId: 'email-mock-001'
    })
  },
  
  // 📱 Notificaciones
  notificationService: {
    send: vi.fn().mockResolvedValue({
      success: true,
      notificationId: 'notif-mock-001'
    })
  }
}

// 🧪 Utilidades para testing
export const mockUtils = {
  /**
   * 🔄 Resetear todos los mocks
   */
  resetAllMocks: () => {
    vi.clearAllMocks()
    
    // Reset servicios
    // ✅ Referencias de aprovisionamiento eliminadas
    
    // Reset Prisma
    Object.values(mockPrisma).forEach(model => {
      if (typeof model === 'object') {
        Object.values(model).forEach(method => {
          if (vi.isMockFunction(method)) method.mockClear()
        })
      }
    })
  },
  
  /**
   * ❌ Simular errores
   */
  simulateError: (service: any, method: string, error: any) => {
    if (service[method] && vi.isMockFunction(service[method])) {
      service[method].mockRejectedValueOnce(error)
    }
  },
  
  /**
   * ⏱️ Simular latencia
   */
  simulateLatency: (service: any, method: string, delay = 1000) => {
    if (service[method] && vi.isMockFunction(service[method])) {
      const originalImpl = service[method].getMockImplementation()
      service[method].mockImplementationOnce(async (...args: any[]) => {
        await new Promise(resolve => setTimeout(resolve, delay))
        return originalImpl ? originalImpl(...args) : mockApiResponses.success.create
      })
    }
  },
  
  /**
   * 🔐 Simular diferentes roles de usuario
   */
  mockUserRole: (role: string) => {
    mockNextAuth.useSession.mockReturnValue({
      data: {
        user: {
          id: `user-${role.toLowerCase()}-mock`,
          email: `${role.toLowerCase()}@gys.com`,
          name: `${role} Usuario`,
          role: role.toUpperCase()
        }
      },
      status: 'authenticated',
      update: vi.fn()
    })
  },
  
  /**
   * 📊 Crear respuesta paginada mock
   */
  createPaginatedMock: <T>(data: T[], page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = data.slice(startIndex, endIndex)
    
    return {
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages: Math.ceil(data.length / limit)
      }
    }
  }
}

// 🎯 Configuración de mocks por defecto
export const setupDefaultMocks = () => {
  // 🌐 Mock fetch global
  mockFetch.mockImplementation((url: string, options?: any) => {
    const method = options?.method || 'GET'
    const isApiCall = url.includes('/api/')
    
    if (!isApiCall) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }
    
    // ✅ API responses for provisioning endpoints removed
    
    // Respuesta por defecto
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockApiResponses.success.list)
    })
  })
}

export default {
  // ✅ Mock services de aprovisionamiento eliminados
  mockNextAuth,
  mockPrisma,
  mockFileSystem,
  mockExternalAPIs,
  mockUtils,
  setupDefaultMocks
}